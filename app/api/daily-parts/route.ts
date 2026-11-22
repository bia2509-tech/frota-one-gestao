import { and, desc, eq, gt, gte, lte, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { dailyPartEntries, equipment, maintenanceOrders } from "@/db/schema";
import { apiError, requirePermission } from "@/lib/tenant";

const roundReading = (value: number | null | undefined) => value == null ? null : Math.round((Number(value) + Number.EPSILON) * 100) / 100;

export async function GET(request: Request) {
  try {
    const url = new URL(request.url),
      companyId = url.searchParams.get("companyId") || "",
      date = url.searchParams.get("date") || "",
      from = url.searchParams.get("from") || "",
      to = url.searchParams.get("to") || "",
      equipmentId = url.searchParams.get("equipmentId") || "";
    await requirePermission(companyId, "daily_parts", "view");
    const rows = await getDb()
      .select({
        id: dailyPartEntries.id,
        equipmentId: dailyPartEntries.equipmentId,
        fleetNumber: equipment.fleetNumber,
        plate: equipment.plate,
        description: equipment.description,
        entryDate: dailyPartEntries.entryDate,
        status: dailyPartEntries.status,
        maintenanceOrderId: dailyPartEntries.maintenanceOrderId,
        maintenanceOrderNumber: maintenanceOrders.orderNumber,
        hourmeterStart: dailyPartEntries.hourmeterStart,
        hourmeterEnd: dailyPartEntries.hourmeterEnd,
        kilometerStart: dailyPartEntries.kilometerStart,
        kilometerEnd: dailyPartEntries.kilometerEnd,
        observation: dailyPartEntries.observation,
      })
      .from(dailyPartEntries)
      .innerJoin(equipment, eq(dailyPartEntries.equipmentId, equipment.id))
      .leftJoin(maintenanceOrders, eq(dailyPartEntries.maintenanceOrderId, maintenanceOrders.id))
      .where(and(
        eq(dailyPartEntries.companyId, companyId),
        ...(date ? [eq(dailyPartEntries.entryDate, date)] : []),
        ...(from ? [gte(dailyPartEntries.entryDate, from)] : []),
        ...(to ? [lte(dailyPartEntries.entryDate, to)] : []),
        ...(equipmentId ? [eq(dailyPartEntries.equipmentId, equipmentId)] : []),
      ))
      .orderBy(desc(dailyPartEntries.entryDate), equipment.fleetNumber);
    return Response.json({ entries: rows });
  } catch (error) {
    return apiError(error);
  }
}

export async function PATCH(request: Request) {
  try {
    const body = (await request.json()) as {
      id?: string;
      companyId?: string;
      entryDate?: string;
      status?: "T" | "D" | "M" | "AB";
      maintenanceOrderId?: string | null;
      maintenanceOrderNumber?: string | null;
      hourmeterStart?: number | null;
      hourmeterEnd?: number | null;
      kilometerStart?: number | null;
      kilometerEnd?: number | null;
      observation?: string;
    };
    const companyId = body.companyId || "";
    const hourmeterStart = roundReading(body.hourmeterStart), hourmeterEnd = roundReading(body.hourmeterEnd);
    const kilometerStart = roundReading(body.kilometerStart), kilometerEnd = roundReading(body.kilometerEnd);
    const id = body.id || "";
    const access = await requirePermission(companyId, "daily_parts", "update");
    if (!id || !body.entryDate || !body.status)
      return Response.json({ error: "Informe o lançamento, a data e a situação." }, { status: 400 });
    const [current] = await getDb().select({ id: dailyPartEntries.id, equipmentId: dailyPartEntries.equipmentId }).from(dailyPartEntries).where(and(
      eq(dailyPartEntries.id, id),
      eq(dailyPartEntries.companyId, companyId),
    )).limit(1);
    if (!current) return Response.json({ error: "Parte diária não encontrada." }, { status: 404 });
    const [duplicate] = await getDb().select({ id: dailyPartEntries.id }).from(dailyPartEntries).where(and(
      eq(dailyPartEntries.companyId, companyId),
      eq(dailyPartEntries.equipmentId, current.equipmentId),
      eq(dailyPartEntries.entryDate, body.entryDate),
      ne(dailyPartEntries.id, id),
    )).limit(1);
    if (duplicate)
      return Response.json({ error: "Não foi possível alterar: já existe uma parte diária para este equipamento nesta data." }, { status: 409 });
    if (hourmeterStart != null && hourmeterEnd != null && hourmeterEnd < hourmeterStart)
      return Response.json({ error: "O horímetro final não pode ser menor que o horímetro inicial." }, { status: 400 });
    if (kilometerStart != null && kilometerEnd != null && kilometerEnd < kilometerStart)
      return Response.json({ error: "O KM final não pode ser menor que o KM inicial." }, { status: 400 });

    let maintenanceOrderId = body.maintenanceOrderId || null;
    const maintenanceOrderNumber = body.maintenanceOrderNumber?.trim() || "";
    if (body.status === "M" && !maintenanceOrderId && maintenanceOrderNumber) {
      const [matchedOrder] = await getDb().select().from(maintenanceOrders).where(and(
        eq(maintenanceOrders.companyId, companyId),
        eq(maintenanceOrders.orderNumber, maintenanceOrderNumber),
      )).limit(1);
      if (matchedOrder && matchedOrder.equipmentId !== current.equipmentId)
        return Response.json({ error: `A O.S. ${maintenanceOrderNumber} já está vinculada a outro equipamento.` }, { status: 409 });
      maintenanceOrderId = matchedOrder?.id || null;
      if (!maintenanceOrderId) {
        maintenanceOrderId = crypto.randomUUID();
        await getDb().insert(maintenanceOrders).values({
          id: maintenanceOrderId,
          companyId,
          equipmentId: current.equipmentId,
          orderNumber: maintenanceOrderNumber,
          orderKind: "daily_maintenance",
          maintenanceType: "O.S. operacional avulsa",
          maintenanceStatus: "Referência operacional — aguardando ficha",
          maintenanceFormType: "maintenance",
          description: body.observation?.trim() || `O.S. avulsa ${maintenanceOrderNumber} informada na Parte Diária.`,
          startedAt: body.entryDate,
          status: "open",
          requestedBy: access.user.userId,
          preparedBy: access.user.userId,
          notifyLessor: false,
        });
      }
    }
    if (body.status === "M" && !maintenanceOrderId)
      return Response.json({ error: "Informe o número da O.S. cadastrada ou da O.S. avulsa." }, { status: 400 });
    if (body.status !== "M") maintenanceOrderId = null;

    const observation = body.observation?.trim() || null;
    await getDb().run(sql`UPDATE daily_part_entries SET
      entry_date = ${body.entryDate}, status = ${body.status}, maintenance_order_id = ${maintenanceOrderId},
      hourmeter_start = ${hourmeterStart}, hourmeter_end = ${hourmeterEnd},
      kilometer_start = ${kilometerStart}, kilometer_end = ${kilometerEnd},
      observation = ${observation}
      WHERE id = ${id} AND company_id = ${companyId}`);

    const [laterEntry] = await getDb().select({ id: dailyPartEntries.id }).from(dailyPartEntries).where(and(
      eq(dailyPartEntries.companyId, companyId),
      eq(dailyPartEntries.equipmentId, current.equipmentId),
      gt(dailyPartEntries.entryDate, body.entryDate),
    )).limit(1);
    const latestReadings: { currentKilometer?: number; currentHourmeter?: number } = {};
    if (kilometerEnd != null) latestReadings.currentKilometer = kilometerEnd;
    if (hourmeterEnd != null) latestReadings.currentHourmeter = hourmeterEnd;
    if (!laterEntry && Object.keys(latestReadings).length)
      await getDb().update(equipment).set(latestReadings).where(and(eq(equipment.id, current.equipmentId), eq(equipment.companyId, companyId)));
    return Response.json({ updated: true, id });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      companyId?: string;
      equipmentId?: string;
      fleetNumber?: string;
      plate?: string;
      entryDate?: string;
      status?: "T" | "D" | "M" | "AB";
      maintenanceOrderId?: string | null;
      maintenanceOrderNumber?: string | null;
      hourmeterStart?: number | null;
      hourmeterEnd?: number | null;
      kilometerStart?: number | null;
      kilometerEnd?: number | null;
      observation?: string;
      source?: "manual" | "spreadsheet";
    };
    const companyId = body.companyId || "";
    const hourmeterStart = roundReading(body.hourmeterStart), hourmeterEnd = roundReading(body.hourmeterEnd);
    const kilometerStart = roundReading(body.kilometerStart), kilometerEnd = roundReading(body.kilometerEnd);
    const access = await requirePermission(companyId, "daily_parts", "create");
    let equipmentId = body.equipmentId || "";
    if (equipmentId) {
      const [registered] = await getDb().select({ id: equipment.id }).from(equipment).where(and(eq(equipment.id, equipmentId), eq(equipment.companyId, companyId))).limit(1);
      if (!registered) equipmentId = "";
    }
    if (!equipmentId && (body.fleetNumber?.trim() || body.plate?.trim())) {
      const fleetNumber = body.fleetNumber?.trim() || "";
      const normalizedPlate = body.plate?.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || "";
      const candidates = await getDb().select().from(equipment).where(eq(equipment.companyId, companyId));
      const matched = candidates.find((item) =>
        (fleetNumber && item.fleetNumber.trim().toUpperCase() === fleetNumber.toUpperCase()) ||
        (normalizedPlate && (item.plate || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase() === normalizedPlate),
      );
      equipmentId = matched?.id || "";
    }
    if (!equipmentId || !body.entryDate || !body.status)
      return Response.json(
        { error: "Equipamento não encontrado. Informe um número de frota ou placa cadastrada." },
        { status: 400 },
      );
    const [existing] = await getDb().select({ id: dailyPartEntries.id }).from(dailyPartEntries).where(and(
      eq(dailyPartEntries.companyId, companyId),
      eq(dailyPartEntries.equipmentId, equipmentId),
      eq(dailyPartEntries.entryDate, body.entryDate),
    )).limit(1);
    if (existing)
      return Response.json(
        { error: "Lançamento duplicado: já existe uma parte diária para este equipamento nesta data." },
        { status: 409 },
      );
    if (hourmeterStart != null && hourmeterEnd != null && hourmeterEnd < hourmeterStart)
      return Response.json({ error: "O horímetro final não pode ser menor que o horímetro inicial." }, { status: 400 });
    if (kilometerStart != null && kilometerEnd != null && kilometerEnd < kilometerStart)
      return Response.json({ error: "O KM final não pode ser menor que o KM inicial." }, { status: 400 });
    let maintenanceOrderId = body.maintenanceOrderId || null;
    const maintenanceOrderNumber = body.maintenanceOrderNumber?.trim() || "";
    if (!maintenanceOrderId && maintenanceOrderNumber) {
      const [matchedOrder] = await getDb().select().from(maintenanceOrders).where(and(
        eq(maintenanceOrders.companyId, companyId),
        eq(maintenanceOrders.orderNumber, maintenanceOrderNumber),
      )).limit(1);
      if (matchedOrder && matchedOrder.equipmentId !== equipmentId)
        return Response.json(
          { error: `A O.S. ${maintenanceOrderNumber} já está vinculada a outro equipamento.` },
          { status: 409 },
        );
      maintenanceOrderId = matchedOrder?.id || null;
      if (!maintenanceOrderId && body.status === "M") {
        maintenanceOrderId = crypto.randomUUID();
        await getDb().insert(maintenanceOrders).values({
          id: maintenanceOrderId,
          companyId,
          equipmentId,
          orderNumber: maintenanceOrderNumber,
          orderKind: "daily_maintenance",
          maintenanceType: "O.S. operacional avulsa",
          maintenanceStatus: "Referência operacional — aguardando ficha",
          maintenanceFormType: "maintenance",
          description: body.observation?.trim() || `O.S. avulsa ${maintenanceOrderNumber} informada na Parte Diária.`,
          startedAt: body.entryDate,
          status: "open",
          requestedBy: access.user.userId,
          preparedBy: access.user.userId,
          notifyLessor: false,
        });
      }
    }
    if (body.status === "M" && !maintenanceOrderId && body.source !== "spreadsheet")
      return Response.json(
        { error: "Informe o número da O.S. cadastrada ou da O.S. avulsa." },
        { status: 400 },
      );
    if (maintenanceOrderId) {
      const [order] = await getDb()
        .select()
        .from(maintenanceOrders)
        .where(
          and(
            eq(maintenanceOrders.id, maintenanceOrderId),
            eq(maintenanceOrders.companyId, companyId),
            eq(maintenanceOrders.equipmentId, equipmentId),
          ),
        )
        .limit(1);
      if (!order)
        return Response.json(
          {
            error:
              "A ordem de serviço não pertence ao equipamento selecionado.",
          },
          { status: 400 },
        );
    }
    const row = {
      id: crypto.randomUUID(),
      companyId,
      equipmentId,
      entryDate: body.entryDate,
      status: body.status,
      maintenanceOrderId:
        body.status === "M" ? maintenanceOrderId : null,
      hourmeterStart,
      hourmeterEnd,
      kilometerStart,
      kilometerEnd,
      observation: body.observation?.trim() || null,
      createdBy: access.user.userId,
      createdAt: new Date().toISOString(),
    };
    await getDb().run(sql`INSERT INTO daily_part_entries
      (id, company_id, equipment_id, entry_date, status, maintenance_order_id,
       hourmeter_start, hourmeter_end, kilometer_start, kilometer_end,
       observation, created_by, created_at)
      VALUES (${row.id}, ${row.companyId}, ${row.equipmentId}, ${row.entryDate}, ${row.status},
       ${row.maintenanceOrderId}, ${row.hourmeterStart}, ${row.hourmeterEnd},
       ${row.kilometerStart}, ${row.kilometerEnd}, ${row.observation},
       ${row.createdBy}, ${row.createdAt})`);
    const latestReadings: { currentKilometer?: number; currentHourmeter?: number } = {};
    if (row.kilometerEnd != null) latestReadings.currentKilometer = row.kilometerEnd;
    if (row.hourmeterEnd != null) latestReadings.currentHourmeter = row.hourmeterEnd;
    const [laterEntry] = await getDb().select({ id: dailyPartEntries.id }).from(dailyPartEntries).where(and(
      eq(dailyPartEntries.companyId, companyId),
      eq(dailyPartEntries.equipmentId, equipmentId),
      gt(dailyPartEntries.entryDate, body.entryDate),
    )).limit(1);
    if (!laterEntry && Object.keys(latestReadings).length)
      await getDb().update(equipment).set(latestReadings).where(and(eq(equipment.id, equipmentId), eq(equipment.companyId, companyId)));
    return Response.json({ entry: row, updated: false }, { status: 201 });
  } catch (error) {
    return apiError(error);
  }
}
