import { test, expect } from "bun:test";
import { readAllPages } from "./read-all-pages";

function source(rows, cap = 1000, counted = true) {
  const calls = [];
  const query = (count) => ({ range: async (from, to) => {
    calls.push({ from, to, count });
    return { data: rows.slice(from, Math.min(to + 1, from + cap)), error: null, count: counted && count ? rows.length : null };
  } });
  return { query, calls };
}

test("first page and later pages retain all 2505 ordered rows exactly once", async () => {
  const rows = Array.from({ length: 2505 }, (_, id) => ({ id }));
  const s = source(rows);
  expect(await readAllPages(s.query)).toEqual(rows);
  expect(s.calls.map(({ from, to }) => [from, to])).toEqual([[0, 999], [1000, 1999], [2000, 2999]]);
  expect(s.calls.map(({ count }) => count)).toEqual(["exact", undefined, undefined]);
});

test("a server cap below 1000 never truncates the full read", async () => {
  const rows = Array.from({ length: 1201 }, (_, id) => ({ id }));
  const s = source(rows, 300);
  expect(await readAllPages(s.query)).toEqual(rows);
  expect(s.calls.map(({ from }) => from)).toEqual([0, 300, 600, 900, 1200]);
});

test("exact multiples do not need a redundant final request with a count", async () => {
  const s = source(Array.from({ length: 2000 }, (_, id) => ({ id })));
  expect((await readAllPages(s.query)).length).toBe(2000);
  expect(s.calls.length).toBe(2);
});

test("without count even short pages continue until empty", async () => {
  const rows = Array.from({ length: 9 }, (_, id) => ({ id }));
  const s = source(rows, 4, false);
  expect(await readAllPages(s.query)).toEqual(rows);
  expect(s.calls.map(({ from }) => from)).toEqual([0, 4, 8, 9]);
});

test("empty collection returns an empty array", async () => {
  const s = source([]);
  expect(await readAllPages(s.query)).toEqual([]);
  expect(s.calls.length).toBe(1);
});

test("later page failure rejects rather than returning a partial collection", async () => {
  const failure = new Error("offline");
  const query = () => ({ range: async (from) => from === 0
    ? { data: Array.from({ length: 1000 }, (_, id) => ({ id })), count: 1001, error: null }
    : { data: null, count: null, error: failure } });
  await expect(readAllPages(query)).rejects.toThrow("offline");
});

test("unexpected empty page before counted total is an error", async () => {
  await expect(readAllPages(() => ({ range: async () => ({ data: [], count: 1, error: null }) }))).rejects.toThrow("Os dados mudaram");
});