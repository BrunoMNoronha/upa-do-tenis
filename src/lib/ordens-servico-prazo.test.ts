import { describe, expect, it } from "vitest";
import { calcularPrazoPrevistoPadrao, descreverPrazo, diferencaDiasOperacionais } from "./ordens-servico-prazo";

describe("calcularPrazoPrevistoPadrao", () => {
  it("soma 5 dias sem contar domingos (quarta → terça seguinte)", () => {
    // 2026-09-16 é quarta; o domingo 20 não conta.
    expect(calcularPrazoPrevistoPadrao("2026-09-16")).toBe("2026-09-22");
  });

  it("segunda-feira sem domingo no caminho cai no sábado", () => {
    // 2026-09-14 é segunda: 15, 16, 17, 18, 19 (sábado).
    expect(calcularPrazoPrevistoPadrao("2026-09-14")).toBe("2026-09-19");
  });

  it("nunca termina em domingo", () => {
    // 2026-09-15 é terça: 16, 17, 18, 19, pula 20, 21 (segunda).
    expect(calcularPrazoPrevistoPadrao("2026-09-15")).toBe("2026-09-21");
  });

  it("entrada no domingo conta a partir da segunda", () => {
    // 2026-09-20 é domingo: 21, 22, 23, 24, 25.
    expect(calcularPrazoPrevistoPadrao("2026-09-20")).toBe("2026-09-25");
  });

  it("atravessa virada de mês e ano", () => {
    // 2026-12-30 é quarta: 31, 01/01 (sex), 02 (sáb), pula 03 (dom), 04, 05.
    expect(calcularPrazoPrevistoPadrao("2026-12-30")).toBe("2027-01-05");
  });

  it("aceita quantidade de dias personalizada e zero", () => {
    expect(calcularPrazoPrevistoPadrao("2026-09-16", 1)).toBe("2026-09-17");
    expect(calcularPrazoPrevistoPadrao("2026-09-16", 0)).toBe("2026-09-16");
  });

  it("retorna vazio para data inválida", () => {
    expect(calcularPrazoPrevistoPadrao("")).toBe("");
    expect(calcularPrazoPrevistoPadrao("abc")).toBe("");
  });
});

describe("diferencaDiasOperacionais", () => {
  it("conta dias civis no fuso da operação", () => {
    // 16/09 23:30 em São Paulo (17/09 02:30 UTC) até 18/09 meio-dia: 2 dias.
    expect(diferencaDiasOperacionais(new Date("2026-09-17T02:30:00.000Z"), "2026-09-18T15:00:00.000Z")).toBe(2);
    expect(diferencaDiasOperacionais("2026-09-16T12:00:00.000Z", "2026-09-12T12:00:00.000Z")).toBe(-4);
    expect(diferencaDiasOperacionais("invalida", "2026-09-12T12:00:00.000Z")).toBe(0);
  });
});

describe("descreverPrazo", () => {
  const agora = new Date("2026-09-16T15:00:00.000Z");

  it("descreve atraso, vencimento hoje e dias restantes", () => {
    expect(descreverPrazo({ status: "EM_ANDAMENTO", dataPrevisao: "2026-09-12T15:00:00.000Z" }, agora)).toEqual({
      dataCurta: "12/09",
      texto: "4 dias atrasada",
      tom: "danger",
    });
    expect(descreverPrazo({ status: "ABERTA", dataPrevisao: "2026-09-15T15:00:00.000Z" }, agora).texto).toBe("1 dia atrasada");
    expect(descreverPrazo({ status: "ABERTA", dataPrevisao: "2026-09-16T20:00:00.000Z" }, agora)).toMatchObject({ texto: "vence hoje", tom: "warning" });
    expect(descreverPrazo({ status: "ABERTA", dataPrevisao: "2026-09-18T15:00:00.000Z" }, agora)).toMatchObject({ texto: "em 2 dias", tom: "neutral" });
  });

  it("usa o histórico para entregue e cancelada", () => {
    const historicosStatus = [
      { statusNovo: "ENTREGUE", criadoEm: "2026-09-15T18:00:00.000Z" },
      { statusNovo: "CANCELADA", criadoEm: "2026-09-14T18:00:00.000Z" },
    ];
    expect(descreverPrazo({ status: "ENTREGUE", dataPrevisao: "2026-09-15T15:00:00.000Z", historicosStatus }, agora)).toEqual({
      dataCurta: "15/09",
      texto: "entregue em 15/09",
      tom: "success",
    });
    expect(descreverPrazo({ status: "CANCELADA", dataPrevisao: "2026-09-20T15:00:00.000Z", historicosStatus }, agora)).toEqual({
      dataCurta: "—",
      texto: "cancelada em 14/09",
      tom: "neutral",
    });
  });
});
