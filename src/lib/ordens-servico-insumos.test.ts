import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  InsumoItemOrdemServicoError,
  registrarInsumoItemOrdemServico,
  removerInsumoItemOrdemServico,
  atualizarInsumoItemOrdemServico,
} from "@/lib/ordens-servico-insumos";

import { criarMovimentacaoEstoque } from "@/lib/movimentacao-estoque-service";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    $transaction: vi.fn(async (cb) => cb(prismaMock)),
    ordemServico: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    itemOrdemServico: {
      findFirst: vi.fn(),
    },
    insumo: {
      findUnique: vi.fn(),
    },
    insumoItemOrdem: {
      create: vi.fn(),
      findFirst: vi.fn(),
      delete: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/lib/movimentacao-estoque-service", () => ({
  criarMovimentacaoEstoque: vi.fn(),
  TipoMovimentacao: { BAIXA_OS: "BAIXA_OS", ESTORNO_OS: "ESTORNO_OS" },
  OrigemMovimentacao: { ORDEM_SERVICO: "ORDEM_SERVICO" }
}));

describe("ordens-servico-insumos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("registrarInsumoItemOrdemServico", () => {
    it("registra insumo válido, cria movimentação BAIXA_OS e calcula custo", async () => {
      prismaMock.ordemServico.findUnique.mockResolvedValueOnce({
        id: "os-1",
        valorTotal: new Prisma.Decimal(150),
        valorPago: new Prisma.Decimal(20),
        saldo: new Prisma.Decimal(130),
      });
      prismaMock.itemOrdemServico.findFirst.mockResolvedValueOnce({ id: "item-1" });
      prismaMock.insumo.findUnique.mockResolvedValueOnce({ id: "ins-1", quantidadeEstoque: 10 });
      prismaMock.insumoItemOrdem.create.mockResolvedValueOnce({
        id: "ins-item-1",
        quantidade: new Prisma.Decimal(2),
        custoUnitarioAplicado: new Prisma.Decimal(3.5),
        custoTotalAplicado: new Prisma.Decimal(7),
        insumo: { id: "ins-1", nome: "Cola", unidadeMedida: "ml" },
        itemOrdemServico: { id: "item-1", descricao: "Tenis" },
      });

      const resultado = await registrarInsumoItemOrdemServico("os-1", {
        itemOrdemServicoId: "item-1",
        insumoId: "ins-1",
        quantidade: 2,
        custoUnitarioAplicado: 3.5,
        observacoes: "Aplicado na sola",
      });

      expect(prismaMock.insumoItemOrdem.create).toHaveBeenCalled();
      expect(criarMovimentacaoEstoque).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: "BAIXA_OS",
          origem: "ORDEM_SERVICO",
          quantidade: 2,
        }),
        prismaMock
      );
      expect(resultado.insumoAplicado.custoTotalAplicado).toBe(7);
    });

    it("falha para estoque insuficiente", async () => {
      prismaMock.ordemServico.findUnique.mockResolvedValueOnce({ id: "os-1" });
      prismaMock.itemOrdemServico.findFirst.mockResolvedValueOnce({ id: "item-1" });
      prismaMock.insumo.findUnique.mockResolvedValueOnce({ id: "ins-1", quantidadeEstoque: 1 }); // Menor que 2

      await expect(
        registrarInsumoItemOrdemServico("os-1", {
          itemOrdemServicoId: "item-1",
          insumoId: "ins-1",
          quantidade: 2,
          custoUnitarioAplicado: 1,
        }),
      ).rejects.toMatchObject<InsumoItemOrdemServicoError>({
        message: "Estoque insuficiente.",
        status: 400,
      });

      expect(prismaMock.insumoItemOrdem.create).not.toHaveBeenCalled();
      expect(criarMovimentacaoEstoque).not.toHaveBeenCalled();
    });

    it("não altera financeiro da OS ao registrar insumo", async () => {
      prismaMock.ordemServico.findUnique.mockResolvedValueOnce({
        id: "os-1",
        valorTotal: new Prisma.Decimal(150),
        valorPago: new Prisma.Decimal(20),
        saldo: new Prisma.Decimal(130),
      });
      prismaMock.itemOrdemServico.findFirst.mockResolvedValueOnce({ id: "item-1" });
      prismaMock.insumo.findUnique.mockResolvedValueOnce({ id: "ins-1", quantidadeEstoque: 10 });
      prismaMock.insumoItemOrdem.create.mockResolvedValueOnce({
        id: "ins-item-2",
        quantidade: new Prisma.Decimal(1),
        custoUnitarioAplicado: new Prisma.Decimal(2),
        custoTotalAplicado: new Prisma.Decimal(2),
        insumo: { id: "ins-1", nome: "Cola" },
        itemOrdemServico: { id: "item-1" },
      });

      const resultado = await registrarInsumoItemOrdemServico("os-1", {
        itemOrdemServicoId: "item-1",
        insumoId: "ins-1",
        quantidade: 1,
        custoUnitarioAplicado: 2,
      });

      expect(resultado.ordemServico.valorTotal).toBe(150);
      expect(prismaMock.ordemServico.update).not.toHaveBeenCalled();
    });
  });

  describe("removerInsumoItemOrdemServico", () => {
    it("deve remover insumo e criar movimentação ESTORNO_OS", async () => {
      prismaMock.ordemServico.findUnique.mockResolvedValueOnce({ id: "os-1" });
      prismaMock.insumoItemOrdem.findFirst.mockResolvedValueOnce({
        id: "ins-item-1",
        insumoId: "ins-1",
        quantidade: 3,
        itemOrdemServicoId: "item-1"
      });

      await removerInsumoItemOrdemServico("os-1", "ins-item-1");

      expect(prismaMock.insumoItemOrdem.delete).toHaveBeenCalledWith({ where: { id: "ins-item-1" }});
      expect(criarMovimentacaoEstoque).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: "ESTORNO_OS",
          quantidade: 3,
          insumoId: "ins-1"
        }),
        prismaMock
      );
    });
  });

  describe("atualizarInsumoItemOrdemServico", () => {
    it("deve editar quantidade para maior e baixar somente a diferença", async () => {
      prismaMock.ordemServico.findUnique.mockResolvedValueOnce({ id: "os-1" });
      prismaMock.insumoItemOrdem.findFirst.mockResolvedValueOnce({
        id: "ins-item-1",
        insumoId: "ins-1",
        quantidade: 2,
        itemOrdemServicoId: "item-1",
        custoUnitarioAplicado: 10
      });

      // Alterando de 2 para 5
      await atualizarInsumoItemOrdemServico("os-1", "ins-item-1", { quantidade: 5 });

      expect(criarMovimentacaoEstoque).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: "BAIXA_OS",
          quantidade: 3, // Diferença
        }),
        prismaMock
      );
      
      expect(prismaMock.insumoItemOrdem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "ins-item-1" },
          data: expect.objectContaining({
            quantidade: 5,
            custoTotalAplicado: 50
          })
        })
      );
    });

    it("deve editar quantidade para menor e estornar somente a diferença", async () => {
      prismaMock.ordemServico.findUnique.mockResolvedValueOnce({ id: "os-1" });
      prismaMock.insumoItemOrdem.findFirst.mockResolvedValueOnce({
        id: "ins-item-1",
        insumoId: "ins-1",
        quantidade: 5,
        itemOrdemServicoId: "item-1",
        custoUnitarioAplicado: 10
      });

      // Alterando de 5 para 2
      await atualizarInsumoItemOrdemServico("os-1", "ins-item-1", { quantidade: 2 });

      expect(criarMovimentacaoEstoque).toHaveBeenCalledWith(
        expect.objectContaining({
          tipo: "ESTORNO_OS",
          quantidade: 3, // Diferença
        }),
        prismaMock
      );
    });
  });
});