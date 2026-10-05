import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { buscarPorIds, obterImagem, getMock } = vi.hoisted(() => ({
  buscarPorIds: vi.fn(),
  obterImagem: vi.fn(),
  getMock: vi.fn(),
}));

vi.mock("@/lib/catalogo-publico", () => ({
  buscarProdutosCatalogoPorIds: buscarPorIds,
  obterImagemProdutoCatalogo: obterImagem,
}));
vi.mock("@vercel/blob", () => ({ get: getMock }));
// As rotas públicas não podem depender de sessão: qualquer import dispara erro.
vi.mock("@/lib/auth-server", () => {
  throw new Error("Rota pública do catálogo não pode importar auth-server.");
});

import { GET as revalidarGet } from "./produtos/route";
import { GET as imagemGet } from "./produtos/[id]/imagem/route";

function req(path: string, headers: Record<string, string> = {}) {
  return new NextRequest(`http://localhost${path}`, { headers });
}

describe("GET /api/catalogo/produtos (revalidação pública)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    buscarPorIds.mockResolvedValue([
      { id: "p1", nome: "Cadarço", descricao: "x", precoCentavos: 1000, versaoImagem: "abc" },
    ]);
  });

  it("devolve só id, nome e preço dos visíveis, sem cache", async () => {
    const response = await revalidarGet(req("/api/catalogo/produtos?ids=p1,p2,p1"));

    expect(response.status).toBe(200);
    expect(buscarPorIds).toHaveBeenCalledWith(["p1", "p2"]);
    expect(await response.json()).toEqual({ produtos: [{ id: "p1", nome: "Cadarço", precoCentavos: 1000 }] });
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it.each([
    "/api/catalogo/produtos",
    "/api/catalogo/produtos?ids=",
    "/api/catalogo/produtos?ids=../caixa",
    `/api/catalogo/produtos?ids=${Array.from({ length: 51 }, (_, i) => `p${i}`).join(",")}`,
  ])("recusa %s sem consultar o banco", async (path) => {
    const response = await revalidarGet(req(path));

    expect(response.status).toBe(400);
    expect(buscarPorIds).not.toHaveBeenCalled();
  });

  it("falha de leitura vira 503 recuperável", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    buscarPorIds.mockRejectedValue(new Error("banco fora"));

    const response = await revalidarGet(req("/api/catalogo/produtos?ids=p1"));

    expect(response.status).toBe(503);
  });
});

describe("GET /api/catalogo/produtos/[id]/imagem (pública)", () => {
  const props = (id: string) => ({ params: Promise.resolve({ id }) });

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("serve imagem de produto visível com revalidação obrigatória", async () => {
    obterImagem.mockResolvedValue("catalogo/produtos/p1/a.webp");
    getMock.mockResolvedValue({ statusCode: 200, stream: new ReadableStream(), blob: { contentType: "image/webp", size: 10, etag: "\"e\"" } });

    const response = await imagemGet(req("/api/catalogo/produtos/p1/imagem"), props("p1"));

    expect(response.status).toBe(200);
    expect(getMock).toHaveBeenCalledWith("catalogo/produtos/p1/a.webp", expect.objectContaining({ access: "private" }));
    expect(response.headers.get("Cache-Control")).toBe("public, no-cache");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("responde 304 com ETag", async () => {
    obterImagem.mockResolvedValue("catalogo/produtos/p1/a.webp");
    getMock.mockResolvedValue({ statusCode: 304, blob: { etag: "\"e\"" } });

    const response = await imagemGet(req("/api/catalogo/produtos/p1/imagem", { "if-none-match": "\"e\"" }), props("p1"));

    expect(response.status).toBe(304);
    expect(getMock).toHaveBeenCalledWith("catalogo/produtos/p1/a.webp", expect.objectContaining({ ifNoneMatch: "\"e\"" }));
  });

  it("404 para produto retirado, inativo ou sem estoque (consulta já filtrada)", async () => {
    obterImagem.mockResolvedValue(null);

    const response = await imagemGet(req("/api/catalogo/produtos/p1/imagem"), props("p1"));

    expect(response.status).toBe(404);
    expect(getMock).not.toHaveBeenCalled();
  });

  it("nunca serve arquivo fora da pasta do catálogo do produto (ex.: foto de OS)", async () => {
    obterImagem.mockResolvedValue("ordens-servico/os-1/itens/i/foto.jpg");

    const response = await imagemGet(req("/api/catalogo/produtos/p1/imagem"), props("p1"));

    expect(response.status).toBe(404);
    expect(getMock).not.toHaveBeenCalled();
  });

  it("id malformado é 404 sem consultar", async () => {
    const response = await imagemGet(req("/api/catalogo/produtos/x/imagem"), props("../../caixa"));

    expect(response.status).toBe(404);
    expect(obterImagem).not.toHaveBeenCalled();
  });
});
