import { afterEach, describe, expect, it } from "vitest";
import { Prisma } from "@prisma/client";
import {
  LIMITE_DIAS_RECEBIMENTOS_POR_DIA,
  listarDiasDoPeriodo,
  montarRecebimentosPorDia,
} from "./dashboard-recebimentos-por-dia";

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
  const tzOriginal = process.env.TZ;

  afterEach(() => {
    if (tzOriginal === undefined) delete process.env.TZ;
    else process.env.TZ = tzOriginal;
  });

  it("preenche com zero os dias sem recebimento e mantém a ordem do período", () => {
    const dias = ["2026-09-14", "2026-09-15", "2026-09-16"];
    const serie = montarRecebimentosPorDia(dias, [
      { dataPagamento: new Date("2026-09-16T10:00:00-03:00"), valor: 50 },
    ]);
    expect(serie).toEqual([
      { dia: "2026-09-14", valor: 0 },
      { dia: "2026-09-15", valor: 0 },
      { dia: "2026-09-16", valor: 50 },
    ]);
  });

  it("soma em centavos sem erro de ponto flutuante e aceita Decimal do Prisma", () => {
    const serie = montarRecebimentosPorDia(["2026-09-16"], [
      { dataPagamento: new Date("2026-09-16T09:00:00-03:00"), valor: new Prisma.Decimal("0.10") },
      { dataPagamento: new Date("2026-09-16T10:00:00-03:00"), valor: new Prisma.Decimal("0.20") },
      { dataPagamento: new Date("2026-09-16T11:00:00-03:00"), valor: 19.99 },
    ]);
    expect(serie).toEqual([{ dia: "2026-09-16", valor: 20.29 }]);
  });

  it("ignora pagamentos fora dos dias informados", () => {
    const serie = montarRecebimentosPorDia(["2026-09-16"], [
      { dataPagamento: new Date("2026-09-17T00:00:00-03:00"), valor: 10 },
    ]);
    expect(serie).toEqual([{ dia: "2026-09-16", valor: 0 }]);
  });

  it.each([
    { tz: "UTC", offsetMinutos: 0 },
    { tz: "America/Sao_Paulo", offsetMinutos: 180 },
    { tz: "Asia/Tokyo", offsetMinutos: -540 },
  ])("com o processo em TZ=$tz, 23:30 de São Paulo fica no próprio dia", ({ tz, offsetMinutos }) => {
    process.env.TZ = tz;
    expect(new Date("2026-09-16T12:00:00Z").getTimezoneOffset()).toBe(offsetMinutos);

    const serie = montarRecebimentosPorDia(["2026-09-16", "2026-09-17"], [
      { dataPagamento: new Date("2026-09-16T23:30:00-03:00"), valor: 40 },
      { dataPagamento: new Date("2026-09-17T00:00:00-03:00"), valor: 15 },
    ]);
    expect(serie).toEqual([
      { dia: "2026-09-16", valor: 40 },
      { dia: "2026-09-17", valor: 15 },
    ]);
  });
});
