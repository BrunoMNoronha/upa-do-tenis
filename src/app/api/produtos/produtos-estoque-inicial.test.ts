import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { POST } from "./route";
import { GET as getMovimentacoes } from "./[id]/movimentacoes/route";

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

vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
}));

function criarRequest(body: unknown) {
  return new NextRequest("http://localhost/api/produtos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function criarGetRequest(id: string) {
  return new NextRequest(`http://localhost/api/produtos/${id}/movimentacoes`, {
    method: "GET",
  });
}

describe("POST /api/produtos — Estoque Inicial Rastreável (Issue #5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (cb: any) => cb(prismaMock));
  });

  it("cria produto com estoque inicial positivo e gera movimentação ENTRADA_MANUAL", async () => {
    const produtoCriado = {
      id: "prod-1",
      nome: "Cadarço Preto",
      descricao: "120cm",
      precoVenda: new Prisma.Decimal(15),
      quantidadeEstoque: new Prisma.Decimal(30),
      ativo: true,
    };

    prismaMock.produto.create.mockResolvedValue(produtoCriado);
    prismaMock.movimentacaoEstoqueProduto.create.mockResolvedValue({ id: "mov-1" });

    const response = await POST(
      criarRequest({
        nome: "Cadarço Preto",
        descricao: "120cm",
        precoVenda: 15,
        quantidadeInicial: 30,
      }),
    );

    expect(response.status).toBe(201);
    expect(prismaMock.$transaction).toHaveBeenCalled();
    expect(prismaMock.produto.create).toHaveBeenCalledWith({
      data: {
        nome: "Cadarço Preto",
        descricao: "120cm",
        precoVenda: 15,
        quantidadeEstoque: 30,
        ativo: true,
      },
    });
    expect(prismaMock.movimentacaoEstoqueProduto.create).toHaveBeenCalledWith({
      data: {
        produtoId: "prod-1",
        tipo: "ENTRADA_MANUAL",
        quantidade: 30,
        saldoAnterior: 0,
        saldoPosterior: 30,
        origem: "MANUAL",
        observacao: "Estoque inicial no cadastro do produto",
      },
    });
  });

  it("cria produto com estoque zero e NÃO gera movimentação quando quantidadeInicial for zero", async () => {
    const produtoCriado = {
      id: "prod-2",
      nome: "Graxa Marrom",
      precoVenda: new Prisma.Decimal(12),
      quantidadeEstoque: new Prisma.Decimal(0),
      ativo: true,
    };

    prismaMock.produto.create.mockResolvedValue(produtoCriado);

    const response = await POST(
      criarRequest({
        nome: "Graxa Marrom",
        precoVenda: 12,
        quantidadeInicial: 0,
      }),
    );

    expect(response.status).toBe(201);
    expect(prismaMock.produto.create).toHaveBeenCalledWith({
      data: {
        nome: "Graxa Marrom",
        descricao: undefined,
        precoVenda: 12,
        quantidadeEstoque: 0,
        ativo: true,
      },
    });
    expect(prismaMock.movimentacaoEstoqueProduto.create).not.toHaveBeenCalled();
  });

  it("cria produto com estoque zero e NÃO gera movimentação quando quantidadeInicial for omitida", async () => {
    const produtoCriado = {
      id: "prod-3",
      nome: "Palmilha Ortopédica",
      precoVenda: new Prisma.Decimal(45),
      quantidadeEstoque: new Prisma.Decimal(0),
      ativo: true,
    };

    prismaMock.produto.create.mockResolvedValue(produtoCriado);

    const response = await POST(
      criarRequest({
        nome: "Palmilha Ortopédica",
        precoVenda: 45,
      }),
    );

    expect(response.status).toBe(201);
    expect(prismaMock.produto.create).toHaveBeenCalledWith({
      data: {
        nome: "Palmilha Ortopédica",
        descricao: undefined,
        precoVenda: 45,
        quantidadeEstoque: 0,
        ativo: true,
      },
    });
    expect(prismaMock.movimentacaoEstoqueProduto.create).not.toHaveBeenCalled();
  });

  it("rejeita quantidade inicial negativa com 400", async () => {
    const response = await POST(
      criarRequest({
        nome: "Produto Inválido",
        precoVenda: 10,
        quantidadeInicial: -5,
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Dados inválidos.");
    expect(prismaMock.produto.create).not.toHaveBeenCalled();
  });

  it("rejeita quantidade inicial fracionária com 400", async () => {
    const response = await POST(
      criarRequest({
        nome: "Produto Inválido",
        precoVenda: 10,
        quantidadeInicial: 2.5,
      }),
    );

    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.message).toBe("Dados inválidos.");
    expect(prismaMock.produto.create).not.toHaveBeenCalled();
  });
});

describe("GET /api/produtos/[id]/movimentacoes — Extrato de Movimentações (Issue #5)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna o produto e suas movimentações com sucesso", async () => {
    prismaMock.produto.findUnique.mockResolvedValue({
      id: "prod-1",
      nome: "Cadarço Preto",
      precoVenda: new Prisma.Decimal(15),
      quantidadeEstoque: new Prisma.Decimal(30),
      ativo: true,
    });

    prismaMock.movimentacaoEstoqueProduto.findMany.mockResolvedValue([
      {
        id: "mov-1",
        produtoId: "prod-1",
        tipo: "ENTRADA_MANUAL",
        quantidade: new Prisma.Decimal(30),
        saldoAnterior: new Prisma.Decimal(0),
        saldoPosterior: new Prisma.Decimal(30),
        origem: "MANUAL",
        observacao: "Estoque inicial no cadastro do produto",
        venda: null,
        criadoEm: new Date("2026-09-08T10:00:00Z"),
      },
    ]);

    const response = await getMovimentacoes(
      criarGetRequest("prod-1"),
      { params: Promise.resolve({ id: "prod-1" }) },
    );

    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.produto.nome).toBe("Cadarço Preto");
    expect(body.produto.quantidadeEstoque).toBe(30);
    expect(body.movimentacoes).toHaveLength(1);
    expect(body.movimentacoes[0].tipo).toBe("ENTRADA_MANUAL");
    expect(body.movimentacoes[0].saldoPosterior).toBe(30);
  });

  it("retorna 404 quando o produto não for encontrado", async () => {
    prismaMock.produto.findUnique.mockResolvedValue(null);

    const response = await getMovimentacoes(
      criarGetRequest("prod-inexistente"),
      { params: Promise.resolve({ id: "prod-inexistente" }) },
    );

    expect(response.status).toBe(404);
  });
});
