import { and, asc, eq, inArray, ne, or, sql } from "drizzle-orm";
import { getDb } from "@/db";
import { auditLog, companies, companyUsers, equipment, fiscalInvoiceItems, fiscalInvoicePayments, fiscalInvoices, fuelEntries, masterData, products } from "@/db/schema";
import { apiError, requireApiUser } from "@/lib/tenant";
import sepcoProfessionals from "@/app/data/sepco-professionals.json";
import excludedSepcoProfessionals from "@/app/data/sepco-professionals-excluded.json";
import sepcoEquipmentMaster from "@/app/data/sepco-equipment-master.json";
import sepcoProductCatalog from "@/app/data/sepco-product-catalog.json";
import sepcoVmeImport from "@/app/data/sepco-vme-import.json";
import { loadSepcoEquipment } from "@/app/data/sepco-equipment";

export async function GET() {
  try {
    const user = await requireApiUser();
    const db = getDb();
    const isLocalAccount = user.userId.startsWith("local:");
    const sepcoTaxId = "14139738002001";
    let [sepco] = await db.select().from(companies).where(eq(companies.taxId, sepcoTaxId)).limit(1);
    if (!sepco) {
      const id = crypto.randomUUID(), now = new Date().toISOString();
      await db.batch([
        db.insert(companies).values({ id, legalName: "SEPCO1 CONSTRUCOES DO BRASIL LTDA", tradeName: "SEPCO1", taxId: sepcoTaxId, active: true, createdAt: now }).onConflictDoNothing(),
        ...(!isLocalAccount ? [db.insert(companyUsers).values({ id: crypto.randomUUID(), companyId: id, userId: user.userId, displayName: user.displayName || null, email: user.email || null, role: "super_admin", active: true }).onConflictDoNothing()] : []),
      ]);
      [sepco] = await db.select().from(companies).where(eq(companies.taxId, sepcoTaxId)).limit(1);
    }
    if (sepco) {
      const [membership] = await db.select().from(companyUsers).where(and(eq(companyUsers.companyId, sepco.id), or(eq(companyUsers.userId, user.userId), user.email ? eq(companyUsers.email, user.email.toLowerCase()) : undefined))).limit(1);
      const now = new Date().toISOString();
      await db.batch([
        db.update(companies).set({ legalName: "SEPCO1 CONSTRUCOES DO BRASIL LTDA", tradeName: "SEPCO1", active: true }).where(eq(companies.id, sepco.id)),
        ...(!membership && !isLocalAccount ? [db.insert(companyUsers).values({ id: crypto.randomUUID(), companyId: sepco.id, userId: user.userId, displayName: user.displayName || null, email: user.email || null, role: "super_admin", active: true })] : []),
        ...(membership && !isLocalAccount ? [db.update(companyUsers).set({ displayName: user.displayName || membership.displayName, email: user.email?.toLowerCase() || membership.email, role: "super_admin", active: true }).where(eq(companyUsers.id, membership.id))] : []),
      ]);
      try {
      // As obras iniciais 01–04 foram excluídas pela administradora. Elas não
      // devem ser recriadas automaticamente ao abrir a lista de empresas.
      await db.delete(masterData).where(and(
        eq(masterData.companyId, sepco.id),
        eq(masterData.type, "obra"),
        inArray(masterData.code, ["01", "02", "03", "04"]),
      ));
      const restorationMarker = "restauracao-categorias-produtos-teste-v1";
      const [catalogRestored] = await db.select({ id: masterData.id }).from(masterData).where(and(
        eq(masterData.companyId, sepco.id), eq(masterData.type, "sistema"), eq(masterData.name, restorationMarker),
      )).limit(1);
      if (!catalogRestored) {
        const categories = [
          ["001", "Peças e componentes"], ["002", "Serviços de manutenção"], ["003", "Pneus"],
          ["004", "Baterias"], ["005", "Filtros"], ["006", "Lubrificantes"],
          ["007", "Combustíveis"], ["008", "ARLA 32"], ["009", "Materiais elétricos"],
          ["010", "Borracharia"], ["011", "Lava-jato"], ["012", "Outros produtos e serviços"],
        ];
        const testProducts = [
          ["000001", "FILTRO DE AR APE7590", "UN", "Filtros", "product"],
          ["000002", "ÓLEO DIESEL S10", "L", "Combustíveis", "product"],
          ["000003", "ÓLEO DIESEL S500", "L", "Combustíveis", "product"],
          ["000004", "GASOLINA COMUM", "L", "Combustíveis", "product"],
          ["000005", "ARLA 32", "L", "ARLA 32", "product"],
          ["000006", "ÓLEO LUBRIFICANTE 15W40", "L", "Lubrificantes", "product"],
          ["000007", "FILTRO DE ÓLEO", "UN", "Filtros", "product"],
          ["000008", "FILTRO DE COMBUSTÍVEL", "UN", "Filtros", "product"],
          ["000009", "PNEU NOVO", "UN", "Pneus", "product"],
          ["000010", "PNEU RECAPADO", "UN", "Pneus", "product"],
          ["000011", "BATERIA AUTOMOTIVA", "UN", "Baterias", "product"],
          ["000012", "PASTILHA DE FREIO", "JG", "Peças e componentes", "product"],
          ["000013", "LONA DE FREIO", "JG", "Peças e componentes", "product"],
          ["000014", "CORREIA DO MOTOR", "UN", "Peças e componentes", "product"],
          ["000015", "LÂMPADA AUTOMOTIVA", "UN", "Materiais elétricos", "product"],
          ["000016", "SERVIÇO MECÂNICO", "SV", "Serviços de manutenção", "service"],
          ["000017", "SERVIÇO DE BORRACHARIA", "SV", "Borracharia", "service"],
          ["000018", "SERVIÇO DE LAVA-JATO", "SV", "Lava-jato", "service"],
          ["000019", "ALINHAMENTO E BALANCEAMENTO", "SV", "Serviços de manutenção", "service"],
          ["000020", "RECAPAGEM DE PNEU", "SV", "Pneus", "service"],
        ] as const;
        const categoryStatements = categories.map(([code, name]) => db.insert(masterData).values({
          id: crypto.randomUUID(), companyId: sepco!.id, type: "categoria_produto", code, name,
          description: "Categoria restaurada da base de teste", active: true, createdBy: user.userId, createdAt: now, updatedAt: now,
        }).onConflictDoUpdate({ target: [masterData.companyId, masterData.type, masterData.code, masterData.name], set: { active: true, updatedAt: now } }));
        const productStatements = testProducts.map(([code, name, unit, category, itemType]) => db.insert(products).values({
          id: crypto.randomUUID(), companyId: sepco!.id, code, name, unit, category, itemType,
          application: "Cadastro restaurado da base de teste", manufacturerReference: null, active: true, createdAt: now, updatedAt: now,
        }).onConflictDoUpdate({ target: [products.companyId, products.code], set: { name, unit, category, itemType, active: true, updatedAt: now } }));
        for (let index = 0; index < categoryStatements.length; index += 50) await db.batch(categoryStatements.slice(index, index + 50) as [typeof categoryStatements[number], ...typeof categoryStatements[number][]]);
        for (let index = 0; index < productStatements.length; index += 50) await db.batch(productStatements.slice(index, index + 50) as [typeof productStatements[number], ...typeof productStatements[number][]]);
        await db.insert(masterData).values({ id: crypto.randomUUID(), companyId: sepco.id, type: "sistema", code: "RESTORE-001", name: restorationMarker, description: "Restauração única solicitada pela administradora", active: true, createdBy: user.userId, createdAt: now, updatedAt: now });
      }
      const equipmentMasterMarker = "importacao-tipos-modelos-marcas-2026-11-19-v1";
      const [equipmentMasterImported] = await db.select({ id: masterData.id }).from(masterData).where(and(
        eq(masterData.companyId, sepco.id), eq(masterData.type, "sistema"), eq(masterData.name, equipmentMasterMarker),
      )).limit(1);
      if (!equipmentMasterImported) {
        const masterTypes = ["tipo_equipamento", "modelo_equipamento", "marca_equipamento"] as const;
        const existingMaster = await db.select().from(masterData).where(and(
          eq(masterData.companyId, sepco.id), inArray(masterData.type, [...masterTypes]),
        ));
        const normalize = (value: string | null | undefined) => (value || "").trim().toLocaleUpperCase("pt-BR").replace(/\s+/g, " ");
        const rows = masterTypes.flatMap((type) => sepcoEquipmentMaster[type].map((row) => ({
          type, code: row[0].trim(), name: row[1].trim(),
          description: type === "tipo_equipamento" ? `Quantidade informada na planilha: ${row[2] || "0"}` : type === "marca_equipamento" ? row[2]?.trim() || null : null,
        })));
        const operations = rows.map((row) => {
          const current = existingMaster.find((item) => item.type === row.type && (item.code === row.code || normalize(item.name) === normalize(row.name)));
          return current
            ? db.update(masterData).set({ code: row.code, name: row.name, description: row.description, active: true, updatedAt: now }).where(eq(masterData.id, current.id))
            : db.insert(masterData).values({ id: crypto.randomUUID(), companyId: sepco!.id, type: row.type, code: row.code, name: row.name, description: row.description, active: true, createdBy: user.userId, createdAt: now, updatedAt: now });
        });
        for (let index = 0; index < operations.length; index += 50) await db.batch(operations.slice(index, index + 50) as [typeof operations[number], ...typeof operations[number][]]);
        await db.insert(masterData).values({ id: crypto.randomUUID(), companyId: sepco.id, type: "sistema", code: "IMPORT-20261119", name: equipmentMasterMarker, description: "34 tipos, 95 modelos e 24 marcas importados das planilhas oficiais", active: true, createdBy: user.userId, createdAt: now, updatedAt: now });
      }
      const productCatalogMarker = "importacao-categorias-produtos-servicos-2026-11-19-v1";
      const [productCatalogImported] = await db.select({ id: masterData.id }).from(masterData).where(and(
        eq(masterData.companyId, sepco.id), eq(masterData.type, "sistema"), eq(masterData.name, productCatalogMarker),
      )).limit(1);
      if (!productCatalogImported) {
        const normalize = (value: string | null | undefined) => (value || "")
          .trim().toLocaleUpperCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
        const existingCategories = await db.select().from(masterData).where(and(
          eq(masterData.companyId, sepco.id), eq(masterData.type, "categoria_produto"),
        ));
        const usedCategoryCodes = new Set(existingCategories.map((row) => row.code || ""));
        let nextCategoryCode = Math.max(0, ...existingCategories.map((row) => Number.parseInt(row.code || "0", 10) || 0)) + 1;
        const categoryOperations = sepcoProductCatalog.categories.map((category) => {
          const current = existingCategories.find((row) => normalize(row.name) === normalize(category.name));
          if (current) return db.update(masterData).set({
            description: `${category.group} • ${category.itemCount} item(ns) no catálogo`, active: true, updatedAt: now,
          }).where(eq(masterData.id, current.id));
          let code = String(nextCategoryCode++).padStart(3, "0");
          while (usedCategoryCodes.has(code)) code = String(nextCategoryCode++).padStart(3, "0");
          usedCategoryCodes.add(code);
          return db.insert(masterData).values({
            id: crypto.randomUUID(), companyId: sepco!.id, type: "categoria_produto", code, name: category.name,
            description: `${category.group} • ${category.itemCount} item(ns) no catálogo`, active: true,
            createdBy: user.userId, createdAt: now, updatedAt: now,
          });
        });
        for (let index = 0; index < categoryOperations.length; index += 50) {
          await db.batch(categoryOperations.slice(index, index + 50) as [typeof categoryOperations[number], ...typeof categoryOperations[number][]]);
        }

        const existingProducts = await db.select().from(products).where(eq(products.companyId, sepco.id));
        const usedProductCodes = new Set(existingProducts.map((row) => row.code));
        let nextProductCode = Math.max(0, ...existingProducts.map((row) => Number.parseInt(row.code, 10) || 0)) + 1;
        const productOperations = sepcoProductCatalog.items.map((item) => {
          const current = existingProducts.find((row) => normalize(row.name) === normalize(item.name));
          if (current) return db.update(products).set({
            name: item.name, unit: item.unit, category: item.category, itemType: item.itemType as "product" | "service",
            application: item.sourceType === "Despesa" ? "Despesa operacional cadastrada no catálogo oficial" : current.application,
            active: true, updatedAt: now,
          }).where(eq(products.id, current.id));
          let code = String(nextProductCode++).padStart(6, "0");
          while (usedProductCodes.has(code)) code = String(nextProductCode++).padStart(6, "0");
          usedProductCodes.add(code);
          return db.insert(products).values({
            id: crypto.randomUUID(), companyId: sepco!.id, code, name: item.name, unit: item.unit, category: item.category,
            itemType: item.itemType as "product" | "service",
            application: item.sourceType === "Despesa" ? "Despesa operacional cadastrada no catálogo oficial" : null,
            manufacturerReference: null, active: true, createdAt: now, updatedAt: now,
          });
        });
        for (let index = 0; index < productOperations.length; index += 40) {
          await db.batch(productOperations.slice(index, index + 40) as [typeof productOperations[number], ...typeof productOperations[number][]]);
        }
        await db.insert(masterData).values({
          id: crypto.randomUUID(), companyId: sepco.id, type: "sistema", code: "IMPORT-CATALOGO-20261119", name: productCatalogMarker,
          description: `${sepcoProductCatalog.categories.length} categorias e ${sepcoProductCatalog.items.length} produtos e serviços importados, preservando os códigos existentes`,
          active: true, createdBy: user.userId, createdAt: now, updatedAt: now,
        });
      }
      const cleanupTestProductsMarker = "exclusao-produtos-teste-e-renumeracao-catalogo-2026-11-19-v1";
      const [testProductsCleaned] = await db.select({ id: masterData.id }).from(masterData).where(and(
        eq(masterData.companyId, sepco.id), eq(masterData.type, "sistema"), eq(masterData.name, cleanupTestProductsMarker),
      )).limit(1);
      if (!testProductsCleaned) {
        const testProducts = await db.select({ id: products.id }).from(products).where(and(
          eq(products.companyId, sepco.id), eq(products.application, "Cadastro restaurado da base de teste"),
        ));
        const testProductIds = testProducts.map((row) => row.id);
        for (let index = 0; index < testProductIds.length; index += 80) {
          const ids = testProductIds.slice(index, index + 80);
          await db.update(fiscalInvoiceItems).set({ productId: null }).where(and(
            eq(fiscalInvoiceItems.companyId, sepco.id), inArray(fiscalInvoiceItems.productId, ids),
          ));
          await db.delete(products).where(and(eq(products.companyId, sepco.id), inArray(products.id, ids)));
        }

        const normalize = (value: string | null | undefined) => (value || "")
          .trim().toLocaleUpperCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
        const catalogOrder = new Map(sepcoProductCatalog.items.map((item, index) => [normalize(item.name), index]));
        const remainingProducts = await db.select().from(products).where(eq(products.companyId, sepco.id));
        remainingProducts.sort((a, b) => {
          const aOrder = catalogOrder.get(normalize(a.name)) ?? Number.MAX_SAFE_INTEGER;
          const bOrder = catalogOrder.get(normalize(b.name)) ?? Number.MAX_SAFE_INTEGER;
          return aOrder - bOrder || a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
        });
        const temporaryCodeOperations = remainingProducts.map((product, index) =>
          db.update(products).set({ code: `TMP-${String(index + 1).padStart(6, "0")}`, updatedAt: now }).where(eq(products.id, product.id)),
        );
        for (let index = 0; index < temporaryCodeOperations.length; index += 40) {
          await db.batch(temporaryCodeOperations.slice(index, index + 40) as [typeof temporaryCodeOperations[number], ...typeof temporaryCodeOperations[number][]]);
        }
        const finalCodeOperations = remainingProducts.map((product, index) =>
          db.update(products).set({ code: String(index + 1).padStart(6, "0"), updatedAt: now }).where(eq(products.id, product.id)),
        );
        for (let index = 0; index < finalCodeOperations.length; index += 40) {
          await db.batch(finalCodeOperations.slice(index, index + 40) as [typeof finalCodeOperations[number], ...typeof finalCodeOperations[number][]]);
        }
        await db.insert(masterData).values({
          id: crypto.randomUUID(), companyId: sepco.id, type: "sistema", code: "CLEAN-CATALOGO-20261119", name: cleanupTestProductsMarker,
          description: `${testProductIds.length} produto(s) de teste excluído(s) e ${remainingProducts.length} código(s) reorganizado(s) em ordem crescente`,
          active: true, createdBy: user.userId, createdAt: now, updatedAt: now,
        });
      }
      const fuelCatalogCodesMarker = "codigos-combustiveis-oficiais-sepco1-2026-11-19-v1";
      const [fuelCatalogCodesApplied] = await db.select({ id: masterData.id }).from(masterData).where(and(
        eq(masterData.companyId, sepco.id), eq(masterData.type, "sistema"), eq(masterData.name, fuelCatalogCodesMarker),
      )).limit(1);
      if (!fuelCatalogCodesApplied) {
        const normalize = (value: string | null | undefined) => (value || "")
          .trim().toLocaleUpperCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");
        const currentProducts = await db.select().from(products).where(eq(products.companyId, sepco.id));
        const officialFuels = [
          { code: "000001", name: "GASOLINA", aliases: ["GASOLINA", "GASOLINA COMUM"] },
          { code: "000002", name: "OLEO DIESEL S10", aliases: ["OLEO DIESEL S10", "ÓLEO DIESEL S10"] },
          { code: "000003", name: "OLEO DIESEL S500", aliases: ["OLEO DIESEL S500", "ÓLEO DIESEL S500"] },
          { code: "000004", name: "ARLA 32", aliases: ["ARLA 32"] },
        ];
        const matchedFuelIds = new Set<string>();
        const temporaryOperations = currentProducts.map((product, index) =>
          db.update(products).set({ code: `TMP-FUEL-${String(index + 1).padStart(6, "0")}`, updatedAt: now }).where(eq(products.id, product.id)),
        );
        for (let index = 0; index < temporaryOperations.length; index += 40) {
          await db.batch(temporaryOperations.slice(index, index + 40) as [typeof temporaryOperations[number], ...typeof temporaryOperations[number][]]);
        }
        for (const fuel of officialFuels) {
          const current = currentProducts.find((product) => fuel.aliases.map(normalize).includes(normalize(product.name)));
          if (current) {
            matchedFuelIds.add(current.id);
            await db.update(products).set({ code: fuel.code, name: fuel.name, unit: "LT", category: "Combustíveis", itemType: "product", application: null, active: true, updatedAt: now }).where(eq(products.id, current.id));
          } else {
            await db.insert(products).values({ id: crypto.randomUUID(), companyId: sepco.id, code: fuel.code, name: fuel.name, unit: "LT", category: "Combustíveis", itemType: "product", application: null, manufacturerReference: null, active: true, createdAt: now, updatedAt: now });
          }
        }
        const catalogOrder = new Map(sepcoProductCatalog.items.map((item, index) => [normalize(item.name), index]));
        const remainingProducts = currentProducts.filter((product) => !matchedFuelIds.has(product.id)).sort((a, b) => {
          const aOrder = catalogOrder.get(normalize(a.name)) ?? Number.MAX_SAFE_INTEGER;
          const bOrder = catalogOrder.get(normalize(b.name)) ?? Number.MAX_SAFE_INTEGER;
          return aOrder - bOrder || a.name.localeCompare(b.name, "pt-BR", { sensitivity: "base" });
        });
        const finalCodeOperations = remainingProducts.map((product, index) =>
          db.update(products).set({ code: String(index + 5).padStart(6, "0"), updatedAt: now }).where(eq(products.id, product.id)),
        );
        for (let index = 0; index < finalCodeOperations.length; index += 40) {
          await db.batch(finalCodeOperations.slice(index, index + 40) as [typeof finalCodeOperations[number], ...typeof finalCodeOperations[number][]]);
        }
        await db.insert(masterData).values({
          id: crypto.randomUUID(), companyId: sepco.id, type: "sistema", code: "FUEL-CODES-20261119", name: fuelCatalogCodesMarker,
          description: "Códigos 000001 a 000004 reservados para GASOLINA, DIESEL S10, DIESEL S500 e ARLA 32; demais produtos renumerados a partir de 000005",
          active: true, createdBy: user.userId, createdAt: now, updatedAt: now,
        });
      }
      const uppercaseProductsMarker = "padronizacao-nomes-produtos-maiusculos-sepco1-2026-11-19-v1";
      const [uppercaseProductsApplied] = await db.select({ id: masterData.id }).from(masterData).where(and(
        eq(masterData.companyId, sepco.id), eq(masterData.type, "sistema"), eq(masterData.name, uppercaseProductsMarker),
      )).limit(1);
      if (!uppercaseProductsApplied) {
        const catalogProducts = await db.select({ id: products.id, name: products.name }).from(products).where(eq(products.companyId, sepco.id));
        const operations = catalogProducts.map((product) => db.update(products).set({
          name: product.name.toLocaleUpperCase("pt-BR"), updatedAt: now,
        }).where(eq(products.id, product.id)));
        for (let index = 0; index < operations.length; index += 40) {
          await db.batch(operations.slice(index, index + 40) as [typeof operations[number], ...typeof operations[number][]]);
        }
        await db.insert(masterData).values({
          id: crypto.randomUUID(), companyId: sepco.id, type: "sistema", code: "UPPER-PRODUCTS-20261119", name: uppercaseProductsMarker,
          description: `${catalogProducts.length} produto(s) e serviço(s) padronizado(s) em letras maiúsculas`,
          active: true, createdBy: user.userId, createdAt: now, updatedAt: now,
        });
      }
      const testFinancialCleanupMarker = "exclusao-notas-abastecimentos-teste-sepco1-2026-11-19-v1";
      const [testFinancialDataCleaned] = await db.select({ id: masterData.id }).from(masterData).where(and(
        eq(masterData.companyId, sepco.id), eq(masterData.type, "sistema"), eq(masterData.name, testFinancialCleanupMarker),
      )).limit(1);
      if (!testFinancialDataCleaned) {
        const [invoiceCount] = await db.select({ total: sql<number>`count(*)` }).from(fiscalInvoices).where(eq(fiscalInvoices.companyId, sepco.id));
        const [fuelCount] = await db.select({ total: sql<number>`count(*)` }).from(fuelEntries).where(eq(fuelEntries.companyId, sepco.id));
        await db.batch([
          db.delete(fiscalInvoiceItems).where(eq(fiscalInvoiceItems.companyId, sepco.id)),
          db.delete(fiscalInvoicePayments).where(eq(fiscalInvoicePayments.companyId, sepco.id)),
          db.delete(fiscalInvoices).where(eq(fiscalInvoices.companyId, sepco.id)),
          db.delete(fuelEntries).where(eq(fuelEntries.companyId, sepco.id)),
        ]);
        await db.insert(masterData).values({
          id: crypto.randomUUID(), companyId: sepco.id, type: "sistema", code: "CLEAN-TEST-FIN-20261119", name: testFinancialCleanupMarker,
          description: `${Number(invoiceCount?.total || 0)} nota(s) fiscal(is) de teste e ${Number(fuelCount?.total || 0)} abastecimento(s) de teste excluído(s)`,
          active: true, createdBy: user.userId, createdAt: now, updatedAt: now,
        });
      }
      const [professionalCount] = await db.select({ total: sql<number>`count(*)` }).from(masterData)
        .where(and(eq(masterData.companyId, sepco.id), eq(masterData.type, "profissional")));
      if (Number(professionalCount?.total || 0) < sepcoProfessionals.length) {
        for (let index = 0; index < sepcoProfessionals.length; index += 80) {
          const chunk = sepcoProfessionals.slice(index, index + 80).map((professional) =>
            db.insert(masterData).values({
              id: crypto.randomUUID(),
              companyId: sepco!.id,
              type: "profissional",
              code: professional.code,
              name: professional.name,
              description: JSON.stringify(professional),
              active: true,
              createdBy: user.userId,
              createdAt: now,
              updatedAt: now,
            }).onConflictDoNothing(),
          );
          await db.batch(chunk as [typeof chunk[number], ...typeof chunk[number][]]);
        }
      }
      for (let index = 0; index < excludedSepcoProfessionals.length; index += 80) {
        await db.delete(masterData).where(and(
          eq(masterData.companyId, sepco.id),
          eq(masterData.type, "profissional"),
          inArray(masterData.name, excludedSepcoProfessionals.slice(index, index + 80)),
        ));
      }
      const realEquipment = await loadSepcoEquipment();
      const realFleetNumbers = new Set(realEquipment.map((row) => row[0]));
      const existingEquipment = await db.select({ id: equipment.id, fleetNumber: equipment.fleetNumber })
        .from(equipment).where(eq(equipment.companyId, sepco.id));
      const importedCount = existingEquipment.filter((row) => realFleetNumbers.has(row.fleetNumber)).length;
      // A relação VME anexada abaixo é a fonte atual e completa. O importador
      // legado fica desativado para não interromper nem sobrescrever essa carga.
      const useLegacyEquipmentImport = false;
      if (useLegacyEquipmentImport && importedCount < realEquipment.length) {
        const demoEquipment = existingEquipment.filter((row) => !realFleetNumbers.has(row.fleetNumber));
        for (let index = 0; index < demoEquipment.length; index += 80) {
          const operations = demoEquipment.slice(index, index + 80).map((row) =>
            db.update(equipment).set({ status: "demo" }).where(eq(equipment.id, row.id)),
          );
          if (operations.length) await db.batch(operations as [typeof operations[number], ...typeof operations[number][]]);
        }
        for (let index = 0; index < realEquipment.length; index += 40) {
        const operations = realEquipment.slice(index, index + 40).map((row) => {
          const values = {
            id: crypto.randomUUID(), companyId: sepco!.id, fleetNumber: row[0], plate: row[1]?.replace(/[^a-zA-Z0-9]/g, "").toUpperCase() || null,
            description: row[2], equipmentType: row[2], brand: row[3], model: row[4], manufactureYear: row[5], chassis: row[6], renavam: row[7],
            status: row[8], monthlyRentCents: row[9], arrivalDate: row[10], departureDate: row[11], crlvExpiryDate: row[12], projectName: row[13],
            frontName: row[14], costCenter: row[13], operatorName: row[15], measurementType: row[16], lessorName: row[17], ownershipType: "rented", observation: row[18], entryChecklistStatus: "approved",
          };
          return db.insert(equipment).values(values).onConflictDoUpdate({ target: [equipment.companyId, equipment.fleetNumber], set: { plate: values.plate, description: values.description, equipmentType: values.equipmentType, brand: values.brand, model: values.model, manufactureYear: values.manufactureYear, chassis: values.chassis, renavam: values.renavam, status: values.status, monthlyRentCents: values.monthlyRentCents, arrivalDate: values.arrivalDate, departureDate: values.departureDate, crlvExpiryDate: values.crlvExpiryDate, projectName: values.projectName, frontName: values.frontName, costCenter: values.costCenter, operatorName: values.operatorName, measurementType: values.measurementType, lessorName: values.lessorName, ownershipType: values.ownershipType, observation: values.observation, entryChecklistStatus: values.entryChecklistStatus } });
        });
          await db.batch(operations as [typeof operations[number], ...typeof operations[number][]]);
        }
      }

      const vmeImportMarker = "importacao-relacao-vme-sepco1-2026-11-19-v1";
      const [vmeImported] = await db.select({ id: masterData.id }).from(masterData).where(and(
        eq(masterData.companyId, sepco.id), eq(masterData.type, "sistema"), eq(masterData.name, vmeImportMarker),
      )).limit(1);
      if (!vmeImported) {
        const normalize = (value: string | null | undefined) => (value || "")
          .trim().toLocaleUpperCase("pt-BR").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ");

        const currentProfessionals = await db.select().from(masterData).where(and(
          eq(masterData.companyId, sepco.id), eq(masterData.type, "profissional"),
        ));
        const professionalOperations = sepcoVmeImport.professionals.map((professional) => {
          const current = currentProfessionals.find((row) =>
            row.code === professional.code || normalize(row.name) === normalize(professional.name),
          );
          const description = JSON.stringify(professional);
          return current
            ? db.update(masterData).set({
                code: professional.code, name: professional.name, description,
                active: professional.sourceStatus.toLocaleUpperCase("pt-BR") !== "DEMITIDO", updatedAt: now,
              }).where(eq(masterData.id, current.id))
            : db.insert(masterData).values({
                id: crypto.randomUUID(), companyId: sepco!.id, type: "profissional",
                code: professional.code, name: professional.name, description,
                active: professional.sourceStatus.toLocaleUpperCase("pt-BR") !== "DEMITIDO",
                createdBy: user.userId, createdAt: now, updatedAt: now,
              });
        });
        for (let index = 0; index < professionalOperations.length; index += 50) {
          await db.batch(professionalOperations.slice(index, index + 50) as [typeof professionalOperations[number], ...typeof professionalOperations[number][]]);
        }

        const equipmentOperations = sepcoVmeImport.equipment.map((row) => {
          const values = {
            id: crypto.randomUUID(), companyId: sepco!.id, fleetNumber: row.fleetNumber,
            plate: row.plate, description: row.description, equipmentType: row.equipmentType,
            brand: row.brand, model: row.model, manufactureYear: row.manufactureYear,
            chassis: row.chassis, renavam: row.renavam, crlvExpiryDate: row.crlvExpiryDate,
            status: row.status, ownershipType: row.ownershipType, operatorName: row.operatorName,
            projectName: row.projectName, costCenter: row.costCenter, frontName: row.frontName,
            lessorName: row.lessorName, lessorTaxId: row.lessorTaxId,
            arrivalDate: row.arrivalDate, registrationDate: row.registrationDate,
            departureDate: row.departureDate, monthlyRentCents: row.monthlyRentCents,
            measurementType: row.measurementType, observation: row.observation,
            entryChecklistStatus: "approved",
          };
          return db.insert(equipment).values(values).onConflictDoUpdate({
            target: [equipment.companyId, equipment.fleetNumber],
            set: {
              plate: values.plate, description: values.description, equipmentType: values.equipmentType,
              brand: values.brand, model: values.model, manufactureYear: values.manufactureYear,
              chassis: values.chassis, renavam: values.renavam, crlvExpiryDate: values.crlvExpiryDate,
              status: values.status, ownershipType: values.ownershipType, operatorName: values.operatorName,
              projectName: values.projectName, costCenter: values.costCenter, frontName: values.frontName,
              lessorName: values.lessorName, lessorTaxId: values.lessorTaxId,
              arrivalDate: values.arrivalDate, registrationDate: values.registrationDate,
              departureDate: values.departureDate, monthlyRentCents: values.monthlyRentCents,
              measurementType: values.measurementType, observation: values.observation,
              entryChecklistStatus: values.entryChecklistStatus,
            },
          });
        });
        for (let index = 0; index < equipmentOperations.length; index += 35) {
          await db.batch(equipmentOperations.slice(index, index + 35) as [typeof equipmentOperations[number], ...typeof equipmentOperations[number][]]);
        }

        await db.insert(masterData).values({
          id: crypto.randomUUID(), companyId: sepco.id, type: "sistema", code: "IMPORT-VME-20261119",
          name: vmeImportMarker,
          description: `${sepcoVmeImport.professionals.length} profissionais das funções autorizadas e ${sepcoVmeImport.equipment.length} equipamentos importados das abas da relação VME`,
          active: true, createdBy: user.userId, createdAt: now, updatedAt: now,
        });
      }
      } catch (seedError) {
        console.error("SEPCO1 optional bootstrap failed without blocking company access", seedError);
      }
    }
    const rows = await db
      .select({
        id: companies.id,
        legalName: companies.legalName,
        tradeName: companies.tradeName,
        taxId: companies.taxId,
        role: companyUsers.role,
      })
      .from(companyUsers)
      .innerJoin(companies, eq(companyUsers.companyId, companies.id))
      .where(and(or(eq(companyUsers.userId, user.userId), user.email ? eq(companyUsers.email, user.email.toLowerCase()) : undefined), eq(companyUsers.active, true), eq(companies.active, true)))
      .orderBy(asc(companies.createdAt));
    rows.sort((a, b) => Number(b.taxId === sepcoTaxId) - Number(a.taxId === sepcoTaxId));
    const currentMembership = rows.find((row) => row.id === (sepco?.id || rows[0]?.id));
    return Response.json({ companies: rows, activeCompany: sepco?.id || rows[0]?.id || null, environment: "production", currentUser: { name: user.displayName || "Usuário", email: user.email || null, role: currentMembership?.role || "viewer" } });
  } catch (error) {
    return apiError(error);
  }
}

