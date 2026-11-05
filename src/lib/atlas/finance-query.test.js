import { test, expect } from "bun:test";
import { answerFinanceQuery, matchAccounts } from "./finance-query";

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
