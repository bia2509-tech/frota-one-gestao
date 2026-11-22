export type FuelAlertLevel = "green" | "yellow" | "red" | "unknown";

export function fuelBalancePercent(balanceMilli: number, capacityMilli: number): number | null {
  if (!Number.isFinite(balanceMilli) || !Number.isFinite(capacityMilli) || capacityMilli <= 0) return null;
  return Math.max(0, balanceMilli) / capacityMilli * 100;
}

export function fuelAlertLevel(balanceMilli: number, capacityMilli: number): FuelAlertLevel {
  const percent = fuelBalancePercent(balanceMilli, capacityMilli);
  if (percent === null) return "unknown";
  if (percent <= 20) return "red";
  if (percent < 40) return "yellow";
  return "green";
}

export function nextFuelBalance(openingMilli: number, deltasMilli: number[]): number {
  return deltasMilli.reduce((balance, delta) => balance + delta, openingMilli);
}

export function canMoveFuel(balanceMilli: number, capacityMilli: number, deltaMilli: number): boolean {
  const next = balanceMilli + deltaMilli;
  return Number.isInteger(next) && next >= 0 && (capacityMilli <= 0 || next <= capacityMilli);
}

export function canUseFuelCredit(input: {
  creditSupplierId: string;
  selectedSupplierId: string;
  remainingCents: number;
  requestedCents: number;
}): boolean {
  return input.creditSupplierId === input.selectedSupplierId
    && Number.isInteger(input.remainingCents)
    && Number.isInteger(input.requestedCents)
    && input.requestedCents > 0
    && input.requestedCents <= input.remainingCents;
}

export function fuelEntryFingerprint(input: {
  date: string; equipmentId: string; supplierId: string; requisitionCoupon: string;
  litersMilli: number; totalCents: number;
}): string {
  return [input.date.trim(), input.equipmentId.trim(), input.supplierId.trim(),
    input.requisitionCoupon.trim().toUpperCase(), String(input.litersMilli), String(input.totalCents)].join("|");
}
