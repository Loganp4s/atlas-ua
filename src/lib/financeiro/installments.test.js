import { describe, test, expect } from "bun:test";
const { splitAmount, dueDate, previewPlan, installmentState, summarizeInstallments, validatePlanInput, toCents } = await import("@/lib/financeiro/installments");
const { computeBalanceBreakdown } = await import("@/lib/financeiro/api");

const sumC = (xs) => xs.reduce((s, x) => s + Math.round(x * 100), 0);

describe("distribuição exata", () => {
  test("R$100 em 3", () => expect(splitAmount(100, 3)).toEqual([33.34, 33.33, 33.33]));
  test("R$10 em 3", () => expect(splitAmount(10, 3)).toEqual([3.34, 3.33, 3.33]));
  test("R$1.000 em 6", () => expect(splitAmount(1000, 6)).toEqual([166.67, 166.67, 166.67, 166.67, 166.66, 166.66]));
  test("R$99,99 em 4", () => expect(splitAmount(99.99, 4)).toEqual([25, 25, 25, 24.99]));
  test("soma sempre igual ao total", () => {
    for (const [t, n] of [[0.1, 7], [3000, 10], [1234.56, 72], [0.72, 72]]) expect(sumC(splitAmount(t, n))).toBe(Math.round(t * 100));
  });
  test("inválidos", () => {
    for (const [t, n] of [[0, 3], [-1, 3], [10.001, 2], [NaN, 2], [1e12, 2], [10, 1], [10, 73], [10, 2.5], [0.02, 3]]) expect(() => splitAmount(t, n)).toThrow();
    expect(toCents(10.001)).toBeNull();
  });
});

describe("calendário", () => {
  test("31/jan preserva o dia de referência", () =>
    expect([1, 2, 3, 4, 5].map((n) => dueDate("2027-01-31", n))).toEqual(["2027-01-31", "2027-02-28", "2027-03-31", "2027-04-30", "2027-05-31"]));
  test("fevereiro bissexto", () => expect(dueDate("2028-01-31", 2)).toBe("2028-02-29"));
  test("dia 29 e 30", () => {
    expect(dueDate("2027-01-29", 2)).toBe("2027-02-28");
    expect(dueDate("2027-01-29", 3)).toBe("2027-03-29");
    expect(dueDate("2027-01-30", 2)).toBe("2027-02-28");
    expect(dueDate("2027-01-30", 3)).toBe("2027-03-30");
  });
  test("virada do ano", () => expect(previewPlan(3000, 3, "2026-12-10").map((r) => r.due_date)).toEqual(["2026-12-10", "2027-01-10", "2027-02-10"]));
  test("data inválida", () => { expect(() => dueDate("2027-02-30", 1)).toThrow(); expect(() => dueDate("31/01/2027", 1)).toThrow(); });
});

describe("estado e previsão", () => {
  const inst = (id, due, status = "aberta", amount = 200, paid_at = null) => ({ id, plan_id: "p", number: 1, amount, due_date: due, status, paid_at });
  test("estados derivados", () => {
    expect(installmentState(inst("a", "2026-12-01"), "2026-11-25")).toBe("prevista");
    expect(installmentState(inst("a", "2026-11-25"), "2026-11-25")).toBe("pendente");
    expect(installmentState(inst("a", "2026-11-20"), "2026-11-25")).toBe("atrasada");
    expect(installmentState(inst("a", "2026-11-20", "paga"), "2026-11-25")).toBe("paga");
  });
  test("exemplo do roteiro: saldo 2.000, compromissos 600, projeção 1.400", () => {
    const list = [inst("a", "2026-12-01"), inst("b", "2026-12-10"), inst("c", "2026-12-20")];
    const s = summarizeInstallments([{ id: "p", status: "ativo" }], list, "2026-11-25", 30);
    const bal = computeBalanceBreakdown([{ id: "acc", archived: false, initial_balance: 2000 }], []).active.balance;
    expect([bal, s.commitments, bal - s.commitments]).toEqual([2000, 600, 1400]);
  });
  test("períodos 7/30/90/365 e sem duplicar", () => {
    const list = [inst("a", "2026-11-20"), inst("b", "2026-11-30"), inst("c", "2027-01-15"), inst("d", "2027-10-01"), inst("a", "2026-11-20")];
    const f = (d) => summarizeInstallments([{ id: "p", status: "ativo" }], list, "2026-11-25", d);
    expect([7, 30, 90, 365].map((d) => f(d).upcomingCount)).toEqual([2, 2, 3, 4]);
    expect(f(7).overdue).toBe(200);
    expect(f(365).commitments).toBe(800);
  });
  test("pagas contam no período pago e não como compromisso", () => {
    const s = summarizeInstallments([], [inst("a", "2026-11-01", "paga", 50, "2026-11-10"), inst("b", "2026-11-01", "cancelada")], "2026-11-25", 30);
    expect([s.commitments, s.paidInPeriod, s.upcomingCount]).toEqual([0, 50, 0]);
  });
  test("validação do formulário", () => {
    expect(validatePlanInput({ description: "X", account_id: "a", total_amount: 100, installment_count: 3, first_due_date: "2026-12-10" })).toBeNull();
    expect(validatePlanInput({ description: "X", account_id: "a", total_amount: 100, installment_count: 3, first_due_date: "2026-02-30" })).not.toBeNull();
  });
});