async function requireCompanyAdministrator(companyId: string, userId: string) {
  const [membership] = await getDb().select().from(companyUsers).where(and(
    eq(companyUsers.companyId, companyId),
    eq(companyUsers.userId, userId),
    eq(companyUsers.active, true),
  )).limit(1);
  if (!membership || membership.role !== "super_admin") return null;
  return membership;
}

export async function PATCH(request: Request) {
  try {
    const user = await requireApiUser();
    const body = await request.json() as { id?: string; legalName?: string; tradeName?: string; taxId?: string };
    const id = body.id || "", legalName = body.legalName?.trim(), tradeName = body.tradeName?.trim(), taxId = body.taxId?.replace(/\D/g, "");
    if (!id || !legalName || !tradeName || !taxId) return Response.json({ error: "Razão social, nome fantasia e CNPJ são obrigatórios." }, { status: 400 });
    if (taxId.length !== 14) return Response.json({ error: "Informe um CNPJ válido com 14 números." }, { status: 400 });
    const membership = await requireCompanyAdministrator(id, user.userId);
    if (!membership) return Response.json({ error: "Somente o administrador geral pode alterar esta empresa." }, { status: 403 });
    const [duplicate] = await getDb().select({ id: companies.id, tradeName: companies.tradeName }).from(companies).where(and(eq(companies.taxId, taxId), ne(companies.id, id))).limit(1);
    if (duplicate) return Response.json({ error: `${duplicate.tradeName} já está cadastrada com este CNPJ.` }, { status: 409 });
    await getDb().batch([
      getDb().update(companies).set({ legalName, tradeName, taxId }).where(eq(companies.id, id)),
      getDb().insert(auditLog).values({ id: crypto.randomUUID(), companyId: id, userId: user.userId, action: "Alterou as informações da empresa", entity: "company", entityId: id, createdAt: new Date().toISOString() }),
    ]);
    return Response.json({ company: { id, legalName, tradeName, taxId, role: membership.role } });
  } catch (error) { return apiError(error); }
}

