import { test, expect } from "bun:test";
import { worldCards } from "./derive";
import { todayIso } from "@/lib/financeiro/format";
import { addDays } from "@/lib/financeiro/installments";

const today = todayIso();
const item = (id, days, amount) => ({ id, plan_id: "p", number: 1, amount, due_date: addDays(today, days), status: "aberta" });
const data = (installments) => ({
  accounts: [{ id: "a", initial_balance: 2000, archived: false }], transactions: [], transfers: [], bills: [],
  installmentPlans: [{ id: "p", status: "ativo" }], installments,
  tasks: [], events: [], habits: [], habitLogs: [], objectives: [], steps: [], notes: [],
});
const money = (s) => Array.from(s.matchAll(/R\$\s*([\d.]+,\d{2})/g), (m) => Number(m[1].replaceAll(".", "").replace(",", ".")));

test("Home separa próximos 30 dias de atrasos, preservando saldo", () => {
  const card = worldCards(data([item("late", -60, 100), item("soon", 10, 200), item("later", 31, 300)])).find((c) => c.key === "financeiro");
  expect(money(card.primary)).toEqual([2000]);
  expect(money(card.secondary)).toEqual([200, 100]);
});
test("Home mostra compromissos quando só há parcelas atrasadas", () => {
  const card = worldCards(data([item("late", -60, 100)])).find((c) => c.key === "financeiro");
  expect(money(card.primary)).toEqual([2000]);
  expect(money(card.secondary)).toEqual([100]);
});