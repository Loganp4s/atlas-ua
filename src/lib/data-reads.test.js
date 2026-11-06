import { test, expect, mock } from "bun:test";

// Simulate owner RLS at the Data API boundary; no production data or credentials.
const calls = [];
let owner = "owner-a";
const records = Array.from({ length: 1105 }, (_, index) => ({
  id: String(index).padStart(5, "0"), user_id: "owner-a",
  objective_id: "objective-a", goal_id: "goal-a", created_at: "2026-01-01",
  updated_at: "2026-01-01", tx_date: "2026-01-01", due_date: null,
  due_time: null, start_time: null, event_date: "2026-01-01",
  contribution_date: "2026-01-01", log_date: "2026-01-01",
  position: 0, done: false, pinned: false, initial_balance: 0,
  type: "entrada", amount: 1,
}));
records.push({ ...records[0], id: "other", user_id: "owner-b" });
records.push({ ...records[0], id: "other-parent", objective_id: "objective-b", goal_id: "goal-b" });

mock.module("@/integrations/supabase/client", () => ({ supabase: {
  from(table) {
    let count;
    const orders = [];
    const filters = [];
    const query = {
      select(_columns, options) { count = options?.count; return query; },
      eq(column, value) { filters.push([column, value]); return query; },
      order(column, options) { orders.push([column, options]); return query; },
      async range(from, to) {
        calls.push({ table, orders, filters, from, to });
        const rows = records.filter((row) => row.user_id === owner && filters.every(([key, value]) => row[key] === value))
          .sort((a, b) => {
            for (const [key, { ascending, nullsFirst = !ascending }] of orders) {
              if (a[key] === b[key]) continue;
              if (a[key] == null) return nullsFirst ? -1 : 1;
              if (b[key] == null) return nullsFirst ? 1 : -1;
              return (a[key] < b[key] ? -1 : 1) * (ascending ? 1 : -1);
            }
            return 0;
          });
        return { data: rows.slice(from, to + 1), error: null, count: count ? rows.length : null };
      },
    };
    return query;
  },
} }));

const fin = await import("./financeiro/api");
const obj = await import("./objetivos/api");
const rotina = await import("./rotina/api");
const perfil = await import("./perfil/api");
const readers = [
  [fin.listAccounts, "fin_accounts", "created_at"],
  [fin.listTransactions, "fin_transactions", "tx_date"],
  [fin.listGoals, "fin_goals", "created_at"],
  [() => fin.listGoalContributions("goal-a"), "fin_goal_contributions", "contribution_date", ["goal_id", "goal-a"]],
  [fin.listBills, "fin_bills", "due_date"],
  [obj.listObjectives, "obj_objectives", "created_at"],
  [() => obj.listSteps("objective-a"), "obj_steps", "position", ["objective_id", "objective-a"]],
  [obj.listAllSteps, "obj_steps", "position"],
  [() => obj.listHistory("objective-a"), "obj_history", "created_at", ["objective_id", "objective-a"]],
  [rotina.listTasks, "rotina_tasks", "done"],
  [rotina.listEvents, "rotina_events", "event_date"],
  [rotina.listHabits, "rotina_habits", "created_at"],
  [rotina.listHabitLogs, "rotina_habit_logs", "log_date"],
  [rotina.listNotes, "rotina_notes", "pinned"],
  [perfil.listMemories, "atlas_memories", "created_at"],
];

for (const [read, table, primary, filter] of readers) {
  test(`${table}/${read.name}: complete stable pages preserve scope and prior ordering`, async () => {
    owner = "owner-a";
    calls.length = 0;
    const rows = await read();
    const expected = records.filter((row) => row.user_id === owner && (!filter || row[filter[0]] === filter[1])).sort((a, b) => a.id.localeCompare(b.id));
    expect(rows.map((row) => row.id)).toEqual(expected.map((row) => row.id));
    expect(new Set(rows.map((row) => row.id)).size).toBe(expected.length);
    expect(calls.map(({ from, to }) => [from, to])).toEqual([[0, 999], [1000, 1999]]);
    for (const call of calls) {
      expect(call.table).toBe(table);
      expect(call.orders[0][0]).toBe(primary);
      expect(call.orders.at(-1)).toEqual(["id", { ascending: true }]);
      expect(call.filters).toEqual(filter ? [filter] : []);
    }
    owner = "owner-b";
    expect((await read()).map((row) => row.id)).toEqual(["other"]);
    owner = "no-rows";
    expect(await read()).toEqual([]);
  });
}

test("balance retains financial transactions beyond the first page", async () => {
  owner = "owner-a";
  const transactions = await fin.listTransactions();
  expect(fin.computeBalance([], transactions)).toBe(1106);
});

test("objective progress includes steps beyond the first page", async () => {
  owner = "owner-a";
  const steps = await obj.listSteps("objective-a");
  const { computeProgress } = await import("./objetivos/meta");
  const marked = steps.map((step, index) => ({ ...step, done: index >= 1000 }));
  expect(computeProgress(0, marked)).toBe(10);
});