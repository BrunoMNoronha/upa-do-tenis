import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { DELETE } from "./route";

const { prismaMock, delMock } = vi.hoisted(() => ({
  delMock: vi.fn(),
  prismaMock: {
    itemVenda: {
      count: vi.fn(),
    },
    movimentacaoEstoqueProduto: {
      count: vi.fn(),
    },
    produto: {
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@vercel/blob", () => ({ del: delMock }));

// Estes testes cobrem as regras de exclusão; simulam requisição já
// autenticada. O enforcement de sessão é coberto em api-auth-enforcement.test.ts.
vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
}));

function criarRequest(id: string) {
  return new NextRequest(`http://localhost/api/produtos/${id}`, { method: "DELETE" });
}

const wrapParams = (id: string) => ({ params: Promise.resolve({ id }) });

describe("DELETE /api/produtos/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloqueia exclusão de produto com venda vinculada (409)", async () => {
    prismaMock.itemVenda.count.mockResolvedValueOnce(2);
    prismaMock.movimentacaoEstoqueProduto.count.mockResolvedValueOnce(0);

    const response = await DELETE(criarRequest("prod-1"), wrapParams("prod-1"));

    expect(response.status).toBe(409);
    expect(prismaMock.produto.delete).not.toHaveBeenCalled();
  });

  it("bloqueia exclusão de produto com movimentação de estoque, mesmo sem venda (409)", async () => {
    prismaMock.itemVenda.count.mockResolvedValueOnce(0);
    prismaMock.movimentacaoEstoqueProduto.count.mockResolvedValueOnce(1);

    const response = await DELETE(criarRequest("prod-1"), wrapParams("prod-1"));

    expect(response.status).toBe(409);
    expect(prismaMock.produto.delete).not.toHaveBeenCalled();
  });

  it("permite exclusão de produto sem histórico de venda (204)", async () => {
    prismaMock.itemVenda.count.mockResolvedValueOnce(0);
    prismaMock.movimentacaoEstoqueProduto.count.mockResolvedValueOnce(0);
    prismaMock.produto.delete.mockResolvedValueOnce({ imagemPathname: null });

    const response = await DELETE(criarRequest("prod-1"), wrapParams("prod-1"));

    expect(response.status).toBe(204);
    expect(prismaMock.produto.delete).toHaveBeenCalledWith({ where: { id: "prod-1" }, select: { imagemPathname: true } });
    expect(delMock).not.toHaveBeenCalled();
  });

  it("remove do storage a imagem do produto excluído", async () => {
    prismaMock.itemVenda.count.mockResolvedValueOnce(0);
    prismaMock.movimentacaoEstoqueProduto.count.mockResolvedValueOnce(0);
    prismaMock.produto.delete.mockResolvedValueOnce({ imagemPathname: "catalogo/produtos/prod-1/a.webp" });
    delMock.mockResolvedValueOnce(undefined);

    const response = await DELETE(criarRequest("prod-1"), wrapParams("prod-1"));

    expect(response.status).toBe(204);
    expect(delMock).toHaveBeenCalledWith("catalogo/produtos/prod-1/a.webp");
  });

  it("mantém 204 quando a remoção da imagem no storage falha", async () => {
    prismaMock.itemVenda.count.mockResolvedValueOnce(0);
    prismaMock.movimentacaoEstoqueProduto.count.mockResolvedValueOnce(0);
    prismaMock.produto.delete.mockResolvedValueOnce({ imagemPathname: "catalogo/produtos/prod-1/a.webp" });
    delMock.mockRejectedValueOnce(new Error("storage fora"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await DELETE(criarRequest("prod-1"), wrapParams("prod-1"));

    expect(response.status).toBe(204);
  });

  it("não remove do storage arquivo fora da pasta do produto", async () => {
    prismaMock.itemVenda.count.mockResolvedValueOnce(0);
    prismaMock.movimentacaoEstoqueProduto.count.mockResolvedValueOnce(0);
    prismaMock.produto.delete.mockResolvedValueOnce({ imagemPathname: "ordens-servico/os-1/itens/i/a.jpg" });

    const response = await DELETE(criarRequest("prod-1"), wrapParams("prod-1"));

    expect(response.status).toBe(204);
    expect(delMock).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o produto não existe", async () => {
    prismaMock.itemVenda.count.mockResolvedValueOnce(0);
    prismaMock.movimentacaoEstoqueProduto.count.mockResolvedValueOnce(0);
    prismaMock.produto.delete.mockRejectedValueOnce({ code: "P2025" });

    const response = await DELETE(criarRequest("inexistente"), wrapParams("inexistente"));

    expect(response.status).toBe(404);
  });
});