export async function DELETE(request: Request) {
  try {
    const user = await requireApiUser();
    const body = await request.json() as { id?: string; reason?: string };
    const id = body.id || "", reason = body.reason?.trim() || "";
    if (reason.length < 10) return Response.json({ error: "Informe uma justificativa com pelo menos 10 caracteres." }, { status: 400 });
    const membership = await requireCompanyAdministrator(id, user.userId);
    if (!membership) return Response.json({ error: "Somente o administrador geral pode excluir esta empresa." }, { status: 403 });
    const [company] = await getDb().select().from(companies).where(eq(companies.id, id)).limit(1);
    if (!company) return Response.json({ error: "Empresa não encontrada." }, { status: 404 });
    if (company.taxId === "14139738002001") return Response.json({ error: "A SEPCO1 é a empresa principal desta base e não pode ser excluída." }, { status: 409 });
    const now = new Date().toISOString();
    await getDb().batch([
      getDb().update(companies).set({ active: false }).where(eq(companies.id, id)),
      getDb().update(companyUsers).set({ active: false }).where(eq(companyUsers.companyId, id)),
      getDb().insert(auditLog).values({ id: crypto.randomUUID(), companyId: id, userId: user.userId, action: `Desativou a empresa: ${reason}`, entity: "company", entityId: id, createdAt: now }),
    ]);
    return Response.json({ message: "Empresa excluída das listas. Os registros e o histórico foram preservados para auditoria." });
  } catch (error) { return apiError(error); }
}

