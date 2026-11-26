/**
 * Contract commitment rules shared by the API and the Anexo I preview.
 * Monthly billing counts completed monthly periods and one final partial month.
 * This matches 07/07–15/10 = four months and 07/07–06/07 = twelve months.
 */
export function countContractMonthsInclusive(startsAt: string, endsAt: string): number { if (!startsAt || !endsAt) return 1;
  const start = new Date(`${startsAt}T12:00:00Z`);
  const end = new Date(`${endsAt}T12:00:00Z`);
  if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime()) || end < start) {
    throw new RangeError("O período do equipamento é inválido.");
  }
  const monthDifference = (end.getUTCFullYear() - start.getUTCFullYear()) * 12
    + end.getUTCMonth() - start.getUTCMonth();
  return Math.max(1, monthDifference + (end.getUTCDate() >= start.getUTCDate() ? 1 : 0));
}

/** Billing periods in the Anexo I use 30-day months, including a partial month. */
export function countContractBillableDays(startsAt: string, endsAt: string): number {
  return countContractMonthsInclusive(startsAt, endsAt) * 30;
}

export type EquipmentCommitmentInput = {
  startsAt: string;
  endsAt: string;
  monthlyEquipmentCents: number;
  monthlyOperatorCents: number;
  mobilizationCents: number;
  demobilizationCents: number;
  quantityMilli: number;
};

export function calculateContractMonthlyCents(item: Pick<EquipmentCommitmentInput, "monthlyEquipmentCents" | "monthlyOperatorCents">): number {
  return Math.max(0, item.monthlyEquipmentCents) + Math.max(0, item.monthlyOperatorCents);
}

export function calculateEquipmentCommitmentCents(item: EquipmentCommitmentInput): number {
  const months = countContractMonthsInclusive(item.startsAt, item.endsAt);
  const monthly = calculateContractMonthlyCents(item);
  const oneTime = Math.max(0, item.mobilizationCents) + Math.max(0, item.demobilizationCents);
  const quantityMilli = Math.max(0, item.quantityMilli);
  return Math.round((monthly * months + oneTime) * quantityMilli / 1000);
}

export function calculateEquipmentReductionCents(
  item: EquipmentCommitmentInput,
  originalEndsAt: string,
): number {
  if (item.endsAt >= originalEndsAt) return 0;
  const original = calculateEquipmentCommitmentCents({ ...item, endsAt: originalEndsAt });
  const updated = calculateEquipmentCommitmentCents(item);
  return Math.max(0, original - updated);
}

