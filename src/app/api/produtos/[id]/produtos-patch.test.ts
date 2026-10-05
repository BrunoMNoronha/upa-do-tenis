import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    produto: {
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@vercel/blob", () => ({ del: vi.fn() }));
// Enforcement de sessão é coberto em api-auth-enforcement.test.ts.
vi.mock("@/lib/auth-server", () => ({ exigirSessaoApi: vi.fn().mockResolvedValue(null) }));

import { PATCH } from "./route";

function criarRequest(body: unknown) {
  return new NextRequest("http://localhost/api/produtos/prod-1", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

const params = { params: Promise.resolve({ id: "prod-1" }) };

describe("PATCH /api/produtos/[id] — publicação no catálogo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.produto.update.mockResolvedValue({ id: "prod-1" });
  });

  it("publica o produto alterando somente a flag", async () => {
    const response = await PATCH(criarRequest({ publicadoNoCatalogo: true }), params);

    expect(response.status).toBe(200);
    expect(prismaMock.produto.update).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: { publicadoNoCatalogo: true },
    });
  });

  it("retira o produto do catálogo", async () => {
    await PATCH(criarRequest({ publicadoNoCatalogo: false }), params);

    expect(prismaMock.produto.update).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: { publicadoNoCatalogo: false },
    });
  });

  it("não aceita alterar estoque nem imagem pelo PATCH", async () => {
    await PATCH(criarRequest({ quantidadeEstoque: 99, imagemPathname: "x", publicadoNoCatalogo: true }), params);

    expect(prismaMock.produto.update).toHaveBeenCalledWith({
      where: { id: "prod-1" },
      data: { publicadoNoCatalogo: true },
    });
  });

  it("rejeita publicação não booleana (400)", async () => {
    const response = await PATCH(criarRequest({ publicadoNoCatalogo: "sim" }), params);

    expect(response.status).toBe(400);
    expect(prismaMock.produto.update).not.toHaveBeenCalled();
  });
});
