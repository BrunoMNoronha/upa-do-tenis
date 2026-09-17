import { afterEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  LIMITE_DIAS_RECEBIMENTOS_POR_DIA,
  listarDiasDoPeriodo,
  montarRecebimentosPorDia,
} from "./dashboard-recebimentos-por-dia";
import { somarRecebimentosLiquidosPorDiaOperacional } from "./dashboard-service";

describe("listarDiasDoPeriodo", () => {
  it("lista todos os dias do período, inclusive as pontas", () => {
    expect(listarDiasDoPeriodo("2026-09-14", "2026-09-16")).toEqual(["2026-09-14", "2026-09-15", "2026-09-16"]);
  });

  it("devolve um único dia quando início e fim coincidem", () => {
    expect(listarDiasDoPeriodo("2026-09-16", "2026-09-16")).toEqual(["2026-09-16"]);
  });

  it("atravessa virada de mês, ano e fevereiro bissexto", () => {
    expect(listarDiasDoPeriodo("2026-09-30", "2026-10-01")).toEqual(["2026-09-30", "2026-10-01"]);
    expect(listarDiasDoPeriodo("2026-12-31", "2027-01-01")).toEqual(["2026-12-31", "2027-01-01"]);
    expect(listarDiasDoPeriodo("2028-02-28", "2028-03-01")).toEqual(["2028-02-28", "2028-02-29", "2028-03-01"]);
  });

  it(`aceita até ${LIMITE_DIAS_RECEBIMENTOS_POR_DIA} dias e devolve null acima disso`, () => {
    // 01/07 a 30/09 = 92 dias.
    expect(listarDiasDoPeriodo("2026-07-01", "2026-09-30")).toHaveLength(LIMITE_DIAS_RECEBIMENTOS_POR_DIA);
    expect(listarDiasDoPeriodo("2026-07-01", "2026-10-01")).toBeNull();
  });

  it("devolve lista vazia para período invertido ou inválido", () => {
    expect(listarDiasDoPeriodo("2026-09-16", "2026-09-15")).toEqual([]);
    expect(listarDiasDoPeriodo("invalido", "2026-09-15")).toEqual([]);
  });
});

describe("montarRecebimentosPorDia", () => {
  it("preenche com zero os dias sem recebimento, mantém a ordem e ignora dias fora do período", () => {
    const totais = new Map([["2026-09-16", 50], ["2026-09-20", 99]]);
    expect(montarRecebimentosPorDia(["2026-09-14", "2026-09-15", "2026-09-16"], totais)).toEqual([
      { dia: "2026-09-14", valor: 0 },
      { dia: "2026-09-15", valor: 0 },
      { dia: "2026-09-16", valor: 50 },
    ]);
  });
});

describe("somarRecebimentosLiquidosPorDiaOperacional", () => {
  const tzOriginal = process.env.TZ;

  afterEach(() => {
    if (tzOriginal === undefined) delete process.env.TZ;
    else process.env.TZ = tzOriginal;
  });

  it("soma com precisão decimal, sem erro de ponto flutuante", () => {
    const totais = somarRecebimentosLiquidosPorDiaOperacional([
      { dataPagamento: new Date("2026-09-16T09:00:00-03:00"), valor: new Prisma.Decimal("0.10") },
      { dataPagamento: new Date("2026-09-16T10:00:00-03:00"), valor: new Prisma.Decimal("0.20") },
      { dataPagamento: new Date("2026-09-16T11:00:00-03:00"), valor: 19.99 },
    ]);
    expect(totais.get("2026-09-16")).toBe(20.29);
  });

  it("preserva frações de centavo como o aggregate do total recebido", () => {
    const valores = ["0.005", "0.004", "10.001"];
    const totais = somarRecebimentosLiquidosPorDiaOperacional(
      valores.map((valor) => ({ dataPagamento: new Date("2026-09-16T12:00:00-03:00"), valor: new Prisma.Decimal(valor) })),
    );
    const agregado = valores.reduce((acc, valor) => acc.plus(valor), new Prisma.Decimal(0)).toNumber();
    expect(totais.get("2026-09-16")).toBe(agregado);
    expect(totais.get("2026-09-16")).toBe(10.01);
  });

  it.each([
    { tz: "UTC", offsetMinutos: 0 },
    { tz: "America/Sao_Paulo", offsetMinutos: 180 },
    { tz: "Asia/Tokyo", offsetMinutos: -540 },
  ])("com o processo em TZ=$tz, 23:30 de São Paulo fica no próprio dia", ({ tz, offsetMinutos }) => {
    process.env.TZ = tz;
    expect(new Date("2026-09-16T12:00:00Z").getTimezoneOffset()).toBe(offsetMinutos);

    const totais = somarRecebimentosLiquidosPorDiaOperacional([
      { dataPagamento: new Date("2026-09-16T23:30:00-03:00"), valor: 40 },
      { dataPagamento: new Date("2026-09-17T00:00:00-03:00"), valor: 15 },
    ]);
    expect([...totais]).toEqual([
      ["2026-09-16", 40],
      ["2026-09-17", 15],
    ]);
  });

  it("estorno subtrai no dia do estorno, sem alterar o dia do pagamento (#230)", () => {
    const totais = somarRecebimentosLiquidosPorDiaOperacional(
      [{ dataPagamento: new Date("2026-09-10T10:00:00-03:00"), valor: 100 }],
      [{ dataEstorno: new Date("2026-09-12T10:00:00-03:00"), valor: 100 }],
    );
    expect([...totais]).toEqual([
      ["2026-09-10", 100],
      ["2026-09-12", -100],
    ]);
  });

  it("estorno e pagamento no mesmo dia se compensam com precisão decimal", () => {
    const totais = somarRecebimentosLiquidosPorDiaOperacional(
      [
        { dataPagamento: new Date("2026-09-16T09:00:00-03:00"), valor: new Prisma.Decimal("50.10") },
        { dataPagamento: new Date("2026-09-16T09:30:00-03:00"), valor: new Prisma.Decimal("30.20") },
      ],
      [{ dataEstorno: new Date("2026-09-16T18:00:00-03:00"), valor: new Prisma.Decimal("50.10") }],
    );
    expect(totais.get("2026-09-16")).toBe(30.2);
  });

  it("com o processo em TZ=UTC, estorno às 22:30 de São Paulo fica no próprio dia", () => {
    process.env.TZ = "UTC";
    const totais = somarRecebimentosLiquidosPorDiaOperacional(
      [],
      [{ dataEstorno: new Date("2026-09-12T22:30:00-03:00"), valor: 25 }],
    );
    expect([...totais]).toEqual([["2026-09-12", -25]]);
  });
});
