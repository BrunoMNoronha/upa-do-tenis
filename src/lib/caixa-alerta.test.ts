import { describe, expect, it } from "vitest";
import { classificarEstadoCaixa } from "./caixa-alerta";

// Fuso operacional: America/Sao_Paulo (UTC-3, sem horário de verão).
const caixa = (dataAbertura: string) => ({ id: "caixa-1", dataAbertura: new Date(dataAbertura) });

describe("classificarEstadoCaixa", () => {
  it("sem caixa aberto → FECHADO", () => {
    expect(classificarEstadoCaixa(null, new Date("2026-09-16T12:00:00Z"))).toEqual({
      estado: "FECHADO",
      caixaId: null,
      dataAbertura: null,
      horaAbertura: null,
    });
  });

  it("caixa aberto hoje às 08:00 → ABERTO_HOJE com hora local", () => {
    const resultado = classificarEstadoCaixa(
      caixa("2026-09-16T11:00:00Z"),
      new Date("2026-09-16T15:00:00Z")
    );
    expect(resultado).toEqual({
      estado: "ABERTO_HOJE",
      caixaId: "caixa-1",
      dataAbertura: "16/09/2026",
      horaAbertura: "08:00",
    });
  });

  it("caixa aberto ontem às 18:00 e ainda aberto → FECHAMENTO_PENDENTE", () => {
    const resultado = classificarEstadoCaixa(
      caixa("2026-09-15T21:00:00Z"),
      new Date("2026-09-16T12:00:00Z")
    );
    expect(resultado.estado).toBe("FECHAMENTO_PENDENTE");
    expect(resultado.dataAbertura).toBe("15/09/2026");
    expect(resultado.horaAbertura).toBe("18:00");
  });

  it("caixa aberto há vários dias → FECHAMENTO_PENDENTE", () => {
    const resultado = classificarEstadoCaixa(
      caixa("2026-09-10T11:03:00Z"),
      new Date("2026-09-16T12:00:00Z")
    );
    expect(resultado.estado).toBe("FECHAMENTO_PENDENTE");
    expect(resultado.dataAbertura).toBe("10/09/2026");
  });

  it("aberto às 22:30 local e consultado às 23:30 local (datas UTC diferentes) → sem falso pendente", () => {
    // 22:30 local = 01:30Z do dia 17; 23:30 local = 02:30Z do dia 17
    const abertura = classificarEstadoCaixa(
      caixa("2026-09-17T01:30:00Z"),
      new Date("2026-09-17T02:30:00Z")
    );
    expect(abertura.estado).toBe("ABERTO_HOJE");
    expect(abertura.dataAbertura).toBe("16/09/2026");
    expect(abertura.horaAbertura).toBe("22:30");
  });

  it("aberto às 00:00 local e consultado às 23:59 local do mesmo dia → ABERTO_HOJE", () => {
    // 00:00 local = 03:00Z; 23:59 local = 02:59Z do dia seguinte em UTC
    const resultado = classificarEstadoCaixa(
      caixa("2026-09-16T03:00:00Z"),
      new Date("2026-09-17T02:59:00Z")
    );
    expect(resultado.estado).toBe("ABERTO_HOJE");
    expect(resultado.horaAbertura).toBe("00:00");
  });

  it("aberto às 23:59 local e consultado às 00:01 local do dia seguinte → FECHAMENTO_PENDENTE", () => {
    const resultado = classificarEstadoCaixa(
      caixa("2026-09-17T02:59:00Z"),
      new Date("2026-09-17T03:01:00Z")
    );
    expect(resultado.estado).toBe("FECHAMENTO_PENDENTE");
    expect(resultado.dataAbertura).toBe("16/09/2026");
    expect(resultado.horaAbertura).toBe("23:59");
  });

  it("aberto após 21:00 local (já dia seguinte em UTC) e consultado na mesma noite → ABERTO_HOJE", () => {
    // 21:30 local do dia 16 = 00:30Z do dia 17
    const resultado = classificarEstadoCaixa(
      caixa("2026-09-17T00:30:00Z"),
      new Date("2026-09-17T01:00:00Z")
    );
    expect(resultado.estado).toBe("ABERTO_HOJE");
    expect(resultado.dataAbertura).toBe("16/09/2026");
  });
});
