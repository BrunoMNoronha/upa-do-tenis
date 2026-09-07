import { describe, it, expect } from "vitest";
import {
  sanitizePhone,
  sanitizeCPFCNPJ,
  sanitizeCEP,
  sanitizeCurrency,
  sanitizeText,
  sanitizeEmail,
} from "./sanitizers";

describe("Sanitizers", () => {
  describe("sanitizePhone", () => {
    it("should return empty string for null/undefined/empty", () => {
      expect(sanitizePhone(null)).toBe("");
      expect(sanitizePhone(undefined)).toBe("");
      expect(sanitizePhone("")).toBe("");
    });
    it("should remove non-numeric characters", () => {
      expect(sanitizePhone("(11) 98765-4321")).toBe("11987654321");
      expect(sanitizePhone("+55 (11) 98765-4321")).toBe("5511987654321");
    });
  });

  describe("sanitizeCPFCNPJ", () => {
    it("should return empty string for null/undefined/empty", () => {
      expect(sanitizeCPFCNPJ(null)).toBe("");
      expect(sanitizeCPFCNPJ(undefined)).toBe("");
      expect(sanitizeCPFCNPJ("")).toBe("");
    });
    it("should remove non-numeric characters", () => {
      expect(sanitizeCPFCNPJ("123.456.789-00")).toBe("12345678900");
      expect(sanitizeCPFCNPJ("12.345.678/0001-99")).toBe("12345678000199");
    });
  });

  describe("sanitizeCEP", () => {
    it("should return empty string for null/undefined/empty", () => {
      expect(sanitizeCEP(null)).toBe("");
      expect(sanitizeCEP(undefined)).toBe("");
      expect(sanitizeCEP("")).toBe("");
    });
    it("should remove non-numeric characters", () => {
      expect(sanitizeCEP("12345-678")).toBe("12345678");
    });
  });

  describe("sanitizeCurrency", () => {
    it("should return 0 for null/undefined/empty", () => {
      expect(sanitizeCurrency(null)).toBe(0);
      expect(sanitizeCurrency(undefined)).toBe(0);
      expect(sanitizeCurrency("")).toBe(0);
    });
    it("should return the number if input is already a number", () => {
      expect(sanitizeCurrency(15.9)).toBe(15.9);
      expect(sanitizeCurrency(0)).toBe(0);
    });
    it("should handle formatting with R$, spaces and thousands separators", () => {
      expect(sanitizeCurrency("R$ 1.500,90")).toBe(1500.9);
      expect(sanitizeCurrency(" 15,90 ")).toBe(15.9);
      expect(sanitizeCurrency("1.500")).toBe(1500);
      expect(sanitizeCurrency("15.90")).toBe(15.9);
      expect(sanitizeCurrency("R$1.234.567,89")).toBe(1234567.89);
    });
    it("should return 0 for invalid parsed inputs", () => {
      expect(sanitizeCurrency("abc")).toBe(0);
    });
  });

  describe("sanitizeText", () => {
    it("should return empty string for null/undefined/empty", () => {
      expect(sanitizeText(null)).toBe("");
      expect(sanitizeText(undefined)).toBe("");
      expect(sanitizeText("")).toBe("");
    });
    it("should trim and replace multiple spaces with a single space", () => {
      expect(sanitizeText("  Hello   World  ")).toBe("Hello World");
      expect(sanitizeText("One\nTwo")).toBe("One Two"); // \s+ includes newlines, replaces with space
      expect(sanitizeText("One\t\tTwo")).toBe("One Two");
    });
  });

  describe("sanitizeEmail", () => {
    it("should return empty string for null/undefined/empty", () => {
      expect(sanitizeEmail(null)).toBe("");
      expect(sanitizeEmail(undefined)).toBe("");
      expect(sanitizeEmail("")).toBe("");
    });
    it("should trim and lowercase the email", () => {
      expect(sanitizeEmail("  TEST@Example.COM  ")).toBe("test@example.com");
    });
  });
});
