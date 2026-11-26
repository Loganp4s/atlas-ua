import { test, expect } from "bun:test";
import { answerFinanceQuery, matchAccounts } from "./finance-query";
import { formatDateBR } from "@/lib/financeiro/format";

const now = new Date(2026, 9, 23, 12);
const acc = (id, name, initial = 0) => ({ id, name, initial_balance: initial, archived: false });
const tx = (account_id, type, amount, tx_date = "2026-10-10", category = null) => ({ account_id, type, amount, tx_date, category });
const data = {
  accounts: [acc("a", "Nubank", 100), acc("b", "PicPay", 0)],
  transactions: [tx("a", "saida", 30, "2026-10-05", "Alimentação"), tx("b", "entrada", 200), tx("a", "saida", 50, "2026-09-01")],
  goals: [{ name: "Moto", target_amount: 2000, current_amount: 500 }],
};

test("saldo usa contas e movimentações registradas", () => expect(answerFinanceQuery("saldo", data, now)).toContain("220,00"));
test("gastos do mês só contam o mês atual", () => expect(answerFinanceQuery("gastos_mes", data, now)).toContain("30,00"));
test("entradas do mês", () => expect(answerFinanceQuery("entradas_mes", data, now)).toContain("200,00"));
test("conta com mais dinheiro", () => expect(answerFinanceQuery("conta_maior", data, now)).toContain("PicPay"));
test("quanto falta para a meta", () => expect(answerFinanceQuery("meta", data, now)).toContain("1.500,00"));
test("sem dados não inventa saldo", () => expect(answerFinanceQuery("saldo", { accounts: [], transactions: [], goals: [] }, now)).toContain("ainda não"));
test("conta citada é identificada pelo nome", () => expect(matchAccounts("Recebi R$ 150 no PicPay", data.accounts).map((a) => a.id)).toEqual(["b"]));
test("sem conta citada não escolhe nenhuma", () => expect(matchAccounts("Recebi R$ 150", data.accounts)).toEqual([]));

const parcel = (id, due_date, amount, status = "aberta") => ({ id, plan_id: "p", number: 1, due_date, amount, status });
const parcelData = (installments) => ({ ...data, installmentPlans: [{ id: "p", status: "ativo" }], installments });
const monetaryValues = (answer) => Array.from(answer.matchAll(/R\$\s*([\d.]+,\d{2})/g), (m) => Number(m[1].replaceAll(".", "").replace(",", ".")));
const dates = (answer) => answer.match(/\d{2} de [a-z]{3}\./g) ?? [];

test("consulta separa próximos 30 dias, total aberto e atraso; próximo não é vencido", () => {
  const answer = answerFinanceQuery("parcelas", parcelData([parcel("late", "2026-08-24", 100), parcel("soon", "2026-11-02", 200)]), now);
  expect(monetaryValues(answer)).toEqual([200, 300, 100, 200]);
  expect(dates(answer)).toEqual([formatDateBR("2026-11-02")]);
});
test("consulta só com atrasadas preserva total em aberto e não inventa próximo vencimento", () => {
  const answer = answerFinanceQuery("parcelas", parcelData([parcel("late", "2026-08-24", 100)]), now);
  expect(monetaryValues(answer)).toEqual([0, 100, 100]);
  expect(dates(answer)).toEqual([]);
});
test("consulta inclui hoje e exclui pagas/canceladas", () => {
  const answer = answerFinanceQuery("parcelas", parcelData([parcel("today", "2026-10-23", 50), parcel("paid", "2026-10-24", 200, "paga"), parcel("cancel", "2026-10-24", 300, "cancelada")]), now);
  expect(monetaryValues(answer)).toEqual([50, 50, 50]);
  expect(dates(answer)).toEqual([formatDateBR("2026-10-23")]);
});
