import { describe, expect, it } from "vitest";
import {
  formatarDataCabecalho,
  horaOperacional,
  montarSaudacao,
  primeiroNome,
  saudacaoPorHora,
} from "./dashboard-header";

describe("dashboard-header", () => {
  describe("saudacaoPorHora", () => {
    it("classifica manhã, tarde e noite", () => {
      expect(saudacaoPorHora(5)).toBe("Bom dia");
      expect(saudacaoPorHora(11)).toBe("Bom dia");
      expect(saudacaoPorHora(12)).toBe("Boa tarde");
      expect(saudacaoPorHora(17)).toBe("Boa tarde");
      expect(saudacaoPorHora(18)).toBe("Boa noite");
      expect(saudacaoPorHora(0)).toBe("Boa noite");
      expect(saudacaoPorHora(4)).toBe("Boa noite");
    });
  });

  describe("horaOperacional", () => {
    it("usa o fuso de São Paulo independente do fuso do processo", () => {
      // 2026-09-16T11:30Z = 08:30 em America/Sao_Paulo (UTC-3).
      expect(horaOperacional(new Date("2026-09-16T11:30:00.000Z"))).toBe(8);
      // 2026-09-16T02:00Z = 23:00 do dia anterior em São Paulo.
      expect(horaOperacional(new Date("2026-09-16T02:00:00.000Z"))).toBe(23);
    });
  });

  describe("primeiroNome", () => {
    it("extrai o primeiro nome e ignora espaços extras", () => {
      expect(primeiroNome("  Marcos   Alves ")).toBe("Marcos");
      expect(primeiroNome("Ana")).toBe("Ana");
    });

    it("retorna null sem nome utilizável", () => {
      expect(primeiroNome("")).toBeNull();
      expect(primeiroNome("   ")).toBeNull();
      expect(primeiroNome(null)).toBeNull();
      expect(primeiroNome(undefined)).toBeNull();
    });
  });

  describe("montarSaudacao", () => {
    it("inclui o primeiro nome quando disponível", () => {
      expect(montarSaudacao("Marcos Alves", new Date("2026-09-16T11:30:00.000Z"))).toBe("Bom dia, Marcos");
      expect(montarSaudacao("Marcos Alves", new Date("2026-09-16T18:00:00.000Z"))).toBe("Boa tarde, Marcos");
    });

    it("usa apenas a saudação quando a sessão não fornece nome", () => {
      expect(montarSaudacao(null, new Date("2026-09-16T11:30:00.000Z"))).toBe("Bom dia");
      expect(montarSaudacao("", new Date("2026-09-17T00:30:00.000Z"))).toBe("Boa noite");
    });
  });

  describe("formatarDataCabecalho", () => {
    it("formata por extenso em pt-BR com inicial maiúscula", () => {
      expect(formatarDataCabecalho(new Date("2026-09-16T15:00:00.000Z"))).toBe(
        "Quarta-feira, 16 de setembro de 2026"
      );
    });

    it("respeita o dia civil do fuso operacional", () => {
      // 01:00Z de 17/09 ainda é 16/09 em São Paulo.
      expect(formatarDataCabecalho(new Date("2026-09-17T01:00:00.000Z"))).toContain("16 de setembro");
    });
  });
});
