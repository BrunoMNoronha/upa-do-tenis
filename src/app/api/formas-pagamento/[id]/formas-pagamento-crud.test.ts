import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { DELETE, PATCH } from "./route";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    pagamento: {
      count: vi.fn(),
    },
    venda: {
      count: vi.fn(),
    },
    movimentacaoCaixa: {
      count: vi.fn(),
    },
    formaPagamento: {
      findUnique: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

// Estes testes cobrem as regras de edição e exclusão; simulam requisição já
// autenticada. O enforcement de sessão é coberto em api-auth-enforcement.test.ts.
vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
}));

function criarRequest(id: string, method: string, body?: unknown) {
  return new NextRequest(`http://localhost/api/formas-pagamento/${id}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

function comMovimento(pagamentos: number, vendas: number, movimentacoesCaixa: number) {
  prismaMock.pagamento.count.mockResolvedValueOnce(pagamentos);
  prismaMock.venda.count.mockResolvedValueOnce(vendas);
  prismaMock.movimentacaoCaixa.count.mockResolvedValueOnce(movimentacoesCaixa);
}

describe("PATCH /api/formas-pagamento/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("permite trocar o tipo quando não há movimento financeiro (200)", async () => {
    prismaMock.formaPagamento.findUnique.mockResolvedValueOnce({ tipo: "PIX" });
    comMovimento(0, 0, 0);
    prismaMock.formaPagamento.update.mockResolvedValueOnce({ id: "fp-1", tipo: "DINHEIRO" });

    const response = await PATCH(criarRequest("fp-1", "PATCH", { tipo: "DINHEIRO" }), {
      params: { id: "fp-1" },
    });

    expect(response.status).toBe(200);
    expect(prismaMock.formaPagamento.update).toHaveBeenCalledWith({
      where: { id: "fp-1" },
      data: { tipo: "DINHEIRO" },
    });
  });

  it("bloqueia troca de tipo quando já existe pagamento vinculado (409)", async () => {
    prismaMock.formaPagamento.findUnique.mockResolvedValueOnce({ tipo: "PIX" });
    comMovimento(1, 0, 0);

    const response = await PATCH(criarRequest("fp-1", "PATCH", { tipo: "DINHEIRO" }), {
      params: { id: "fp-1" },
    });

    expect(response.status).toBe(409);
    expect(prismaMock.formaPagamento.update).not.toHaveBeenCalled();
  });

  it("bloqueia troca de tipo quando já existe venda vinculada (409)", async () => {
    prismaMock.formaPagamento.findUnique.mockResolvedValueOnce({ tipo: "PIX" });
    comMovimento(0, 2, 0);

    const response = await PATCH(criarRequest("fp-1", "PATCH", { tipo: "DINHEIRO" }), {
      params: { id: "fp-1" },
    });

    expect(response.status).toBe(409);
    expect(prismaMock.formaPagamento.update).not.toHaveBeenCalled();
  });

  it("bloqueia troca de tipo quando já existe movimentação de caixa vinculada (409)", async () => {
    prismaMock.formaPagamento.findUnique.mockResolvedValueOnce({ tipo: "PIX" });
    comMovimento(0, 0, 4);

    const response = await PATCH(criarRequest("fp-1", "PATCH", { tipo: "DINHEIRO" }), {
      params: { id: "fp-1" },
    });

    expect(response.status).toBe(409);
    expect(prismaMock.formaPagamento.update).not.toHaveBeenCalled();
  });

  it("aceita reenvio do mesmo tipo mesmo com movimento (200)", async () => {
    prismaMock.formaPagamento.findUnique.mockResolvedValueOnce({ tipo: "PIX" });
    prismaMock.formaPagamento.update.mockResolvedValueOnce({ id: "fp-1", nome: "PIX Loja" });

    const response = await PATCH(criarRequest("fp-1", "PATCH", { nome: "PIX Loja", tipo: "PIX" }), {
      params: { id: "fp-1" },
    });

    expect(response.status).toBe(200);
    expect(prismaMock.pagamento.count).not.toHaveBeenCalled();
    expect(prismaMock.formaPagamento.update).toHaveBeenCalledWith({
      where: { id: "fp-1" },
      data: { nome: "PIX Loja" },
    });
  });

  it("permite renomear e inativar uma forma com movimento (200)", async () => {
    prismaMock.formaPagamento.findUnique.mockResolvedValueOnce({ tipo: "DINHEIRO" });
    prismaMock.formaPagamento.update.mockResolvedValueOnce({ id: "fp-1", ativo: false });

    const response = await PATCH(criarRequest("fp-1", "PATCH", { nome: "Dinheiro", ativo: false }), {
      params: { id: "fp-1" },
    });

    expect(response.status).toBe(200);
    expect(prismaMock.pagamento.count).not.toHaveBeenCalled();
    expect(prismaMock.formaPagamento.update).toHaveBeenCalledWith({
      where: { id: "fp-1" },
      data: { nome: "Dinheiro", ativo: false },
    });
  });

  it("rejeita tipo fora do enum (400)", async () => {
    const response = await PATCH(criarRequest("fp-1", "PATCH", { tipo: "BOLETO" }), {
      params: { id: "fp-1" },
    });

    expect(response.status).toBe(400);
    expect(prismaMock.formaPagamento.update).not.toHaveBeenCalled();
  });

  it("retorna 404 quando a forma de pagamento não existe", async () => {
    prismaMock.formaPagamento.findUnique.mockResolvedValueOnce(null);

    const response = await PATCH(criarRequest("inexistente", "PATCH", { nome: "Qualquer" }), {
      params: { id: "inexistente" },
    });

    expect(response.status).toBe(404);
    expect(prismaMock.formaPagamento.update).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/formas-pagamento/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloqueia exclusão de forma com movimento financeiro (409)", async () => {
    comMovimento(0, 1, 0);

    const response = await DELETE(criarRequest("fp-1", "DELETE"), { params: { id: "fp-1" } });

    expect(response.status).toBe(409);
    expect(prismaMock.formaPagamento.delete).not.toHaveBeenCalled();
  });

  it("permite exclusão de forma sem movimento (204)", async () => {
    comMovimento(0, 0, 0);
    prismaMock.formaPagamento.delete.mockResolvedValueOnce({ id: "fp-1" });

    const response = await DELETE(criarRequest("fp-1", "DELETE"), { params: { id: "fp-1" } });

    expect(response.status).toBe(204);
    expect(prismaMock.formaPagamento.delete).toHaveBeenCalledWith({ where: { id: "fp-1" } });
  });

  it("retorna 404 quando a forma de pagamento não existe", async () => {
    comMovimento(0, 0, 0);
    prismaMock.formaPagamento.delete.mockRejectedValueOnce({ code: "P2025" });

    const response = await DELETE(criarRequest("inexistente", "DELETE"), {
      params: { id: "inexistente" },
    });

    expect(response.status).toBe(404);
  });
});
