import { afterEach, describe, expect, it } from "vitest";
import {
  parseDataLocal,
  inicioDoDia,
  inicioDoDiaSeguinte,
  formatarDataLocal,
  calcularIntervaloPreset,
  dataOperacionalHoje,
  inicioDoDiaOperacional,
  intervaloDoDiaOperacional,
  dataOperacional,
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

  describe("dataOperacionalHoje", () => {
    it("retorna o dia corrente no fuso da operação", () => {
      expect(dataOperacionalHoje(new Date("2026-09-05T12:00:00Z"))).toBe("2026-09-05");
    });

    it("mantém o dia brasileiro quando o processo já virou para o dia seguinte em UTC", () => {
      // 05/09 23:30 em Brasília = 06/09 02:30 em UTC.
      expect(dataOperacionalHoje(new Date("2026-09-06T02:30:00Z"))).toBe("2026-09-05");
    });

    it("mantém o dia anterior antes das 03:00 UTC", () => {
      // 04/09 23:59:59 em Brasília = 05/09 02:59:59 em UTC.
      expect(dataOperacionalHoje(new Date("2026-09-05T02:59:59Z"))).toBe("2026-09-04");
    });
  });

  describe("inicioDoDiaOperacional", () => {
    it("retorna a meia-noite de Brasília como instante UTC", () => {
      expect(inicioDoDiaOperacional(new Date("2026-09-16T13:00:00Z")).toISOString()).toBe("2026-09-16T03:00:00.000Z");
    });

    it("usa o dia brasileiro quando em UTC já é o dia seguinte", () => {
      // 16/09 22:30 em Brasília = 17/09 01:30 UTC.
      expect(inicioDoDiaOperacional(new Date("2026-09-17T01:30:00Z")).toISOString()).toBe("2026-09-16T03:00:00.000Z");
    });

    it("vira o dia exatamente na meia-noite de Brasília", () => {
      expect(inicioDoDiaOperacional(new Date("2026-09-17T03:00:00Z")).toISOString()).toBe("2026-09-17T03:00:00.000Z");
    });
  });
});

describe("intervaloDoDiaOperacional", () => {
  const tzOriginal = process.env.TZ;

  afterEach(() => {
    if (tzOriginal === undefined) delete process.env.TZ;
    else process.env.TZ = tzOriginal;
  });

  // Deslocamento esperado de getTimezoneOffset() em 16/09/2026: garante que o
  // processo de fato mudou de fuso e que o teste não passa por acaso.
  const fusosDoProcesso = [
    { tz: "UTC", offsetMinutos: 0 },
    { tz: "America/Sao_Paulo", offsetMinutos: 180 },
    { tz: "Asia/Tokyo", offsetMinutos: -540 },
  ];

  describe.each(fusosDoProcesso)("com o processo em TZ=$tz", ({ tz, offsetMinutos }) => {
    const emFuso = () => {
      process.env.TZ = tz;
      expect(new Date("2026-09-16T12:00:00Z").getTimezoneOffset()).toBe(offsetMinutos);
    };

    it("devolve meia-noite a meia-noite de São Paulo", () => {
      emFuso();
      const { inicio, fimExclusivo } = intervaloDoDiaOperacional("2026-09-16");
      expect(inicio.toISOString()).toBe("2026-09-16T03:00:00.000Z");
      expect(fimExclusivo.toISOString()).toBe("2026-09-17T03:00:00.000Z");
    });

    it("atravessa a virada de mês e de ano", () => {
      emFuso();
      expect(intervaloDoDiaOperacional("2026-09-30").fimExclusivo.toISOString()).toBe("2026-10-01T03:00:00.000Z");
      expect(intervaloDoDiaOperacional("2026-10-01").inicio.toISOString()).toBe("2026-10-01T03:00:00.000Z");
      expect(intervaloDoDiaOperacional("2026-02-28").fimExclusivo.toISOString()).toBe("2026-03-01T03:00:00.000Z");
      expect(intervaloDoDiaOperacional("2026-12-31").fimExclusivo.toISOString()).toBe("2027-01-01T03:00:00.000Z");
    });

    it("mantém 23:30 de São Paulo no próprio dia, e não no seguinte", () => {
      emFuso();
      // 16/09 23:30 em São Paulo = 17/09 02:30 UTC = 17/09 11:30 em Tóquio.
      const registro = new Date("2026-09-16T23:30:00-03:00");
      const dia = intervaloDoDiaOperacional("2026-09-16");
      const diaSeguinte = intervaloDoDiaOperacional("2026-09-17");

      expect(registro >= dia.inicio && registro < dia.fimExclusivo).toBe(true);
      expect(registro >= diaSeguinte.inicio && registro < diaSeguinte.fimExclusivo).toBe(false);
      expect(dataOperacional(registro)).toBe("2026-09-16");
    });

    it("inclui 00:00 e exclui a meia-noite seguinte (intervalo semiaberto)", () => {
      emFuso();
      const { inicio, fimExclusivo } = intervaloDoDiaOperacional("2026-09-16");
      const meiaNoite = new Date("2026-09-16T00:00:00-03:00");
      const ultimoMs = new Date("2026-09-16T23:59:59.999-03:00");
      const proximaMeiaNoite = new Date("2026-09-17T00:00:00-03:00");

      expect(meiaNoite >= inicio).toBe(true);
      expect(ultimoMs < fimExclusivo).toBe(true);
      expect(proximaMeiaNoite < fimExclusivo).toBe(false);
    });

    it("reduz instantes ISO completos ao dia de São Paulo", () => {
      emFuso();
      expect(intervaloDoDiaOperacional("2026-09-17T01:30:00.000Z").inicio.toISOString()).toBe("2026-09-16T03:00:00.000Z");
    });

    it("devolve datas inválidas para entrada inválida", () => {
      emFuso();
      const { inicio, fimExclusivo } = intervaloDoDiaOperacional("invalido");
      expect(Number.isNaN(inicio.getTime())).toBe(true);
      expect(Number.isNaN(fimExclusivo.getTime())).toBe(true);
    });
  });
});
