import { test, expect, mock } from "bun:test";
mock.module("@/integrations/supabase/client", () => ({ supabase: {} }));
const { computeBalanceBreakdown, computeBalance, computeActiveBalance } = await import("./api");
const { answerFinanceQuery } = await import("@/lib/atlas/finance-query");
const { worldCards } = await import("@/lib/inicial/derive");

const acc = (id, initial, archived = false) => ({ id, name: id, initial_balance: initial, archived });
const tx = (id, account_id, type, amount) => ({ id, account_id, type, amount, tx_date: "2026-10-10" });
const bd = (a, t) => computeBalanceBreakdown(a, t);

test("1 conta ativa sem movimentações", () => expect(bd([acc("a", 100)], []).active.balance).toBe(100));
test("2 conta ativa com entradas e saídas", () => expect(bd([acc("a", 100)], [tx(1, "a", "entrada", 50), tx(2, "a", "saida", 30)]).active.balance).toBe(120));
test("3 conta arquivada sem movimentações fica fora das ativas", () => {
  const r = bd([acc("x", 80, true)], []);
  expect(r.archived.balance).toBe(80); expect(r.active.balance).toBe(0);
});
test("4 conta arquivada com entradas e saídas", () => {
  const r = bd([acc("x", 80, true)], [tx(1, "x", "entrada", 20), tx(2, "x", "saida", 50)]);
  expect(r.archived.balance).toBe(50); expect(r.active.balance).toBe(0);
});
test("5 movimentações sem conta ficam separadas", () => {
  const r = bd([acc("a", 100)], [tx(1, null, "entrada", 40), tx(2, null, "saida", 10)]);
  expect(r.unassigned.balance).toBe(30); expect(r.active.balance).toBe(100);
});
const mixedA = [acc("a", 100), acc("b", 50), acc("x", 200, true)];
const mixedT = [tx(1, "a", "entrada", 10), tx(2, "b", "saida", 20), tx(3, "x", "saida", 60), tx(4, null, "entrada", 5)];
test("6 várias contas ativas e arquivadas", () => {
  const r = bd(mixedA, mixedT);
  expect([r.active.balance, r.archived.balance, r.unassigned.balance]).toEqual([140, 140, 5]);
  expect([r.active.accountCount, r.archived.accountCount]).toEqual([2, 1]);
});
test("7 apenas contas arquivadas: saldo ativo zero", () => expect(computeActiveBalance([acc("x", 70, true)], [tx(1, "x", "entrada", 30)])).toBe(0));
test("8 sem contas", () => expect(bd([], [])).toEqual({ active: expect.objectContaining({ balance: 0 }), archived: expect.objectContaining({ balance: 0 }), unassigned: expect.objectContaining({ balance: 0 }), consolidated: 0 }));
test("9 usuário só com movimentações sem conta", () => {
  const r = bd([], [tx(1, null, "entrada", 100), tx(2, null, "saida", 25)]);
  expect(r.unassigned.balance).toBe(75); expect(r.consolidated).toBe(75); expect(r.active.balance).toBe(0);
});
test("10 arquivar preserva valores e apenas move o grupo", () => {
  const t = [tx(1, "a", "entrada", 50), tx(2, "a", "saida", 20)];
  const before = bd([acc("a", 100)], t), after = bd([acc("a", 100, true)], t);
  expect(after.archived.balance).toBe(before.active.balance);
  expect(after.consolidated).toBe(before.consolidated);
  expect(t).toEqual([tx(1, "a", "entrada", 50), tx(2, "a", "saida", 20)]);
});
test("11 sem duplicidade: cada movimentação em um grupo e total = soma", () => {
  const r = bd(mixedA, mixedT);
  expect(r.active.transactionCount + r.archived.transactionCount + r.unassigned.transactionCount).toBe(mixedT.length);
  expect(r.consolidated).toBe(285);
  expect(computeBalance(mixedA, mixedT)).toBe(285);
});
test("11b conta inexistente (excluída) vira sem conta, não some", () => expect(bd([], [tx(1, "gone", "entrada", 9)]).unassigned.balance).toBe(9));
test("12 criar, editar e excluir movimentação", () => {
  const a = [acc("a", 100)];
  let t = [tx(1, "a", "saida", 30)];
  expect(computeActiveBalance(a, t)).toBe(70);
  t = [tx(1, "a", "saida", 45)];
  expect(computeActiveBalance(a, t)).toBe(55);
  t = [];
  expect(computeActiveBalance(a, t)).toBe(100);
});
test("Atlas responde com saldo das ativas e separa o resto", () => {
  const msg = answerFinanceQuery("saldo", { accounts: mixedA, transactions: mixedT, goals: [] });
  expect(msg).toContain("contas ativas é R$\u00a0140,00");
  expect(msg).toContain("arquivadas: R$\u00a0140,00");
  expect(msg).toContain("sem conta: R$\u00a05,00");
});
test("Home mostra o saldo das contas ativas", () => {
  const card = worldCards({ accounts: mixedA, transactions: mixedT, bills: [], objectives: [], steps: [], habits: [], habitLogs: [], tasks: [], events: [], notes: [] }).find((c) => c.key === "financeiro");
  expect(card.primary).toContain("140,00");
});
