import { and, eq } from "drizzle-orm";
import { getDb } from "@/db";
import { companies, masterData } from "@/db/schema";

export const MAINTENANCE_RULE_TYPE = "system_setting";
export const MAINTENANCE_GRACE_CODE = "maintenance_grace_days";

export async function getMaintenanceGraceDays(companyId: string) {
  const [setting] = await getDb().select({ value: masterData.name }).from(masterData).where(and(
    eq(masterData.companyId, companyId),
    eq(masterData.type, MAINTENANCE_RULE_TYPE),
    eq(masterData.code, MAINTENANCE_GRACE_CODE),
  )).limit(1);
  if (setting) return Math.max(0, Math.min(30, Number.parseInt(setting.value, 10) || 0));
  const [company] = await getDb().select({ tradeName: companies.tradeName, legalName: companies.legalName }).from(companies).where(eq(companies.id, companyId)).limit(1);
  return /SEPCO1/i.test(`${company?.tradeName || ""} ${company?.legalName || ""}`) ? 1 : 2;
}
