import { describe, it, expect } from "vitest";
import { formatDateBRL } from "./date";

describe("formatDateBRL", () => {
    it("should format valid date strings", () => {
        const result = formatDateBRL("2023-10-05T14:30:00Z");
        // We match DD/MM/YYYY, HH:MM
        expect(result).toMatch(/^\d{2}\/\d{2}\/\d{4}, \d{2}:\d{2}$/);
    });

    it("should return '-' for empty, null or undefined", () => {
        expect(formatDateBRL(null)).toBe("-");
        expect(formatDateBRL(undefined)).toBe("-");
        expect(formatDateBRL("")).toBe("-");
    });

    it("should return the original string if parsing fails (Invalid Date)", () => {
        expect(formatDateBRL("invalid-date")).toBe("invalid-date");
        expect(formatDateBRL("not a date")).toBe("not a date");
    });
});
