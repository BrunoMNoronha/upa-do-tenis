import { describe, expect, it } from "vitest";
import {
  parseDataLocal,
  inicioDoDia,
  inicioDoDiaSeguinte,
  formatarDataLocal,
  calcularIntervaloPreset,
} from "./date-range";

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

  describe("regressão: filtro do Histórico do Caixa não desloca dia em UTC-3", () => {
    it("data local perto de 23:59 não vira o dia seguinte ao ser serializada", () => {
      const quaseMeiaNoite = new Date(2026, 6, 4, 23, 59, 0);

      expect(formatarDataLocal(quaseMeiaNoite)).toBe("2026-07-04");
    });

    it("'Hoje' envia a data local correta, diferente de toISOString em fusos negativos", () => {
      const agora = new Date();
      const offsetNegativo = agora.getTimezoneOffset() > 0;

      if (offsetNegativo) {
        const proximoDaMeiaNoite = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 23, 30, 0);
        expect(formatarDataLocal(proximoDaMeiaNoite)).not.toBe(
          proximoDaMeiaNoite.toISOString().split("T")[0]
        );
      }

      expect(formatarDataLocal(agora)).toBe(
        `${agora.getFullYear()}-${String(agora.getMonth() + 1).padStart(2, "0")}-${String(agora.getDate()).padStart(2, "0")}`
      );
    });
  });

  describe("regressão: filtros padrão dos relatórios financeiro e estoque não deslocam dia em UTC-3", () => {
    it("relatório financeiro: 'fim' (hoje) perto da meia-noite local não vira o dia seguinte", () => {
      const hoje = new Date(2026, 6, 4, 23, 45, 0);
      const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

      expect(formatarDataLocal(primeiroDia)).toBe("2026-07-01");
      expect(formatarDataLocal(hoje)).toBe("2026-07-04");
    });

    it("relatório estoque: intervalo de 30 dias com 'fim' perto da meia-noite local não vira o dia seguinte", () => {
      const hoje = new Date(2026, 6, 4, 23, 45, 0);
      const trintaDiasAtras = new Date(hoje.getTime() - 30 * 24 * 60 * 60 * 1000);

      expect(formatarDataLocal(hoje)).toBe("2026-07-04");
      expect(formatarDataLocal(trintaDiasAtras)).toBe("2026-06-04");
    });
  });

  describe("calcularIntervaloPreset (filtro único de período)", () => {
    const referencia = new Date(2026, 6, 4, 23, 45, 0); // 04/07/2026, perto da meia-noite local

    it("'hoje' retorna início e fim iguais ao dia de referência", () => {
      expect(calcularIntervaloPreset("hoje", referencia)).toEqual({
        inicio: "2026-07-04",
        fim: "2026-07-04",
      });
    });

    it("'semana' retorna 7 dias antes da referência até a referência", () => {
      expect(calcularIntervaloPreset("semana", referencia)).toEqual({
        inicio: "2026-06-27",
        fim: "2026-07-04",
      });
    });

    it("'mes' retorna 30 dias antes da referência até a referência", () => {
      expect(calcularIntervaloPreset("mes", referencia)).toEqual({
        inicio: "2026-06-04",
        fim: "2026-07-04",
      });
    });

    it("'mesAtual' retorna o primeiro dia do mês até a referência", () => {
      expect(calcularIntervaloPreset("mesAtual", referencia)).toEqual({
        inicio: "2026-07-01",
        fim: "2026-07-04",
      });
    });

    it("'mesAtual' não desloca por UTC quando referência está perto da virada do dia", () => {
      const viradaAno = new Date(2027, 0, 1, 0, 30, 0);
      expect(calcularIntervaloPreset("mesAtual", viradaAno)).toEqual({
        inicio: "2027-01-01",
        fim: "2027-01-01",
      });
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
