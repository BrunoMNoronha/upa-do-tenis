import { describe, expect, it } from "vitest";

import { transicaoPermitida } from "./ordens-servico-status";
import {
  proximaAcaoStatus,
  rotuloStatusFinanceiro,
  rotuloStatusOperacional,
  tomStatusFinanceiro,
  tomStatusOperacional,
} from "./ordens-servico-status-apresentacao";

describe("apresentação de status da OS", () => {
  it("rotula status operacionais com acentuação", () => {
    expect(rotuloStatusOperacional("EM_ANDAMENTO")).toBe("Em andamento");
    expect(rotuloStatusOperacional("CONCLUIDA")).toBe("Concluída");
    expect(rotuloStatusOperacional("DESCONHECIDO")).toBe("DESCONHECIDO");
  });

  it("usa os tons do design", () => {
    expect(tomStatusOperacional("EM_ANDAMENTO")).toBe("warning");
    expect(tomStatusOperacional("CONCLUIDA")).toBe("success");
    expect(tomStatusOperacional("CANCELADA")).toBe("danger");
    expect(tomStatusOperacional("ABERTA")).toBe("neutral");
    expect(tomStatusFinanceiro("PENDENTE")).toBe("danger");
    expect(tomStatusFinanceiro("PARCIAL")).toBe("warning");
    expect(tomStatusFinanceiro("PAGO")).toBe("success");
    expect(rotuloStatusFinanceiro("PARCIAL")).toBe("Parcial");
  });

  it("propõe somente transições permitidas", () => {
    for (const status of ["ABERTA", "EM_ANDAMENTO", "CONCLUIDA"]) {
      const acao = proximaAcaoStatus(status);
      expect(acao).not.toBeNull();
      expect(transicaoPermitida(status, acao!.statusNovo)).toBe(true);
    }
    expect(proximaAcaoStatus("ABERTA")?.rotulo).toBe("Iniciar serviço");
    expect(proximaAcaoStatus("ENTREGUE")).toBeNull();
    expect(proximaAcaoStatus("CANCELADA")).toBeNull();
  });
});
