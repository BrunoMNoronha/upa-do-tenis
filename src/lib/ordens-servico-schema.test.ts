import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ordemServicoFormSchema, ordemServicoServicosAtualizarSchema } from "@/lib/ordens-servico-schema";

describe("ordens-servico-schema", () => {
  it("aceita múltiplos serviços com valores individuais", () => {
    const resultado = ordemServicoFormSchema.safeParse({
      clienteId: "cliente-1",
      numeroOS: "0001",
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

  describe("numeroOS", () => {
    const base = {
      clienteId: "cliente-1",
      itemRecebido: "Tênis preto",
      prazoPrevisto: "2026-09-10",
      valorEstimado: 100,
      servicos: [{ servicoId: "servico-1", valor: 100 }],
    };

    it("exige o número da OS", () => {
      expect(ordemServicoFormSchema.safeParse(base).success).toBe(false);
      expect(ordemServicoFormSchema.safeParse({ ...base, numeroOS: "" }).success).toBe(false);
      expect(ordemServicoFormSchema.safeParse({ ...base, numeroOS: "   " }).success).toBe(false);
    });

    it("aceita apenas dígitos e preserva zeros à esquerda como string", () => {
      const resultado = ordemServicoFormSchema.safeParse({ ...base, numeroOS: "0124" });
      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.numeroOS).toBe("0124");
      }

      expect(ordemServicoFormSchema.safeParse({ ...base, numeroOS: "12A" }).success).toBe(false);
      expect(ordemServicoFormSchema.safeParse({ ...base, numeroOS: "01-24" }).success).toBe(false);
    });

    it("remove espaços ao redor do número", () => {
      const resultado = ordemServicoFormSchema.safeParse({ ...base, numeroOS: " 0124 " });
      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.numeroOS).toBe("0124");
      }
    });
  });

  it("aceita criar uma OS sem serviços: o item pode ser detalhado depois (issue #205)", () => {
    const resultado = ordemServicoFormSchema.safeParse({
      clienteId: "cliente-1",
      numeroOS: "0001",
      itemRecebido: "Tênis preto",
      prazoPrevisto: "2026-09-10",
      valorEstimado: 0,
    });

    expect(resultado.success).toBe(true);
  });

  it("rejeita o contrato antigo sem descrição do item", () => {
    const resultado = ordemServicoFormSchema.safeParse({
      clienteId: "cliente-1",
      numeroOS: "0001",
      itemRecebido: "",
      prazoPrevisto: "2026-09-10",
      servicos: [{ servicoId: "servico-1", valor: 100 }],
    });

    expect(resultado.success).toBe(false);
    if (!resultado.success) {
      expect(resultado.error.flatten().fieldErrors.itens).toContain("Informe pelo menos um item recebido.");
    }
  });

  describe("itens[] (issue #205)", () => {
    const base = {
      clienteId: "cliente-1",
      numeroOS: "0001",
      prazoPrevisto: "2026-09-10",
    };

    it("aceita dois itens com serviços próprios e valorEstimado ausente", () => {
      const resultado = ordemServicoFormSchema.safeParse({
        ...base,
        itens: [
          { clientKey: "a", descricao: "Tênis preto", servicos: [{ servicoId: "servico-1", valor: "40,00" }] },
          { clientKey: "b", descricao: "Bota marrom", servicos: [{ servicoId: "servico-2", valor: 90 }] },
        ],
      });

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.itens).toHaveLength(2);
        expect(resultado.data.itens[0].tipoItem).toBe("CALCADO");
        expect(resultado.data.itens[0].servicos).toEqual([{ servicoId: "servico-1", valor: 40 }]);
        expect(resultado.data.valorEstimado).toBe(0);
      }
    });

    it("aceita item sem serviço", () => {
      const resultado = ordemServicoFormSchema.safeParse({
        ...base,
        itens: [{ descricao: "Bolsa de couro" }],
      });

      expect(resultado.success).toBe(true);
      if (resultado.success) {
        expect(resultado.data.itens[0].servicos).toEqual([]);
      }
    });

    it("exige descrição em cada item", () => {
      const resultado = ordemServicoFormSchema.safeParse({
        ...base,
        itens: [{ descricao: "Tênis preto" }, { descricao: " " }],
      });

      expect(resultado.success).toBe(false);
    });

    it("rejeita o mesmo serviço duas vezes no mesmo item", () => {
      const resultado = ordemServicoFormSchema.safeParse({
        ...base,
        itens: [{
          descricao: "Tênis preto",
          servicos: [
            { servicoId: "servico-1", valor: 10 },
            { servicoId: "servico-1", valor: 20 },
          ],
        }],
      });

      expect(resultado.success).toBe(false);
    });

    it("aceita o mesmo serviço em itens diferentes", () => {
      const resultado = ordemServicoFormSchema.safeParse({
        ...base,
        itens: [
          { descricao: "Tênis preto", servicos: [{ servicoId: "servico-1", valor: 10 }] },
          { descricao: "Tênis branco", servicos: [{ servicoId: "servico-1", valor: 10 }] },
        ],
      });

      expect(resultado.success).toBe(true);
    });

    it("limita a quantidade de itens por OS", () => {
      const resultado = ordemServicoFormSchema.safeParse({
        ...base,
        itens: Array.from({ length: 11 }, (_, indice) => ({ descricao: `Item ${indice + 1}` })),
      });

      expect(resultado.success).toBe(false);
    });
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
      numeroOS: "0001",
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
