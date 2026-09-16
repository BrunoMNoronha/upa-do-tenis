import { describe, expect, it } from "vitest";
import { calcularPeriodoPreset, identificarPreset, PRESETS_PERIODO } from "./dashboard-period-presets";

// Quarta-feira, 16/09/2026 às 18:45 local.
const referencia = new Date(2026, 8, 16, 18, 45);

describe("dashboard-period-presets", () => {
  describe("calcularPeriodoPreset", () => {
    it("hoje → mesmo dia no início e no fim", () => {
      expect(calcularPeriodoPreset("hoje", referencia)).toEqual({ inicio: "2026-09-16", fim: "2026-09-16" });
    });

    it("7 dias → sete dias corridos incluindo hoje", () => {
      expect(calcularPeriodoPreset("7dias", referencia)).toEqual({ inicio: "2026-09-10", fim: "2026-09-16" });
    });

    it("7 dias atravessa a virada de mês em dias locais", () => {
      expect(calcularPeriodoPreset("7dias", new Date(2026, 9, 3))).toEqual({ inicio: "2026-09-27", fim: "2026-10-03" });
    });

    it("este mês → do dia 1 até hoje", () => {
      expect(calcularPeriodoPreset("esteMes", referencia)).toEqual({ inicio: "2026-09-01", fim: "2026-09-16" });
    });

    it("mês anterior → mês civil completo", () => {
      expect(calcularPeriodoPreset("mesAnterior", referencia)).toEqual({ inicio: "2026-08-01", fim: "2026-08-31" });
    });

    it("mês anterior em janeiro volta para dezembro do ano anterior", () => {
      expect(calcularPeriodoPreset("mesAnterior", new Date(2027, 0, 10))).toEqual({
        inicio: "2026-12-01",
        fim: "2026-12-31",
      });
    });

    it("mês anterior em março respeita fevereiro (28/29 dias)", () => {
      expect(calcularPeriodoPreset("mesAnterior", new Date(2028, 2, 5)).fim).toBe("2028-02-29");
      expect(calcularPeriodoPreset("mesAnterior", new Date(2026, 2, 5)).fim).toBe("2026-02-28");
    });

    it("usa o dia local perto da virada do dia (não UTC)", () => {
      // 23:30 local: o dia continua sendo 16/09 mesmo que em UTC já seja 17/09.
      const tarde = new Date(2026, 8, 16, 23, 30);
      expect(calcularPeriodoPreset("hoje", tarde).fim).toBe("2026-09-16");
    });
  });

  describe("identificarPreset", () => {
    it("reconhece cada preset pelo intervalo exato", () => {
      for (const { id } of PRESETS_PERIODO) {
        expect(identificarPreset(calcularPeriodoPreset(id, referencia), referencia)).toBe(id);
      }
    });

    it("qualquer outro intervalo é personalizado", () => {
      expect(identificarPreset({ inicio: "2026-09-02", fim: "2026-09-16" }, referencia)).toBe("personalizado");
      expect(identificarPreset({ inicio: "2026-09-01", fim: "2026-09-15" }, referencia)).toBe("personalizado");
      expect(identificarPreset({ inicio: "", fim: "" }, referencia)).toBe("personalizado");
    });
  });
});
