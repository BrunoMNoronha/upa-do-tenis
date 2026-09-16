import { describe, expect, it } from "vitest";

import { ordemServicoEstaAtrasada } from "./ordens-servico-listagem";

// Instantes em UTC para não depender do fuso da máquina.
// 16/09/2026 10:00 em Brasília.
const agora = new Date("2026-09-16T13:00:00Z");

describe("ordemServicoEstaAtrasada", () => {
  it("considera atrasada a OS em aberto cuja previsão já passou", () => {
    expect(ordemServicoEstaAtrasada({ status: "ABERTA", dataPrevisao: new Date("2026-09-15T12:00:00Z") }, agora)).toBe(true);
    expect(ordemServicoEstaAtrasada({ status: "EM_ANDAMENTO", dataPrevisao: new Date("2026-09-01T12:00:00Z") }, agora)).toBe(true);
  });

  it("não considera atrasada a OS com previsão para hoje ou futura", () => {
    expect(ordemServicoEstaAtrasada({ status: "ABERTA", dataPrevisao: new Date("2026-09-16T12:00:00Z") }, agora)).toBe(false);
    expect(ordemServicoEstaAtrasada({ status: "ABERTA", dataPrevisao: new Date("2026-09-20T12:00:00Z") }, agora)).toBe(false);
  });

  it("usa o fuso da operação: entre 21h e meia-noite em Brasília a OS de hoje não atrasa", () => {
    // 16/09 22:30 em Brasília = 17/09 01:30 UTC (em UTC o dia já virou).
    const noite = new Date("2026-09-17T01:30:00Z");
    expect(ordemServicoEstaAtrasada({ status: "ABERTA", dataPrevisao: new Date("2026-09-16T12:00:00Z") }, noite)).toBe(false);
    // Depois da meia-noite de Brasília passa a estar atrasada.
    const madrugada = new Date("2026-09-17T03:00:01Z");
    expect(ordemServicoEstaAtrasada({ status: "ABERTA", dataPrevisao: new Date("2026-09-16T12:00:00Z") }, madrugada)).toBe(true);
  });

  it("ignora OS finalizadas mesmo com prazo vencido", () => {
    for (const status of ["CONCLUIDA", "ENTREGUE", "CANCELADA"]) {
      expect(ordemServicoEstaAtrasada({ status, dataPrevisao: new Date("2026-01-01T12:00:00Z") }, agora)).toBe(false);
    }
  });

  it("aceita data serializada e ignora previsão ausente ou inválida", () => {
    expect(ordemServicoEstaAtrasada({ status: "ABERTA", dataPrevisao: "2026-09-10T12:00:00.000Z" }, agora)).toBe(true);
    expect(ordemServicoEstaAtrasada({ status: "ABERTA", dataPrevisao: null }, agora)).toBe(false);
    expect(ordemServicoEstaAtrasada({ status: "ABERTA", dataPrevisao: "invalida" }, agora)).toBe(false);
  });
});
