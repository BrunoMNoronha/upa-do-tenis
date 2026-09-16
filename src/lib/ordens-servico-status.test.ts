import { describe, expect, it } from "vitest";

import {
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
});
