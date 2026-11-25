import { test, expect } from "bun:test";
import { preparePending, readPending, clearPending, markPendingConflict, pendingKey } from "./pending-contribution";

function storage() {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v), removeItem: (k) => map.delete(k) };
}
const prepare = (s, amount = 10, id = "request-a", goal = "goal-a", user = "user-a") =>
  preparePending(s, user, goal, amount, "2026-11-25", id);

test("uma nova tentativa persiste antes do envio", () => {
  const s = storage(); const p = prepare(s);
  expect(readPending(s, "user-a", "goal-a")).toEqual(p);
});
test("perda de resposta e reload preservam chave e data, sem expiração", () => {
  const s = storage(); prepare(s);
  const p = preparePending(s, "user-a", "goal-a", 10, "2027-01-01", "new-key");
  expect(p.requestId).toBe("request-a"); expect(p.date).toBe("2026-11-25");
});
test("uma tentativa pendente não gera sequer uma chave substituta", () => {
  const s = storage(); prepare(s); let calls = 0;
  const p = preparePending(s, "user-a", "goal-a", 10, "2026-11-26", () => { calls++; return "replacement"; });
  expect(calls).toBe(0); expect(p.requestId).toBe("request-a");
});
test("novo valor não substitui uma operação pendente", () => {
  const s = storage(); prepare(s);
  expect(() => prepare(s, 20, "new-key")).toThrow();
  expect(readPending(s, "user-a", "goal-a").amount).toBe(10);
});
test("sucesso limpa somente a tentativa correspondente", () => {
  const s = storage(); const a = prepare(s); prepare(s, 20, "request-b", "goal-b");
  expect(clearPending(s, { ...a, requestId: "stale-key" })).toBe(false);
  expect(clearPending(s, a)).toBe(true);
  expect(readPending(s, "user-a", "goal-b").requestId).toBe("request-b");
});
test("tentativas são isoladas por usuário e meta", () => {
  const s = storage(); prepare(s); prepare(s, 20, "request-b", "goal-a", "user-b");
  expect(readPending(s, "user-a", "goal-a").amount).toBe(10);
  expect(readPending(s, "user-b", "goal-a").amount).toBe(20);
  expect(readPending(s, "user-a", "goal-b")).toBeNull();
});
test("conflito confirmado é preservado e bloqueia novos envios", () => {
  const s = storage(); const p = prepare(s); markPendingConflict(s, p);
  expect(() => prepare(s)).toThrow("Conflito confirmado");
  expect(readPending(s, "user-a", "goal-a").conflict).toBe(true);
});
test("armazenamento indisponível não permite nova operação", () => {
  const s = storage(); s.setItem = () => { throw new Error("quota"); };
  expect(() => prepare(s)).toThrow("quota");
});
test("dados locais inválidos não são sobrescritos", () => {
  const s = storage(); s.setItem(pendingKey("user-a", "goal-a"), "{}");
  expect(() => prepare(s)).toThrow();
  expect(s.getItem(pendingKey("user-a", "goal-a"))).toBe("{}");
});
test("confirmar uma tentativa antiga não apaga outra chave", () => {
  const s = storage(); const old = prepare(s); clearPending(s, old); const next = prepare(s, 10, "next");
  expect(clearPending(s, old)).toBe(false);
  expect(readPending(s, "user-a", "goal-a")).toEqual(next);
});