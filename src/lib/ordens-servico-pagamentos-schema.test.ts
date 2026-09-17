import { afterEach, describe, expect, it, vi } from "vitest";

import { dataOperacional } from "./date-range";
import { registrarPagamentoOrdemServicoSchema } from "./ordens-servico-pagamentos-schema";

const payloadBase = {
  formaPagamentoId: "forma-1",
  valor: 50,
};

function parsearDataPagamento(dataPagamento: unknown): Date {
  const result = registrarPagamentoOrdemServicoSchema.safeParse({ ...payloadBase, dataPagamento });
  if (!result.success) throw new Error(JSON.stringify(result.error.flatten()));
  return result.data.dataPagamento;
}

describe("registrarPagamentoOrdemServicoSchema — dataPagamento", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("mantém no mesmo dia operacional uma data retroativa YYYY-MM-DD (não grava meia-noite UTC)", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-16T15:00:00Z"));

    const data = parsearDataPagamento("2026-09-15");

    expect(dataOperacional(data)).toBe("2026-09-15");
    expect(data.toISOString()).not.toBe("2026-09-15T00:00:00.000Z");
  });

  it("usa o instante atual quando a data informada é o dia operacional de hoje", () => {
    vi.useFakeTimers();
    const agora = new Date("2026-09-16T15:30:00Z");
    vi.setSystemTime(agora);

    const data = parsearDataPagamento("2026-09-16");

    expect(data.getTime()).toBe(agora.getTime());
    expect(dataOperacional(data)).toBe("2026-09-16");
  });

  it("considera o dia operacional (America/Sao_Paulo) perto da virada do dia UTC", () => {
    vi.useFakeTimers();
    // 22:30 em São Paulo de 16/09, já 17/09 em UTC.
    const agora = new Date("2026-09-17T01:30:00Z");
    vi.setSystemTime(agora);

    const data = parsearDataPagamento("2026-09-16");

    expect(data.getTime()).toBe(agora.getTime());
    expect(dataOperacional(data)).toBe("2026-09-16");
  });

  it("preserva instantes completos enviados em ISO", () => {
    const data = parsearDataPagamento("2026-07-03T10:00:00.000Z");

    expect(data.toISOString()).toBe("2026-07-03T10:00:00.000Z");
  });

  it("rejeita datas inválidas", () => {
    const result = registrarPagamentoOrdemServicoSchema.safeParse({
      ...payloadBase,
      dataPagamento: "data-invalida",
    });

    expect(result.success).toBe(false);
  });
});
