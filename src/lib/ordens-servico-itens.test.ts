import { describe, expect, it } from "vitest";

import {
  calcularSubtotalItem,
  calcularTotalItens,
  encontrarItemComServicoRepetido,
  listarServicoIdsDosItens,
  normalizarItensOrdemServico,
  resumirItensOrdem,
} from "./ordens-servico-itens";

describe("ordens-servico-itens (issue #205)", () => {
  describe("normalizarItensOrdemServico", () => {
    it("usa itens[] quando informado, preenchendo tipo e clientKey padrão", () => {
      const itens = normalizarItensOrdemServico({
        itens: [
          { descricao: "  Tênis preto ", servicos: [{ servicoId: "s1", valor: 10 }] },
          { clientKey: "  ", tipoItem: "BOLSA", descricao: "Bolsa", observacoes: " " },
        ],
      });

      expect(itens).toEqual([
        { clientKey: "item-1", tipoItem: "CALCADO", descricao: "Tênis preto", observacoes: undefined, servicos: [{ servicoId: "s1", valor: 10 }] },
        { clientKey: "item-2", tipoItem: "BOLSA", descricao: "Bolsa", observacoes: undefined, servicos: [] },
      ]);
    });

    it("converte o contrato antigo com lista de serviços em um item", () => {
      const itens = normalizarItensOrdemServico({
        itemRecebido: "Tênis preto",
        valorEstimado: 999,
        servicos: [{ servicoId: "s1", valor: 40 }],
      });

      expect(itens).toHaveLength(1);
      expect(itens[0].servicos).toEqual([{ servicoId: "s1", valor: 40 }]);
      expect(itens[0].valorSemServicos).toBeUndefined();
    });

    it("converte o contrato antigo com servicoId + valorEstimado", () => {
      const itens = normalizarItensOrdemServico({
        itemRecebido: "Tênis preto",
        servicoId: "s-legado",
        valorEstimado: 120,
      });

      expect(itens[0].servicos).toEqual([{ servicoId: "s-legado", valor: 120 }]);
    });

    it("mantém o valor manual do contrato antigo quando não há serviços", () => {
      const itens = normalizarItensOrdemServico({ itemRecebido: "Tênis preto", valorEstimado: 45 });

      expect(itens[0].servicos).toEqual([]);
      expect(itens[0].valorSemServicos).toBe(45);
      expect(calcularSubtotalItem(itens[0])).toBe(45);
    });

    it("devolve lista vazia quando não há item em nenhum contrato", () => {
      expect(normalizarItensOrdemServico({})).toEqual([]);
      expect(normalizarItensOrdemServico({ itemRecebido: "  " })).toEqual([]);
    });
  });

  describe("subtotais e total", () => {
    it("soma os serviços do item com arredondamento monetário", () => {
      expect(calcularSubtotalItem({ servicos: [{ servicoId: "a", valor: 10.1 }, { servicoId: "b", valor: 20.2 }] })).toBe(30.3);
    });

    it("item sem serviços no contrato novo vale zero", () => {
      expect(calcularSubtotalItem({ servicos: [] })).toBe(0);
    });

    it("total da OS é a soma dos subtotais", () => {
      expect(
        calcularTotalItens([
          { servicos: [{ servicoId: "a", valor: 40 }, { servicoId: "b", valor: 15 }] },
          { servicos: [{ servicoId: "c", valor: 90 }] },
          { servicos: [] },
        ]),
      ).toBe(145);
    });
  });

  describe("serviços por item", () => {
    it("aponta o item com serviço repetido", () => {
      expect(
        encontrarItemComServicoRepetido([
          { servicos: [{ servicoId: "a", valor: 1 }] },
          { servicos: [{ servicoId: "b", valor: 1 }, { servicoId: "b", valor: 2 }] },
        ]),
      ).toBe(1);
    });

    it("permite o mesmo serviço em itens diferentes", () => {
      expect(
        encontrarItemComServicoRepetido([
          { servicos: [{ servicoId: "a", valor: 1 }] },
          { servicos: [{ servicoId: "a", valor: 1 }] },
        ]),
      ).toBe(-1);
    });

    it("lista os IDs distintos de todos os itens", () => {
      expect(
        listarServicoIdsDosItens([
          { servicos: [{ servicoId: "a", valor: 1 }, { servicoId: "b", valor: 1 }] },
          { servicos: [{ servicoId: "a", valor: 1 }] },
          { servicos: [] },
        ]),
      ).toEqual(["a", "b"]);
    });
  });

  describe("resumirItensOrdem", () => {
    it("OS antiga com um item mantém o mesmo texto", () => {
      expect(
        resumirItensOrdem([{ descricao: "Tênis preto", servicos: [{ servico: { nome: "Limpeza" } }] }]),
      ).toEqual({ itens: "Tênis preto", servicos: "Limpeza", quantidade: 1 });
    });

    it("resume vários itens e agrega serviços distintos", () => {
      const resumo = resumirItensOrdem([
        { descricao: "Tênis preto", servicos: [{ servico: { nome: "Limpeza" } }] },
        { descricao: "Bota marrom", servicos: [{ servico: { nome: "Sola" } }, { servico: { nome: "Limpeza" } }] },
        { descricao: "Bolsa", servicos: [] },
      ]);

      expect(resumo).toEqual({
        itens: "3 itens: Tênis preto, Bota marrom +1",
        servicos: "Limpeza, Sola",
        quantidade: 3,
      });
    });

    it("sem itens ou sem serviços cai nos textos padrão", () => {
      expect(resumirItensOrdem([])).toEqual({ itens: "Nenhum", servicos: "Geral", quantidade: 0 });
      expect(resumirItensOrdem(undefined).itens).toBe("Nenhum");
    });
  });
});
