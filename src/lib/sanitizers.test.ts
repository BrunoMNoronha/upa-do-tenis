import { describe, expect, it } from "vitest";
import { sanitizeCurrency, toCurrencyInput } from "./sanitizers";

describe("toCurrencyInput", () => {
  it("preserva strings e números sem alteração", () => {
    expect(toCurrencyInput("R$ 1.500,90")).toBe("R$ 1.500,90");
    expect(toCurrencyInput(15.9)).toBe(15.9);
  });

  it("preserva null e undefined (tratados como zero por sanitizeCurrency)", () => {
    expect(toCurrencyInput(null)).toBeNull();
    expect(toCurrencyInput(undefined)).toBeUndefined();
  });

  it("converte outros tipos com String(...), como sanitizeCurrency já fazia", () => {
    expect(toCurrencyInput(true)).toBe("true");
    expect(toCurrencyInput({})).toBe("[object Object]");
  });

  it("mantém o resultado monetário idêntico ao cast anterior", () => {
    const casos: unknown[] = ["R$ 1.500,90", "1.500", "15.90", 15.9, "", null, undefined, true, {}];

    for (const valor of casos) {
      expect(sanitizeCurrency(toCurrencyInput(valor))).toBe(
        // Comportamento pré-existente: o valor era repassado sem conversão.
        sanitizeCurrency(valor as string | number | null | undefined),
      );
    }
  });
});
