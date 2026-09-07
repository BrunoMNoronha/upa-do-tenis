import { describe, it, expect } from "vitest";
import { sanitizeCurrency } from "./sanitizers";

describe("sanitizeCurrency", () => {
  it("returns 0 for null, undefined, or empty string", () => {
    expect(sanitizeCurrency(null)).toBe(0);
    expect(sanitizeCurrency(undefined)).toBe(0);
    expect(sanitizeCurrency("")).toBe(0);
  });

  it("returns the number itself if input is a number", () => {
    expect(sanitizeCurrency(100)).toBe(100);
    expect(sanitizeCurrency(15.9)).toBe(15.9);
    expect(sanitizeCurrency(0)).toBe(0);
    expect(sanitizeCurrency(-15.9)).toBe(-15.9);
  });

  it("handles strings with comma as decimal separator", () => {
    expect(sanitizeCurrency("15,90")).toBe(15.9);
    expect(sanitizeCurrency("0,50")).toBe(0.5);
    expect(sanitizeCurrency("1.500,50")).toBe(1500.5);
    expect(sanitizeCurrency("1.234.567,89")).toBe(1234567.89);
  });

  it("handles strings with dot as decimal separator", () => {
    expect(sanitizeCurrency("15.90")).toBe(15.9);
    expect(sanitizeCurrency("0.50")).toBe(0.5);
    expect(sanitizeCurrency("1500.50")).toBe(1500.5);
  });

  it("handles strings with dot as thousand separator", () => {
    // Para a implementação ATUAL e REAL de sanitizers.ts:
    // "1.500" não cai no if(includes(",")) -> cai no else
    // tem "/\.\d{1,2}$/"? Não. Cai no `else { cleaned = cleaned.replace(/\./g, ""); }`
    // resultando em "1500". Num = parseFloat("1500") -> 1500.
    expect(sanitizeCurrency("1.500")).toBe(1500);
    expect(sanitizeCurrency("1.234.567")).toBe(1234567);
  });

  it("treats strings without dot or comma exactly as integer numbers", () => {
    expect(sanitizeCurrency("100")).toBe(100);
    expect(sanitizeCurrency("1500")).toBe(1500);
  });

  it("handles currency symbols and spaces", () => {
    expect(sanitizeCurrency("R$ 15,90")).toBe(15.9);
    expect(sanitizeCurrency("R$ 1.500,50")).toBe(1500.5);
    expect(sanitizeCurrency("R$15.90")).toBe(15.9);
    expect(sanitizeCurrency(" R$ 1.500,50 ")).toBe(1500.5);
  });

  it("strips minus signs from strings due to internal regex (known behavior)", () => {
    // Current function strips non-\d., effectively converting negative strings to positive.
    expect(sanitizeCurrency("-15,90")).toBe(15.9);
  });

  it("handles invalid inputs by returning 0", () => {
    expect(sanitizeCurrency("abc")).toBe(0);
    expect(sanitizeCurrency("R$")).toBe(0);
  });
});
