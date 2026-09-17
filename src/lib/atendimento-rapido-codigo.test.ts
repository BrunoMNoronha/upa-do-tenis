import { describe, expect, it } from "vitest";

import {
  SequencialAtendimentoRapidoEsgotadoError,
  chaveLockDoDia,
  formatarCodigoAtendimentoRapido,
  prefixoCodigoDoDia,
  proximoCodigoDoDia,
} from "./atendimento-rapido-codigo";
import { dataOperacional } from "./date-range";

describe("código do Atendimento Rápido", () => {
  it("formata AR-DDMMAAAA-NNNN", () => {
    expect(formatarCodigoAtendimentoRapido("2026-09-16", 1)).toBe("AR-16092026-0001");
    expect(formatarCodigoAtendimentoRapido("2026-09-16", 124)).toBe("AR-16092026-0124");
    expect(prefixoCodigoDoDia("2026-09-17")).toBe("AR-17092026-");
  });

  it("começa em 0001 no primeiro atendimento do dia e continua do maior código", () => {
    expect(proximoCodigoDoDia("2026-09-17", null)).toBe("AR-17092026-0001");
    expect(proximoCodigoDoDia("2026-09-17", "AR-17092026-0009")).toBe("AR-17092026-0010");
  });

  it("reinicia no dia seguinte (o maior código é sempre buscado pelo prefixo do dia)", () => {
    expect(proximoCodigoDoDia("2026-09-18", null)).toBe("AR-18092026-0001");
  });

  it("recusa código de outro dia ou malformado como base", () => {
    expect(() => proximoCodigoDoDia("2026-09-18", "AR-17092026-0009")).toThrow();
    expect(() => proximoCodigoDoDia("2026-09-18", "OS-18092026-0009")).toThrow();
  });

  it("bloqueia o sequencial acima de 9999", () => {
    expect(formatarCodigoAtendimentoRapido("2026-09-17", 9999)).toBe("AR-17092026-9999");
    expect(() => proximoCodigoDoDia("2026-09-17", "AR-17092026-9999")).toThrow(SequencialAtendimentoRapidoEsgotadoError);
    expect(() => formatarCodigoAtendimentoRapido("2026-09-17", 0)).toThrow();
  });

  it("chave do lock é o dia como inteiro AAAAMMDD e valida o formato", () => {
    expect(chaveLockDoDia("2026-09-17")).toBe(20260917);
    expect(() => chaveLockDoDia("17/09/2026")).toThrow();
  });

  it("usa o dia de America/Sao_Paulo, não o dia UTC", () => {
    // 02:30 UTC de 17/09 ainda é 23:30 de 16/09 em São Paulo.
    const instante = new Date("2026-09-17T02:30:00Z");
    expect(prefixoCodigoDoDia(dataOperacional(instante))).toBe("AR-16092026-");
  });
});
