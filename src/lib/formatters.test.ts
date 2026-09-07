import { describe, it, expect } from "vitest";
import { maskCurrency } from "./formatters";

describe("maskCurrency", () => {
  it("should return empty string for null", () => {
    expect(maskCurrency(null)).toBe("");
  });

  it("should return empty string for undefined", () => {
    expect(maskCurrency(undefined)).toBe("");
  });

  it("should return empty string for empty string", () => {
    expect(maskCurrency("")).toBe("");
  });

  it("should return empty string when there are no digits", () => {
    expect(maskCurrency("abc")).toBe("");
  });

  it("should format single digit as cents", () => {
    expect(maskCurrency("1")).toBe("R$\xa00,01");
  });

  it("should format double digits as cents", () => {
    expect(maskCurrency("15")).toBe("R$\xa00,15");
  });

  it("should format 3 digits correctly", () => {
    expect(maskCurrency("150")).toBe("R$\xa01,50");
  });

  it("should format 4 digits correctly", () => {
    expect(maskCurrency("1505")).toBe("R$\xa015,05");
  });

  it("should format large amounts", () => {
    expect(maskCurrency("15050")).toBe("R$\xa0150,50");
  });

  it("should ignore non-digit characters", () => {
    expect(maskCurrency("1a5b0c5d0")).toBe("R$\xa0150,50");
  });

  it("should limit to 10 digits", () => {
    expect(maskCurrency("1234567890123")).toBe("R$\xa012.345.678,90");
  });
});
