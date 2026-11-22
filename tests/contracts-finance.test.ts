import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateEquipmentCommitmentCents,
  calculateEquipmentReductionCents,
  calculateContractMonthlyCents,
  countContractMonthsInclusive,
} from "../lib/contracts-finance.ts";

test("Apropriação recebe o valor mensal do equipamento mais a mão de obra", () => {
  assert.equal(calculateContractMonthlyCents({ monthlyEquipmentCents: 1_550_000, monthlyOperatorCents: 350_000 }), 1_900_000);
  assert.equal(calculateContractMonthlyCents({ monthlyEquipmentCents: 1_550_000, monthlyOperatorCents: 0 }), 1_550_000);
});

test("conta meses contratuais e um mês parcial final", () => {
  assert.equal(countContractMonthsInclusive("2025-07-07", "2025-10-15"), 4);
});

test("reproduz o encerramento antecipado RET-2886 do Anexo I", () => {
  const item = {
    startsAt: "2025-07-07",
    endsAt: "2025-10-15",
    monthlyEquipmentCents: 1_550_000,
    monthlyOperatorCents: 0,
    mobilizationCents: 0,
    demobilizationCents: 0,
    quantityMilli: 1000,
  };
  assert.equal(calculateEquipmentCommitmentCents(item), 6_200_000);
  assert.equal(calculateEquipmentReductionCents(item, "2026-07-06"), 12_400_000);
});

test("mobilização e desmobilização entram uma vez, fora do valor mensal", () => {
  assert.equal(calculateEquipmentCommitmentCents({
    startsAt: "2025-01-05",
    endsAt: "2025-03-31",
    monthlyEquipmentCents: 100_000,
    monthlyOperatorCents: 20_000,
    mobilizationCents: 15_000,
    demobilizationCents: 10_000,
    quantityMilli: 1000,
  }), 385_000);
});

test("rejeita período inválido", () => {
  assert.throws(() => countContractMonthsInclusive("2025-10-01", "2025-09-30"), RangeError);
});
