import { describe, expect, test } from "bun:test";
import { parseContributionAmount as p } from "./contribution";

describe("valor do aporte", () => {
  test("aceita R$ 100,00 e centavos", () => {
    expect(p("100")).toBe(100);
    expect(p("10.50")).toBe(10.5);
    expect(p("10,5")).toBe(10.5);
  });
  test("bloqueia vazio, zero, negativo, inválido e mais de 2 casas", () => {
    for (const v of ["", "  ", "0", "0.00", "-5", "abc", "1e3", "1.005"]) expect(p(v)).toBeNull();
  });
});
