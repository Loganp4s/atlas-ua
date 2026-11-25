import { test, expect } from "bun:test";
const { computeBalanceBreakdown, computeBalance, computeActiveBalance } = await import("@/lib/financeiro/api");
const { accountBalance } = await import("@/lib/atlas/finance-query");
const { validateTransfer, preparePendingTransfer, readPendingTransfer, clearPendingTransfer, markPendingTransferConflict } =
  await import("@/lib/financeiro/pending-transfer");

const acc = (id, initial, archived = false) => ({ id, user_id: "u", name: id, type: "corrente", initial_balance: initial, color: "", icon: "", archived, created_at: "", updated_at: "" });
const tr = (src, dst, amount) => ({ id: `${src}-${dst}-${amount}`, user_id: "u", source_account_id: src, destination_account_id: dst, amount, transfer_date: "2026-11-25", description: null, client_request_id: null, created_at: "" });
const accounts = [acc("pic", 100), acc("nu", 200)];

test("exemplo do roteiro: PicPay 100, Nubank 200, transferir 50", () => {
  const t = [tr("pic", "nu", 50)];
  expect(accountBalance(accounts[0], [], t)).toBe(50);
  expect(accountBalance(accounts[1], [], t)).toBe(250);
  expect(computeBalance(accounts, [], t)).toBe(300);
  expect(computeActiveBalance(accounts, [], t)).toBe(300);
});
test("transferência não altera receitas nem despesas", () => {
  const bd = computeBalanceBreakdown(accounts, [], [tr("pic", "nu", 50)]);
  expect(bd.active.entradas).toBe(0);
  expect(bd.active.saidas).toBe(0);
});
test("transferência de conta arquivada para ativa move o saldo entre grupos sem mudar o total", () => {
  const a = [acc("old", 80, true), acc("nu", 200)];
  const bd = computeBalanceBreakdown(a, [], [tr("old", "nu", 30)]);
  expect(bd.archived.balance).toBe(50);
  expect(bd.active.balance).toBe(230);
  expect(bd.consolidated).toBe(280);
});
test("sem transferências, o cálculo anterior é idêntico", () => {
  const tx = [{ id: "1", account_id: "pic", type: "entrada", amount: 10, tx_date: "2026-11-01" }];
  expect(computeBalanceBreakdown(accounts, tx)).toEqual(computeBalanceBreakdown(accounts, tx, []));
  expect(computeBalance(accounts, tx)).toBe(310);
});
test("validação do formulário", () => {
  const ok = { source_account_id: "a", destination_account_id: "b", amount: 10.5, transfer_date: "2026-11-25" };
  expect(validateTransfer(ok)).toBeNull();
  expect(validateTransfer({ ...ok, destination_account_id: "a" })).toMatch(/diferentes/);
  for (const amount of [0, -1, 1.234, NaN]) expect(validateTransfer({ ...ok, amount })).toMatch(/valor/);
  expect(validateTransfer({ ...ok, source_account_id: "" })).toMatch(/origem/);
});
test("tentativa pendente sobrevive a reload, reutiliza a chave e bloqueia dados diferentes", () => {
  const mem = new Map();
  const s = { getItem: (k) => mem.get(k) ?? null, setItem: (k, v) => mem.set(k, v), removeItem: (k) => mem.delete(k) };
  const input = { source_account_id: "a", destination_account_id: "b", amount: 50, transfer_date: "2026-11-25", description: null };
  const p = preparePendingTransfer(s, "u1", input, "k1");
  expect(readPendingTransfer(s, "u1").requestId).toBe("k1");
  expect(preparePendingTransfer(s, "u1", input, "k2").requestId).toBe("k1");
  expect(() => preparePendingTransfer(s, "u1", { ...input, amount: 51 }, "k3")).toThrow(/pendente/);
  expect(readPendingTransfer(s, "u2")).toBeNull();
  markPendingTransferConflict(s, p);
  expect(() => preparePendingTransfer(s, "u1", input, "k4")).toThrow(/Conflito/);
  expect(clearPendingTransfer(s, p)).toBe(true);
  expect(readPendingTransfer(s, "u1")).toBeNull();
});
