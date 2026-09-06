import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

  describe("data operacional (dataEntrada)", () => {
    const base = {
      clienteId: "cliente-1",
      numeroSufixo: "0001",
      itemRecebido: "Tênis preto",
      prazoPrevisto: "2026-09-10",
      valorEstimado: 100,
      servicos: [{ servicoId: "servico-1", valor: 100 }],
    };

    const caminhoDoErro = (resultado: ReturnType<typeof ordemServicoFormSchema.safeParse>) =>
      resultado.success ? [] : resultado.error.issues.map((issue) => issue.path.join("."));

    beforeEach(() => {
      vi.useFakeTimers();
      // 05/09/2026 12:00 em Brasília.
      vi.setSystemTime(new Date("2026-09-05T15:00:00Z"));
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it("aceita payload sem dataEntrada (compatibilidade)", () => {
      expect(ordemServicoFormSchema.safeParse(base).success).toBe(true);
    });

    it("aceita a data de hoje sem justificativa", () => {
      const resultado = ordemServicoFormSchema.safeParse({ ...base, dataEntrada: "2026-09-05" });

      expect(resultado.success).toBe(true);
    });

    it("rejeita data futura", () => {
      const resultado = ordemServicoFormSchema.safeParse({ ...base, dataEntrada: "2026-09-06" });

      expect(resultado.success).toBe(false);
      expect(caminhoDoErro(resultado)).toContain("dataEntrada");
    });

    it("rejeita data retroativa sem justificativa", () => {
      const resultado = ordemServicoFormSchema.safeParse({ ...base, dataEntrada: "2026-09-01" });

      expect(resultado.success).toBe(false);
      expect(caminhoDoErro(resultado)).toContain("justificativaDataEntrada");
    });

    it("rejeita justificativa em branco ou curta demais", () => {
      const emBranco = ordemServicoFormSchema.safeParse({
        ...base,
        dataEntrada: "2026-09-01",
        justificativaDataEntrada: "              ",
      });
      const curta = ordemServicoFormSchema.safeParse({
        ...base,
        dataEntrada: "2026-09-01",
        justificativaDataEntrada: "esqueci",
      });

      expect(emBranco.success).toBe(false);
      expect(curta.success).toBe(false);
    });

    it("aceita retroatividade longa quando há justificativa (sem limite de dias)", () => {
      const resultado = ordemServicoFormSchema.safeParse({
        ...base,
        dataEntrada: "2025-01-10",
        justificativaDataEntrada: "OS antiga registrada no caderno durante a queda de energia.",
      });

      expect(resultado.success).toBe(true);
    });

    it("rejeita formato fora de AAAA-MM-DD", () => {
      const resultado = ordemServicoFormSchema.safeParse({ ...base, dataEntrada: "05/09/2026" });

      expect(resultado.success).toBe(false);
      expect(caminhoDoErro(resultado)).toContain("dataEntrada");
    });

    it("rejeita data inexistente no calendário", () => {
      const resultado = ordemServicoFormSchema.safeParse({
        ...base,
        dataEntrada: "2026-02-31",
        justificativaDataEntrada: "Registro antigo do caderno de balcão.",
      });

      expect(resultado.success).toBe(false);
      expect(caminhoDoErro(resultado)).toContain("dataEntrada");
    });
  });
});
