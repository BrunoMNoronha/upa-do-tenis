import { describe, expect, it } from "vitest";

import { ordemServicoFormSchema, ordemServicoServicosAtualizarSchema } from "@/lib/ordens-servico-schema";

describe("ordens-servico-schema", () => {
  it("aceita múltiplos serviços com valores individuais", () => {
    const resultado = ordemServicoFormSchema.safeParse({
      clienteId: "cliente-1",
      numeroSufixo: "0001",
      itemRecebido: "Tênis preto",
      prazoPrevisto: "2026-09-10",
      valorEstimado: 175.5,
      servicos: [
        { servicoId: "servico-1", valor: 100 },
        { servicoId: "servico-2", valor: "75,50" },
      ],
    });

    expect(resultado.success).toBe(true);
    if (resultado.success) {
      expect(resultado.data.servicos).toEqual([
        { servicoId: "servico-1", valor: 100 },
        { servicoId: "servico-2", valor: 75.5 },
      ]);
    }
  });

  it("rejeita criar uma OS sem serviços", () => {
    const resultado = ordemServicoFormSchema.safeParse({
      clienteId: "cliente-1",
      numeroSufixo: "0001",
      itemRecebido: "Tênis preto",
      prazoPrevisto: "2026-09-10",
      valorEstimado: 0,
    });

    expect(resultado.success).toBe(false);
  });

  it("rejeita remover todos os serviços de um item", () => {
    const resultado = ordemServicoServicosAtualizarSchema.safeParse({
      itemOrdemServicoId: "item-1",
      servicos: [],
    });

    expect(resultado.success).toBe(false);
  });

  it("rejeita serviço sem valor válido", () => {
    const resultado = ordemServicoServicosAtualizarSchema.safeParse({
      itemOrdemServicoId: "item-1",
      servicos: [{ servicoId: "servico-1", valor: -1 }],
    });

    expect(resultado.success).toBe(false);
  });
});
