import { describe, expect, it } from "vitest";
import { parseDataLocal, inicioDoDia, inicioDoDiaSeguinte, formatarDataLocal } from "./date-range";

describe("date-range", () => {
  describe("parseDataLocal", () => {
    it("interpreta YYYY-MM-DD como meia-noite local (não UTC)", () => {
      const data = parseDataLocal("2026-07-04");

      expect(data.getFullYear()).toBe(2026);
      expect(data.getMonth()).toBe(6);
      expect(data.getDate()).toBe(4);
      expect(data.getHours()).toBe(0);
      expect(data.getMinutes()).toBe(0);
    });

    it("mantém parsing padrão para strings com horário", () => {
      const data = parseDataLocal("2026-07-04T15:30:00.000Z");

      expect(data.getTime()).toBe(new Date("2026-07-04T15:30:00.000Z").getTime());
    });

    it("retorna Date inválida para string inválida", () => {
      expect(isNaN(parseDataLocal("xxx").getTime())).toBe(true);
    });
  });

  describe("inicioDoDia", () => {
    it("zera horário mantendo o dia local", () => {
      const resultado = inicioDoDia(new Date(2026, 6, 4, 18, 45, 30));

      expect(resultado.getFullYear()).toBe(2026);
      expect(resultado.getMonth()).toBe(6);
      expect(resultado.getDate()).toBe(4);
      expect(resultado.getHours()).toBe(0);
    });

    it("não muta a data original", () => {
      const original = new Date(2026, 6, 4, 18, 45);
      inicioDoDia(original);
      expect(original.getHours()).toBe(18);
    });
  });

  describe("inicioDoDiaSeguinte", () => {
    it("retorna meia-noite local do dia seguinte", () => {
      const resultado = inicioDoDiaSeguinte(new Date(2026, 6, 4, 18, 45));

      expect(resultado.getDate()).toBe(5);
      expect(resultado.getMonth()).toBe(6);
      expect(resultado.getHours()).toBe(0);
    });

    it("vira mês e ano corretamente", () => {
      const resultado = inicioDoDiaSeguinte(new Date(2026, 11, 31, 10, 0));

      expect(resultado.getFullYear()).toBe(2027);
      expect(resultado.getMonth()).toBe(0);
      expect(resultado.getDate()).toBe(1);
    });
  });

  describe("formatarDataLocal", () => {
    it("formata usando componentes locais, sem deslocar para UTC", () => {
      const data = new Date(2026, 6, 4, 23, 59, 59);

      expect(formatarDataLocal(data)).toBe("2026-07-04");
    });

    it("preenche mês e dia com zero à esquerda", () => {
      const data = new Date(2026, 0, 5);

      expect(formatarDataLocal(data)).toBe("2026-01-05");
    });
  });

  describe("intervalo semiaberto com data final igual a hoje", () => {
    it("inclui registro criado agora quando o filtro termina hoje", () => {
      const agora = new Date();
      const hojeStr = `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`;

      const inicio = inicioDoDia(parseDataLocal(hojeStr));
      const fimExclusivo = inicioDoDiaSeguinte(parseDataLocal(hojeStr));

      expect(agora.getTime()).toBeGreaterThanOrEqual(inicio.getTime());
      expect(agora.getTime()).toBeLessThan(fimExclusivo.getTime());
    });
  });
});
