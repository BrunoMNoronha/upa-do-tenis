import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { DELETE } from "./route";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    itemVenda: {
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

// Estes testes cobrem as regras de exclusão; simulam requisição já
// autenticada. O enforcement de sessão é coberto em api-auth-enforcement.test.ts.
vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
}));

function criarRequest(id: string) {
  return new NextRequest(`http://localhost/api/produtos/${id}`, { method: "DELETE" });
}

describe("DELETE /api/produtos/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloqueia exclusão de produto com venda vinculada (409)", async () => {
    prismaMock.itemVenda.count.mockResolvedValueOnce(2);

    const response = await DELETE(criarRequest("prod-1"), { params: { id: "prod-1" } });

    expect(response.status).toBe(409);
    expect(prismaMock.produto.delete).not.toHaveBeenCalled();
  });

  it("permite exclusão de produto sem histórico de venda (204)", async () => {
    prismaMock.itemVenda.count.mockResolvedValueOnce(0);
    prismaMock.produto.delete.mockResolvedValueOnce({ id: "prod-1" });

    const response = await DELETE(criarRequest("prod-1"), { params: { id: "prod-1" } });

    expect(response.status).toBe(204);
    expect(prismaMock.produto.delete).toHaveBeenCalledWith({ where: { id: "prod-1" } });
  });

  it("retorna 404 quando o produto não existe", async () => {
    prismaMock.itemVenda.count.mockResolvedValueOnce(0);
    prismaMock.produto.delete.mockRejectedValueOnce({ code: "P2025" });

    const response = await DELETE(criarRequest("inexistente"), { params: { id: "inexistente" } });

    expect(response.status).toBe(404);
  });
});
