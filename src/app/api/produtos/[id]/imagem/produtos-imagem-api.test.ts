import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { authMock, delMock, getMock, putMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  delMock: vi.fn(),
  getMock: vi.fn(),
  putMock: vi.fn(),
  prismaMock: {
    produto: {
      findUnique: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-server", () => ({ exigirSessaoApi: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@vercel/blob", () => ({ del: delMock, get: getMock, put: putMock }));

import { DELETE, GET, POST } from "./route";

const props = { params: Promise.resolve({ id: "prod-1" }) };
const JPEG = [0xff, 0xd8, 0xff, 0xdb];

function arquivo(nome: string, tipo: string, bytes: number[]) {
  return new File([Uint8Array.from(bytes)], nome, { type: tipo });
}

function requestPost(file: File | null, campo = "imagem") {
  const form = new FormData();
  if (file) form.set(campo, file);
  return new NextRequest("http://localhost/api/produtos/prod-1/imagem", { method: "POST", body: form });
}

function requestSimples(method: "GET" | "DELETE") {
  return new NextRequest("http://localhost/api/produtos/prod-1/imagem", { method });
}

describe("API da imagem do produto", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(null);
    prismaMock.produto.findUnique.mockResolvedValue({ id: "prod-1", imagemPathname: null });
    prismaMock.produto.updateMany.mockResolvedValue({ count: 1 });
    putMock.mockImplementation(async (pathname: string) => ({ pathname }));
    delMock.mockResolvedValue(undefined);
  });

  it("salva a imagem no Blob privado sob a pasta do catálogo, separada das fotos de OS", async () => {
    const response = await POST(requestPost(arquivo("foto.jpg", "image/jpeg", JPEG)), props);

    expect(response.status).toBe(201);
    expect(putMock).toHaveBeenCalledWith(
      expect.stringMatching(/^catalogo\/produtos\/prod-1\/[0-9a-f-]+\.jpg$/),
      expect.any(Buffer),
      expect.objectContaining({ access: "private", addRandomSuffix: false, maximumSizeInBytes: 4_000_000 }),
    );
    expect(prismaMock.produto.updateMany).toHaveBeenCalledWith({
      where: { id: "prod-1", imagemPathname: null },
      data: { imagemPathname: expect.stringMatching(/^catalogo\/produtos\/prod-1\//) },
    });
    expect(delMock).not.toHaveBeenCalled();
  });

  it("troca a imagem e remove a anterior do storage", async () => {
    prismaMock.produto.findUnique.mockResolvedValue({ id: "prod-1", imagemPathname: "catalogo/produtos/prod-1/antiga.webp" });

    const response = await POST(requestPost(arquivo("foto.jpg", "image/jpeg", JPEG)), props);

    expect(response.status).toBe(201);
    expect(delMock).toHaveBeenCalledWith("catalogo/produtos/prod-1/antiga.webp");
  });

  it("recusa conteúdo que não corresponde ao tipo declarado", async () => {
    const response = await POST(requestPost(arquivo("falsa.jpg", "image/jpeg", [1, 2, 3, 4])), props);

    expect(response.status).toBe(400);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("recusa requisição sem o campo imagem", async () => {
    const response = await POST(requestPost(arquivo("foto.jpg", "image/jpeg", JPEG), "foto"), props);

    expect(response.status).toBe(400);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("retorna 404 para produto inexistente sem tocar no storage", async () => {
    prismaMock.produto.findUnique.mockResolvedValue(null);

    const response = await POST(requestPost(arquivo("foto.jpg", "image/jpeg", JPEG)), props);

    expect(response.status).toBe(404);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("desfaz o upload quando a imagem mudou no meio (409)", async () => {
    prismaMock.produto.updateMany.mockResolvedValue({ count: 0 });

    const response = await POST(requestPost(arquivo("foto.jpg", "image/jpeg", JPEG)), props);

    expect(response.status).toBe(409);
    expect(delMock).toHaveBeenCalledWith(expect.stringMatching(/^catalogo\/produtos\/prod-1\//));
  });

  it("remove o blob novo quando o banco falha depois do upload", async () => {
    prismaMock.produto.updateMany.mockRejectedValue(new Error("banco fora"));
    vi.spyOn(console, "error").mockImplementation(() => undefined);

    const response = await POST(requestPost(arquivo("foto.jpg", "image/jpeg", JPEG)), props);

    expect(response.status).toBe(500);
    expect(delMock).toHaveBeenCalledWith(expect.stringMatching(/^catalogo\/produtos\/prod-1\//));
  });

  it("serve a imagem pelo proxy autenticado sem cache público", async () => {
    prismaMock.produto.findUnique.mockResolvedValue({ id: "prod-1", imagemPathname: "catalogo/produtos/prod-1/a.jpg" });
    getMock.mockResolvedValue({
      statusCode: 200,
      stream: new ReadableStream(),
      blob: { contentType: "image/jpeg", size: 4, etag: "\"e1\"" },
    });

    const response = await GET(requestSimples("GET"), props);

    expect(response.status).toBe(200);
    expect(getMock).toHaveBeenCalledWith("catalogo/produtos/prod-1/a.jpg", expect.objectContaining({ access: "private" }));
    expect(response.headers.get("Cache-Control")).toBe("private, no-cache");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("GET retorna 404 quando o produto não tem imagem", async () => {
    const response = await GET(requestSimples("GET"), props);

    expect(response.status).toBe(404);
    expect(getMock).not.toHaveBeenCalled();
  });

  it("DELETE desvincula e remove a imagem do storage", async () => {
    prismaMock.produto.findUnique.mockResolvedValue({ id: "prod-1", imagemPathname: "catalogo/produtos/prod-1/a.jpg" });

    const response = await DELETE(requestSimples("DELETE"), props);

    expect(response.status).toBe(204);
    expect(prismaMock.produto.updateMany).toHaveBeenCalledWith({
      where: { id: "prod-1", imagemPathname: "catalogo/produtos/prod-1/a.jpg" },
      data: { imagemPathname: null },
    });
    expect(delMock).toHaveBeenCalledWith("catalogo/produtos/prod-1/a.jpg");
  });

  it("DELETE sem imagem é idempotente", async () => {
    const response = await DELETE(requestSimples("DELETE"), props);

    expect(response.status).toBe(204);
    expect(prismaMock.produto.updateMany).not.toHaveBeenCalled();
    expect(delMock).not.toHaveBeenCalled();
  });

  it("exige sessão em todas as operações", async () => {
    authMock.mockResolvedValue(new Response(null, { status: 401 }));

    expect((await GET(requestSimples("GET"), props)).status).toBe(401);
    expect((await POST(requestPost(arquivo("foto.jpg", "image/jpeg", JPEG)), props)).status).toBe(401);
    expect((await DELETE(requestSimples("DELETE"), props)).status).toBe(401);
    expect(prismaMock.produto.findUnique).not.toHaveBeenCalled();
    expect(putMock).not.toHaveBeenCalled();
  });
});