export async function POST(request: Request) {
  try {
    const user = await requireApiUser();
    const db = getDb();
    const body = (await request.json()) as {
      legalName?: string;
      tradeName?: string;
      taxId?: string;
    };
    const legalName = body.legalName?.trim(),
      tradeName = body.tradeName?.trim(),
      taxId = body.taxId?.replace(/\D/g, "");
    if (!legalName || !tradeName || !taxId)
      return Response.json(
        { error: "Razão social, nome fantasia e CNPJ são obrigatórios." },
        { status: 400 },
      );
    if (taxId.length !== 14)
      return Response.json(
        { error: "Informe um CNPJ válido com 14 números." },
        { status: 400 },
      );
    const [existingCompany] = await db
      .select({ id: companies.id, legalName: companies.legalName, tradeName: companies.tradeName })
      .from(companies)
      .where(eq(companies.taxId, taxId))
      .limit(1);
    if (existingCompany)
      return Response.json(
        { error: `${existingCompany.tradeName} já está cadastrada com este CNPJ. Feche esta janela e selecione a empresa na lista.` },
        { status: 409 },
      );
    const [{ total }] = await db
      .select({ total: sql<number>`count(*)` })
      .from(companies);
    if (Number(total) > 0) {
      const [admin] = await db
        .select()
        .from(companyUsers)
        .where(eq(companyUsers.userId, user.userId))
        .limit(1);
      if (!admin || admin.role !== "super_admin")
        return Response.json(
          { error: "Somente o administrador geral pode cadastrar empresas." },
          { status: 403 },
        );
    }
    const id = crypto.randomUUID(),
      now = new Date().toISOString();
    await db.batch([
      db
        .insert(companies)
        .values({
          id,
          legalName,
          tradeName,
          taxId,
          active: true,
          createdAt: now,
        }),
      db
        .insert(companyUsers)
        .values({
          id: crypto.randomUUID(),
          companyId: id,
          userId: user.userId,
          role: "super_admin",
          active: true,
        }),
    ]);
    return Response.json(
      { company: { id, legalName, tradeName, taxId, role: "super_admin" } },
      { status: 201 },
    );
  } catch (error) {
    return apiError(error);
  }
}
