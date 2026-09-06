import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { DELETE, PATCH } from "./route";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    movimentacaoEstoqueInsumo: {
      count: vi.fn(),
    },
    insumoItemOrdem: {
      count: vi.fn(),
    },
    insumo: {
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
  return new NextRequest(`http://localhost/api/insumos/${id}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("PATCH /api/insumos/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("atualiza os campos de cadastro informados (200)", async () => {
    prismaMock.insumo.update.mockResolvedValueOnce({ id: "ins-1", nome: "Cola de contato" });

    const response = await PATCH(
      criarRequest("ins-1", "PATCH", { nome: "Cola de contato", estoqueMinimo: 5 }),
      { params: { id: "ins-1" } }
    );

    expect(response.status).toBe(200);
    expect(prismaMock.insumo.update).toHaveBeenCalledWith({
      where: { id: "ins-1" },
      data: { nome: "Cola de contato", estoqueMinimo: 5 },
    });
  });

  it("ignora quantidadeEstoque: o saldo só muda por movimentação", async () => {
    prismaMock.insumo.update.mockResolvedValueOnce({ id: "ins-1" });

    const response = await PATCH(
      criarRequest("ins-1", "PATCH", { nome: "Cola de contato", quantidadeEstoque: 999 }),
      { params: { id: "ins-1" } }
    );

    expect(response.status).toBe(200);
    expect(prismaMock.insumo.update).toHaveBeenCalledWith({
      where: { id: "ins-1" },
      data: { nome: "Cola de contato" },
    });
  });

  it("rejeita payload inválido (400)", async () => {
    const response = await PATCH(criarRequest("ins-1", "PATCH", { unidadeMedida: "" }), {
      params: { id: "ins-1" },
    });

    expect(response.status).toBe(400);
    expect(prismaMock.insumo.update).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o insumo não existe", async () => {
    prismaMock.insumo.update.mockRejectedValueOnce({ code: "P2025" });

    const response = await PATCH(criarRequest("inexistente", "PATCH", { nome: "Qualquer" }), {
      params: { id: "inexistente" },
    });

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/insumos/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloqueia exclusão de insumo com movimentação de estoque (409)", async () => {
    prismaMock.movimentacaoEstoqueInsumo.count.mockResolvedValueOnce(2);
    prismaMock.insumoItemOrdem.count.mockResolvedValueOnce(0);

    const response = await DELETE(criarRequest("ins-1", "DELETE"), { params: { id: "ins-1" } });

    expect(response.status).toBe(409);
    expect(prismaMock.insumo.delete).not.toHaveBeenCalled();
  });

  it("bloqueia exclusão de insumo consumido em ordem de serviço, mesmo sem movimentação (409)", async () => {
    prismaMock.movimentacaoEstoqueInsumo.count.mockResolvedValueOnce(0);
    prismaMock.insumoItemOrdem.count.mockResolvedValueOnce(1);

    const response = await DELETE(criarRequest("ins-1", "DELETE"), { params: { id: "ins-1" } });

    expect(response.status).toBe(409);
    expect(prismaMock.insumo.delete).not.toHaveBeenCalled();
  });

  it("permite exclusão de insumo sem vínculo (204)", async () => {
    prismaMock.movimentacaoEstoqueInsumo.count.mockResolvedValueOnce(0);
    prismaMock.insumoItemOrdem.count.mockResolvedValueOnce(0);
    prismaMock.insumo.delete.mockResolvedValueOnce({ id: "ins-1" });

    const response = await DELETE(criarRequest("ins-1", "DELETE"), { params: { id: "ins-1" } });

    expect(response.status).toBe(204);
    expect(prismaMock.insumo.delete).toHaveBeenCalledWith({ where: { id: "ins-1" } });
  });

  it("retorna 404 quando o insumo não existe", async () => {
    prismaMock.movimentacaoEstoqueInsumo.count.mockResolvedValueOnce(0);
    prismaMock.insumoItemOrdem.count.mockResolvedValueOnce(0);
    prismaMock.insumo.delete.mockRejectedValueOnce({ code: "P2025" });

    const response = await DELETE(criarRequest("inexistente", "DELETE"), {
      params: { id: "inexistente" },
    });

    expect(response.status).toBe(404);
  });
});
