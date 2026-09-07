import { describe, expect, it } from "vitest";
import { formatPhone } from "./formatters";

describe("formatPhone", () => {
  it("should return an empty string for null or undefined", () => {
    expect(formatPhone(null)).toBe("");
    expect(formatPhone(undefined)).toBe("");
  });

  it("should return an empty string for an empty string", () => {
    expect(formatPhone("")).toBe("");
  });

  it("should format an 11-digit phone number correctly", () => {
    expect(formatPhone("11987654321")).toBe("(11) 98765-4321");
  });

  it("should format a 10-digit phone number correctly", () => {
    expect(formatPhone("1187654321")).toBe("(11) 8765-4321");
  });

  it("should return the original string if it does not have 10 or 11 digits", () => {
    expect(formatPhone("12345")).toBe("12345");
    expect(formatPhone("119876543210")).toBe("119876543210");
  });

  it("should correctly handle non-digit characters in the input", () => {
    expect(formatPhone("11-98765-4321")).toBe("(11) 98765-4321");
    expect(formatPhone("(11) 8765-4321")).toBe("(11) 8765-4321");
    expect(formatPhone("11a8765b4321")).toBe("(11) 8765-4321");
  });
});
