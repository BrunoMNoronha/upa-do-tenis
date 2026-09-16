import { describe, expect, it } from "vitest";

import { ordemServicoEstaAtrasada } from "./ordens-servico-listagem";

// Referência fixa em horário local para não depender do relógio da máquina.
const agora = new Date(2026, 8, 16, 10, 0, 0);

describe("ordemServicoEstaAtrasada", () => {
  it("considera atrasada a OS em aberto cuja previsão já passou", () => {
    expect(ordemServicoEstaAtrasada({ status: "ABERTA", dataPrevisao: new Date(2026, 8, 15, 12) }, agora)).toBe(true);
    expect(ordemServicoEstaAtrasada({ status: "EM_ANDAMENTO", dataPrevisao: new Date(2026, 8, 1, 12) }, agora)).toBe(true);
  });

  it("não considera atrasada a OS com previsão para hoje ou futura", () => {
    expect(ordemServicoEstaAtrasada({ status: "ABERTA", dataPrevisao: new Date(2026, 8, 16, 0) }, agora)).toBe(false);
    expect(ordemServicoEstaAtrasada({ status: "ABERTA", dataPrevisao: new Date(2026, 8, 20, 12) }, agora)).toBe(false);
  });

  it("ignora OS finalizadas mesmo com prazo vencido", () => {
    for (const status of ["CONCLUIDA", "ENTREGUE", "CANCELADA"]) {
      expect(ordemServicoEstaAtrasada({ status, dataPrevisao: new Date(2026, 0, 1) }, agora)).toBe(false);
    }
  });

  it("aceita data serializada e ignora previsão ausente ou inválida", () => {
    expect(ordemServicoEstaAtrasada({ status: "ABERTA", dataPrevisao: new Date(2026, 8, 10, 12).toISOString() }, agora)).toBe(true);
    expect(ordemServicoEstaAtrasada({ status: "ABERTA", dataPrevisao: null }, agora)).toBe(false);
    expect(ordemServicoEstaAtrasada({ status: "ABERTA", dataPrevisao: "invalida" }, agora)).toBe(false);
  });
});
