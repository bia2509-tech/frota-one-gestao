import assert from "node:assert/strict";
import test from "node:test";
import { canMoveFuel, canUseFuelCredit, fuelAlertLevel, fuelBalancePercent, fuelEntryFingerprint, nextFuelBalance } from "../lib/fuel-domain.ts";

test("alertas aplicam os limites exatos de 40% e 20%", () => {
  assert.equal(fuelAlertLevel(400, 1000), "green");
  assert.equal(fuelAlertLevel(399, 1000), "yellow");
  assert.equal(fuelAlertLevel(201, 1000), "yellow");
  assert.equal(fuelAlertLevel(200, 1000), "red");
  assert.equal(fuelAlertLevel(0, 1000), "red");
  assert.equal(fuelAlertLevel(10, 0), "unknown");
});

test("percentual é calculado sobre a capacidade individual", () => {
  assert.equal(fuelBalancePercent(125_000, 500_000), 25);
  assert.equal(fuelBalancePercent(100, 0), null);
});

test("saldo considera abertura, recebimentos, distribuições e ajustes", () => {
  assert.equal(nextFuelBalance(5_000, [10_000, -3_000, -500]), 11_500);
});

test("movimentação bloqueia saldo negativo e capacidade excedida", () => {
  assert.equal(canMoveFuel(500, 1000, -500), true);
  assert.equal(canMoveFuel(499, 1000, -500), false);
  assert.equal(canMoveFuel(900, 1000, 101), false);
});

test("crédito só pode ser usado no fornecedor correto e até o saldo", () => {
  assert.equal(canUseFuelCredit({ creditSupplierId: "a", selectedSupplierId: "a", remainingCents: 5000, requestedCents: 5000 }), true);
  assert.equal(canUseFuelCredit({ creditSupplierId: "a", selectedSupplierId: "b", remainingCents: 5000, requestedCents: 1 }), false);
  assert.equal(canUseFuelCredit({ creditSupplierId: "a", selectedSupplierId: "a", remainingCents: 5000, requestedCents: 5001 }), false);
});

test("impressão digital de importação identifica linhas repetidas", () => {
  const first = fuelEntryFingerprint({ date: "2026-11-21", equipmentId: "e1", supplierId: "s1", requisitionCoupon: "RN-9", litersMilli: 30000, totalCents: 18000 });
  const duplicate = fuelEntryFingerprint({ date: "2026-11-21", equipmentId: "e1", supplierId: "s1", requisitionCoupon: " rn-9 ", litersMilli: 30000, totalCents: 18000 });
  assert.equal(first, duplicate);
});

test("saldo crítico usa vermelho a 20% exatos", () => assert.equal(fuelAlertLevel(20, 100), "red"));
test("saldo em atenção inclui valores acima de 20% e abaixo de 40%", () => assert.equal(fuelAlertLevel(21, 100), "yellow"));
test("saldo verde inclui valores acima de 40%", () => assert.equal(fuelAlertLevel(401, 1000), "green"));
test("percentual não fica negativo", () => assert.equal(fuelBalancePercent(-1, 100), 0));
test("capacidade zero não cria percentual enganoso", () => assert.equal(fuelAlertLevel(0, 0), "unknown"));
test("estoque permite distribuição até saldo zero", () => assert.equal(canMoveFuel(800, 1000, -800), true));
test("estoque bloqueia distribuição superior ao saldo", () => assert.equal(canMoveFuel(799, 1000, -800), false));
test("estoque permite recebimento até a capacidade exata", () => assert.equal(canMoveFuel(800, 1000, 200), true));
test("estoque bloqueia capacidade excedida por um litro", () => assert.equal(canMoveFuel(800, 1000, 201), false));
test("ajuste aumenta o saldo de forma rastreável", () => assert.equal(nextFuelBalance(100, [50]), 150));
test("crédito permite consumo parcial", () => assert.equal(canUseFuelCredit({ creditSupplierId: "s", selectedSupplierId: "s", remainingCents: 1000, requestedCents: 400 }), true));
test("crédito não permite consumo de valor zero", () => assert.equal(canUseFuelCredit({ creditSupplierId: "s", selectedSupplierId: "s", remainingCents: 1000, requestedCents: 0 }), false));
test("crédito não mistura fornecedores", () => assert.equal(canUseFuelCredit({ creditSupplierId: "s1", selectedSupplierId: "s2", remainingCents: 1000, requestedCents: 100 }), false));
test("digital do lançamento muda quando muda o equipamento", () => {
  const a = fuelEntryFingerprint({ date: "2026-11-21", equipmentId: "e1", supplierId: "s", requisitionCoupon: "", litersMilli: 1000, totalCents: 500 });
  const b = fuelEntryFingerprint({ date: "2026-11-21", equipmentId: "e2", supplierId: "s", requisitionCoupon: "", litersMilli: 1000, totalCents: 500 });
  assert.notEqual(a, b);
});
