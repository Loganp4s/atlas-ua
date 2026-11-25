import { test, expect } from "bun:test";
const { preparePendingOp, clearPendingOp, isDefinitiveDbError } = await import("@/lib/financeiro/pending-installment");
const { detectFinance } = await import("@/lib/atlas/finance-intent");
const { answerFinanceQuery } = await import("@/lib/atlas/finance-query");
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v), removeItem: (k) => m.delete(k) }; };

test("mesma tentativa reutiliza a chave (reload/duas abas); dados diferentes bloqueiam", () => {
  const s = mem(); let n = 0; const id = () => `k${++n}`;
  const a = preparePendingOp(s, "installment-plan", "u", "new", { total: 100 }, id);
  expect(preparePendingOp(s, "installment-plan", "u", "new", { total: 100 }, id).requestId).toBe(a.requestId);
  expect(() => preparePendingOp(s, "installment-plan", "u", "new", { total: 101 }, id)).toThrow();
  clearPendingOp(s, "installment-plan", a, "new");
  expect(preparePendingOp(s, "installment-plan", "u", "new", { total: 101 }, id).requestId).not.toBe(a.requestId);
});
test("rede preserva a chave; erro definitivo libera", () => {
  expect(isDefinitiveDbError(new TypeError("fetch failed"))).toBe(false);
  expect(isDefinitiveDbError({ code: "PT409" })).toBe(false);
  expect(isDefinitiveDbError({ code: "22023" })).toBe(true);
});
test("Composer: frases de compra parcelada trazem total e quantidade", () => {
  for (const [t, v, n] of [["Comprei um celular de R$ 1.200 em 12 vezes", 1200, 12], ["Gastei R$ 900 em 3 parcelas", 900, 3], ["Comprei um notebook por R$ 2.400 parcelado em 6 vezes", 2400, 6]]) {
    const r = detectFinance(t, new Date(2026, 10, 25));
    expect([r.kind, r.amount, r.installments]).toEqual(["saida", v, n]);
  }
});
test("consulta de parcelas não trata previsão como gasto", () => {
  expect(detectFinance("quanto tenho de parcelas?").query).toBe("parcelas");
  const msg = answerFinanceQuery("parcelas", { accounts: [], transactions: [], goals: [], installmentPlans: [{ id: "p", status: "ativo" }],
    installments: [{ id: "a", plan_id: "p", number: 1, amount: 450, due_date: "2026-12-05", status: "aberta" }] }, new Date(2026, 10, 25));
  expect(msg).toMatch(/450,00 em parcelas previstas para os próximos 30 dias/);
  expect(msg).toContain("previsões");
});
