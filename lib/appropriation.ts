export type DailyStatus = "T" | "D" | "M" | "AB";
export type DailyEntry = {
  entryDate: string;
  status: DailyStatus;
  maintenanceOrderId: string | null;
  orderNumber?: string | null;
};

const dayMs = 86_400_000;
const utc = (date: string) => Date.parse(`${date}T00:00:00Z`);
const consecutive = (a: string, b: string) => utc(b) - utc(a) === dayMs;

export function calculateAppropriation(
  entries: DailyEntry[],
  referenceMonth: string,
  monthlyRentCents: number,
  periodStart = `${referenceMonth}-01`,
  periodEnd = new Date(Date.UTC(Number(referenceMonth.slice(0, 4)), Number(referenceMonth.slice(5, 7)), 0)).toISOString().slice(0, 10),
  maintenanceGraceDays = 2,
) {
  const [year, month] = referenceMonth.split("-").map(Number);
  const calendarDays = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const commercialAdjustmentDays = Math.max(0, 30 - calendarDays);
  const dailyValueCents = Math.round(monthlyRentCents / 30);
  const sorted = [...entries].sort((a, b) =>
    a.entryDate.localeCompare(b.entryDate),
  );
  const mEntries = sorted.filter((e) => e.status === "M");
  const occurrences: DailyEntry[][] = [];
  for (const entry of mEntries) {
    const last = occurrences.at(-1);
    const previous = last?.at(-1);
    if (
      last &&
      previous &&
      previous.maintenanceOrderId === entry.maintenanceOrderId &&
      consecutive(previous.entryDate, entry.entryDate)
    )
      last.push(entry);
    else occurrences.push([entry]);
  }
  const inMonth = (date: string) => date >= periodStart && date <= periodEnd;
  const financialDay = (date: string) => Number(date.slice(8, 10)) <= 30;
  const monthEntries = sorted.filter((e) => inMonth(e.entryDate));
  const counts = { T: 0, D: 0, M: 0, AB: 0 };
  for (const e of monthEntries) counts[e.status]++;
  const occurrenceReport = occurrences
    .map((group) => {
      const daysInMonth = group.filter((e) => inMonth(e.entryDate));
      const eligibleDays = daysInMonth.filter((e) =>
        financialDay(e.entryDate),
      ).length;
      const isDiscounted = group.length > maintenanceGraceDays;
      return {
        maintenanceOrderId: group[0].maintenanceOrderId,
        orderNumber: group[0].orderNumber || null,
        startDate: group[0].entryDate,
        endDate: group.at(-1)!.entryDate,
        realDays: group.length,
        daysInReferenceMonth: daysInMonth.length,
        toleranceDays: isDiscounted ? 0 : eligibleDays,
        discountedDays: isDiscounted ? eligibleDays : 0,
        discountCents: isDiscounted ? eligibleDays * dailyValueCents : 0,
      };
    })
    .filter((o) => o.daysInReferenceMonth > 0);
  const discountedDays = occurrenceReport.reduce(
    (sum, o) => sum + o.discountedDays,
    0,
  );
  const toleranceDays = occurrenceReport.reduce(
    (sum, o) => sum + o.toleranceDays,
    0,
  );
  const day31Entries = monthEntries.filter(
    (e) => !financialDay(e.entryDate),
  ).length;
  const discountCents = discountedDays * dailyValueCents;
  // A locação é proporcional aos dias efetivamente registrados. Só a manutenção
  // contínua acima da tolerância reduz dias pagos; fevereiro completa 30 dias
  // quando todos os dias corridos do mês foram lançados.
  const validDailyStatuses = new Set<DailyStatus>(["T", "D", "M", "AB"]);
  const recordedDays = new Set(monthEntries
    .filter((entry) => validDailyStatuses.has(entry.status) && financialDay(entry.entryDate))
    .map((entry) => entry.entryDate)).size;
  const februaryAdjustment = month === 2 && recordedDays >= calendarDays ? commercialAdjustmentDays : 0;
  const paidDays = Math.min(30, Math.max(0, recordedDays + februaryAdjustment - discountedDays));
  return {
    referenceMonth,
    calendarDays,
    commercialDays: 30,
    commercialAdjustmentDays,
    day31Entries,
    counts,
    maintenanceDaysReal: counts.M,
    maintenanceDaysFinancial: monthEntries.filter(
      (e) => e.status === "M" && financialDay(e.entryDate),
    ).length,
    maintenanceGraceDays,
    maintenanceDiscountStartsOnDay: maintenanceGraceDays + 1,
    toleranceDays,
    discountedDays,
    paidDays,
    dailyValueCents,
    monthlyRentCents,
    discountCents,
    payableCents: Math.min(monthlyRentCents, paidDays * dailyValueCents),
    occurrences: occurrenceReport,
  };
}
