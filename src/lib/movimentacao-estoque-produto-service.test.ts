import { describe, it, expect, vi, beforeEach } from "vitest";
import { Prisma } from "@prisma/client";
import {
  baixarEstoqueProdutoVenda,
  criarProdutoComEstoqueInicial,
  listarMovimentacoesProduto,
  TipoMovimentacaoProduto,
  OrigemMovimentacaoProduto,
} from "./movimentacao-estoque-produto-service";

const { prismaMock } = vi.hoisted(() => {
  const mock: any = {
    produto: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    movimentacaoEstoqueProduto: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(async (cb: any) => cb(mock)),
  };
  return { prismaMock: mock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

describe("movimentacao-estoque-produto-service", () => {
  let txMock: Prisma.TransactionClient;

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock));

    txMock = {
      produto: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
        create: vi.fn(),
      },
      movimentacaoEstoqueProduto: {
        create: vi.fn(),
        findMany: vi.fn(),
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

  describe("criarProdutoComEstoqueInicial (Issue #5)", () => {
    it("deve criar produto com estoque inicial positivo e gerar ENTRADA_MANUAL", async () => {
      const produtoCriado = {
        id: "prod-100",
        nome: "Cadarço Branco",
        descricao: "120cm",
        precoVenda: new Prisma.Decimal(15),
        quantidadeEstoque: new Prisma.Decimal(20),
        ativo: true,
      };

      vi.mocked(txMock.produto.create).mockResolvedValue(produtoCriado as any);
      vi.mocked(txMock.movimentacaoEstoqueProduto.create).mockResolvedValue({
        id: "mov-1",
      } as any);

      const resultado = await criarProdutoComEstoqueInicial(
        {
          nome: "Cadarço Branco",
          descricao: "120cm",
          precoVenda: 15,
          quantidadeInicial: 20,
        },
        txMock,
      );

      expect(txMock.produto.create).toHaveBeenCalledWith({
        data: {
          nome: "Cadarço Branco",
          descricao: "120cm",
          precoVenda: 15,
          quantidadeEstoque: 20,
          ativo: true,
        },
      });

      expect(txMock.movimentacaoEstoqueProduto.create).toHaveBeenCalledWith({
        data: {
          produtoId: "prod-100",
          tipo: TipoMovimentacaoProduto.ENTRADA_MANUAL,
          quantidade: 20,
          saldoAnterior: 0,
          saldoPosterior: 20,
          origem: OrigemMovimentacaoProduto.MANUAL,
          observacao: "Estoque inicial no cadastro do produto",
        },
      });

      expect(resultado).toEqual(produtoCriado);
    });

    it("deve criar produto com saldo zero e NÃO gerar movimentação quando quantidadeInicial for zero", async () => {
      const produtoCriado = {
        id: "prod-101",
        nome: "Graxa Preta",
        precoVenda: new Prisma.Decimal(12),
        quantidadeEstoque: new Prisma.Decimal(0),
        ativo: true,
      };

      vi.mocked(txMock.produto.create).mockResolvedValue(produtoCriado as any);

      const resultado = await criarProdutoComEstoqueInicial(
        {
          nome: "Graxa Preta",
          precoVenda: 12,
          quantidadeInicial: 0,
        },
        txMock,
      );

      expect(txMock.produto.create).toHaveBeenCalledWith({
        data: {
          nome: "Graxa Preta",
          descricao: undefined,
          precoVenda: 12,
          quantidadeEstoque: 0,
          ativo: true,
        },
      });

      expect(txMock.movimentacaoEstoqueProduto.create).not.toHaveBeenCalled();
      expect(resultado).toEqual(produtoCriado);
    });

    it("deve criar produto com saldo zero e NÃO gerar movimentação quando quantidadeInicial for omitida", async () => {
      const produtoCriado = {
        id: "prod-102",
        nome: "Palmilha",
        precoVenda: new Prisma.Decimal(25),
        quantidadeEstoque: new Prisma.Decimal(0),
        ativo: true,
      };

      vi.mocked(txMock.produto.create).mockResolvedValue(produtoCriado as any);

      const resultado = await criarProdutoComEstoqueInicial(
        {
          nome: "Palmilha",
          precoVenda: 25,
        },
        txMock,
      );

      expect(txMock.produto.create).toHaveBeenCalledWith({
        data: {
          nome: "Palmilha",
          descricao: undefined,
          precoVenda: 25,
          quantidadeEstoque: 0,
          ativo: true,
        },
      });

      expect(txMock.movimentacaoEstoqueProduto.create).not.toHaveBeenCalled();
      expect(resultado).toEqual(produtoCriado);
    });

    it("deve rejeitar quantidade inicial negativa", async () => {
      await expect(
        criarProdutoComEstoqueInicial(
          {
            nome: "Produto Teste",
            precoVenda: 10,
            quantidadeInicial: -1,
          },
          txMock,
        ),
      ).rejects.toThrow("A quantidade inicial não pode ser negativa.");

      expect(txMock.produto.create).not.toHaveBeenCalled();
      expect(txMock.movimentacaoEstoqueProduto.create).not.toHaveBeenCalled();
    });

    it("deve rejeitar quantidade inicial não inteira", async () => {
      await expect(
        criarProdutoComEstoqueInicial(
          {
            nome: "Produto Teste",
            precoVenda: 10,
            quantidadeInicial: 4.5,
          },
          txMock,
        ),
      ).rejects.toThrow("A quantidade inicial deve ser um número inteiro.");

      expect(txMock.produto.create).not.toHaveBeenCalled();
    });

    it("deve usar transação global quando txClient não for fornecido", async () => {
      const produtoCriado = {
        id: "prod-103",
        nome: "Escova",
        precoVenda: new Prisma.Decimal(18),
        quantidadeEstoque: new Prisma.Decimal(5),
        ativo: true,
      };

      prismaMock.produto.create.mockResolvedValue(produtoCriado);
      prismaMock.movimentacaoEstoqueProduto.create.mockResolvedValue({ id: "mov-1" });

      const resultado = await criarProdutoComEstoqueInicial({
        nome: "Escova",
        precoVenda: 18,
        quantidadeInicial: 5,
      });

      expect(prismaMock.$transaction).toHaveBeenCalled();
      expect(prismaMock.produto.create).toHaveBeenCalled();
      expect(prismaMock.movimentacaoEstoqueProduto.create).toHaveBeenCalled();
      expect(resultado).toEqual(produtoCriado);
    });
  });

  describe("listarMovimentacoesProduto (Issue #5)", () => {
    it("deve retornar produto e movimentações normalizados", async () => {
      const produtoNoBanco = {
        id: "prod-200",
        nome: "Cadarço",
        descricao: "Preto",
        precoVenda: new Prisma.Decimal(10),
        quantidadeEstoque: new Prisma.Decimal(15),
        ativo: true,
      };

      const movsNoBanco = [
        {
          id: "mov-1",
          produtoId: "prod-200",
          tipo: "ENTRADA_MANUAL",
          quantidade: new Prisma.Decimal(15),
          saldoAnterior: new Prisma.Decimal(0),
          saldoPosterior: new Prisma.Decimal(15),
          origem: "MANUAL",
          observacao: "Estoque inicial no cadastro do produto",
          venda: null,
          criadoEm: new Date("2026-09-08T10:00:00Z"),
        },
      ];

      prismaMock.produto.findUnique.mockResolvedValue(produtoNoBanco);
      prismaMock.movimentacaoEstoqueProduto.findMany.mockResolvedValue(movsNoBanco);

      const resultado = await listarMovimentacoesProduto("prod-200");

      expect(prismaMock.produto.findUnique).toHaveBeenCalledWith({
        where: { id: "prod-200" },
      });
      expect(prismaMock.movimentacaoEstoqueProduto.findMany).toHaveBeenCalledWith({
        where: { produtoId: "prod-200" },
        orderBy: { criadoEm: "desc" },
        include: { venda: { select: { numero: true } } },
      });

      expect(resultado.produto.precoVenda).toBe(10);
      expect(resultado.produto.quantidadeEstoque).toBe(15);
      expect(resultado.movimentacoes[0].quantidade).toBe(15);
      expect(resultado.movimentacoes[0].saldoAnterior).toBe(0);
      expect(resultado.movimentacoes[0].saldoPosterior).toBe(15);
    });

    it("deve lançar 404 se produto não for encontrado", async () => {
      prismaMock.produto.findUnique.mockResolvedValue(null);

      await expect(listarMovimentacoesProduto("prod-inexistente")).rejects.toThrow(
        "Produto não encontrado.",
      );
    });
  });
});
