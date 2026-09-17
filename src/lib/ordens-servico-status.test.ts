import { describe, expect, it } from "vitest";

import {
  podeCancelarOrdemServicoComFinanceiro,
  podeCancelarOrdemServico,
  transicaoPermitida,
  transicoesPermitidas,
} from "./ordens-servico-status";

describe("ordens-servico-status", () => {
  it("permite cancelar somente OS ABERTA", () => {
    expect(podeCancelarOrdemServico("ABERTA")).toBe(true);
    expect(podeCancelarOrdemServico("EM_ANDAMENTO")).toBe(false);
    expect(podeCancelarOrdemServico("CONCLUIDA")).toBe(false);
    expect(podeCancelarOrdemServico("ENTREGUE")).toBe(false);
    expect(podeCancelarOrdemServico("CANCELADA")).toBe(false);
    expect(podeCancelarOrdemServico("INEXISTENTE")).toBe(false);
  });

  it("mantém o fluxo operacional homologado", () => {
    expect(transicaoPermitida("ABERTA", "EM_ANDAMENTO")).toBe(true);
    expect(transicaoPermitida("EM_ANDAMENTO", "CONCLUIDA")).toBe(true);
    expect(transicaoPermitida("CONCLUIDA", "ENTREGUE")).toBe(true);
    expect(transicaoPermitida("ABERTA", "CONCLUIDA")).toBe(false);
    expect(transicaoPermitida("ENTREGUE", "ABERTA")).toBe(false);
  });

  it("trata CANCELADA e ENTREGUE como estados finais", () => {
    expect(transicoesPermitidas.CANCELADA).toEqual([]);
    expect(transicoesPermitidas.ENTREGUE).toEqual([]);
  });

  it("não permite reabrir uma OS cancelada", () => {
    expect(transicaoPermitida("CANCELADA", "ABERTA")).toBe(false);
    expect(transicaoPermitida("CANCELADA", "EM_ANDAMENTO")).toBe(false);
  });

  describe("podeCancelarOrdemServicoComFinanceiro (#229)", () => {
    it("permite cancelar OS ABERTA sem valor pago", () => {
      expect(podeCancelarOrdemServicoComFinanceiro("ABERTA", 0)).toBe(true);
    });

    it("bloqueia OS ABERTA com qualquer valor pago", () => {
      expect(podeCancelarOrdemServicoComFinanceiro("ABERTA", 0.01)).toBe(false);
      expect(podeCancelarOrdemServicoComFinanceiro("ABERTA", 100)).toBe(false);
    });

    it("continua bloqueando status que não permitem cancelamento", () => {
      expect(podeCancelarOrdemServicoComFinanceiro("EM_ANDAMENTO", 0)).toBe(false);
      expect(podeCancelarOrdemServicoComFinanceiro("CANCELADA", 0)).toBe(false);
    });
  });
});
