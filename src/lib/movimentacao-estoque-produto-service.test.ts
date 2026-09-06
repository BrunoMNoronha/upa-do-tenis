import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import { baixarEstoqueProdutoVenda } from "./movimentacao-estoque-produto-service";

describe("movimentacao-estoque-produto-service", () => {
  let txMock: Prisma.TransactionClient;

  beforeEach(() => {
    txMock = {
      produto: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      movimentacaoEstoqueProduto: {
        create: vi.fn(),
      },
    } as unknown as Prisma.TransactionClient;
  });

  describe("baixarEstoqueProdutoVenda", () => {
    it("deve realizar baixa atômica de estoque corretamente (happy path)", async () => {
      vi.mocked(txMock.produto.findUnique).mockResolvedValue({
        id: "prod-1",
        ativo: true,
        quantidadeEstoque: new Prisma.Decimal(10),
      } as any);

      vi.mocked(txMock.produto.updateMany).mockResolvedValue({
        count: 1,
      });

      vi.mocked(txMock.movimentacaoEstoqueProduto.create).mockResolvedValue({
        id: "mov-1",
        produtoId: "prod-1",
        // outras propriedades retornadas, não precisamos checar se o mock as tem
      } as any);

      const result = await baixarEstoqueProdutoVenda(
        {
          produtoId: "prod-1",
          quantidade: 3,
        },
        txMock
      );

      expect(txMock.produto.updateMany).toHaveBeenCalledWith({
        where: {
          id: "prod-1",
          ativo: true,
          quantidadeEstoque: { gte: 3 },
        },
        data: {
          quantidadeEstoque: { decrement: 3 },
        },
      });

      expect(txMock.movimentacaoEstoqueProduto.create).toHaveBeenCalledWith({
        data: {
          produtoId: "prod-1",
          tipo: "VENDA",
          quantidade: 3,
          saldoAnterior: 10,
          saldoPosterior: 7,
          origem: "VENDA_BALCAO",
          vendaId: undefined,
          itemVendaId: undefined,
          observacao: undefined,
        },
      });

      expect(result).toBeDefined();
    });

    it("deve lançar erro se quantidade <= 0", async () => {
      await expect(
        baixarEstoqueProdutoVenda(
          {
            produtoId: "prod-1",
            quantidade: 0,
          },
          txMock
        )
      ).rejects.toThrow("A quantidade da baixa deve ser maior que zero.");
    });

    it("deve lançar erro se produto não encontrado", async () => {
      vi.mocked(txMock.produto.findUnique).mockResolvedValue(null);

      await expect(
        baixarEstoqueProdutoVenda(
          {
            produtoId: "prod-1",
            quantidade: 1,
          },
          txMock
        )
      ).rejects.toThrow("Produto não encontrado.");
    });

    it("deve lançar erro se produto inativo", async () => {
      vi.mocked(txMock.produto.findUnique).mockResolvedValue({
        id: "prod-1",
        ativo: false,
        quantidadeEstoque: new Prisma.Decimal(10),
      } as any);

      await expect(
        baixarEstoqueProdutoVenda(
          {
            produtoId: "prod-1",
            quantidade: 1,
          },
          txMock
        )
      ).rejects.toThrow("Produto inativo não pode ser vendido.");
    });

    it("deve lançar erro de concorrência/estoque insuficiente se updateMany falhar (count !== 1)", async () => {
      vi.mocked(txMock.produto.findUnique).mockResolvedValue({
        id: "prod-1",
        ativo: true,
        quantidadeEstoque: new Prisma.Decimal(10),
      } as any);

      vi.mocked(txMock.produto.updateMany).mockResolvedValue({
        count: 0,
      });

      await expect(
        baixarEstoqueProdutoVenda(
          {
            produtoId: "prod-1",
            quantidade: 5,
          },
          txMock
        )
      ).rejects.toThrow("Estoque insuficiente para a venda.");
    });
  });
});
