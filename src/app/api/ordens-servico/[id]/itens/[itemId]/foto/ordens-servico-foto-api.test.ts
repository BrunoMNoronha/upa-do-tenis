import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const { authMock, delMock, getMock, putMock, prismaMock } = vi.hoisted(() => ({
  authMock: vi.fn(),
  delMock: vi.fn(),
  getMock: vi.fn(),
  putMock: vi.fn(),
  prismaMock: {
    itemOrdemServico: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth-server", () => ({ exigirSessaoApi: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@vercel/blob", () => ({ del: delMock, get: getMock, put: putMock }));

import { DELETE, GET, POST } from "./route";

const props = { params: Promise.resolve({ id: "os-1", itemId: "item-1" }) };

function item(status = "ABERTA", pathname: string | null = null) {
  return {
    id: "item-1",
    ordemServicoId: "os-1",
    fotoRecebimentoPathname: pathname,
    ordemServico: { status },
  };
}

function arquivo(nome: string, tipo: string, bytes: number[]) {
  return new File([Uint8Array.from(bytes)], nome, { type: tipo });
}

function requestPost(file: File) {
  const form = new FormData();
  form.set("foto", file);
  return new NextRequest("http://localhost/api/ordens-servico/os-1/itens/item-1/foto", {
    method: "POST",
    body: form,
  });
}

describe("API da foto de recebimento da OS", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(null);
    prismaMock.itemOrdemServico.findFirst.mockResolvedValue(item());
    prismaMock.itemOrdemServico.updateMany.mockResolvedValue({ count: 1 });
    putMock.mockResolvedValue({ pathname: "ordens-servico/os-1/itens/item-1/nova.jpg" });
    delMock.mockResolvedValue(undefined);
  });

  it.each([
    ["JPEG", arquivo("foto.jpg", "image/jpeg", [0xff, 0xd8, 0xff, 0xdb])],
    ["PNG", arquivo("foto.png", "image/png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])],
    ["WebP", arquivo("foto.webp", "image/webp", [0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50])],
  ])("salva imagem %s válida em Blob privado", async (_formato, file) => {
    const response = await POST(requestPost(file), props);

    expect(response.status).toBe(201);
    expect(putMock).toHaveBeenCalledWith(
      expect.stringMatching(/^ordens-servico\/os-1\/itens\/item-1\/.+\.(jpg|png|webp)$/),
      expect.any(Buffer),
      expect.objectContaining({ access: "private", addRandomSuffix: false, maximumSizeInBytes: 4_000_000 }),
    );
  });

  it("recusa conteúdo que não corresponde ao tipo declarado", async () => {
    const response = await POST(requestPost(arquivo("falsa.jpg", "image/jpeg", [1, 2, 3, 4])), props);

    expect(response.status).toBe(400);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("recusa arquivo acima de 4 MB", async () => {
    const file = new File([new Uint8Array(4_000_001)], "grande.jpg", { type: "image/jpeg" });
    const response = await POST(requestPost(file), props);

    expect(response.status).toBe(413);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("impede alteração depois que a OS deixa de estar aberta", async () => {
    prismaMock.itemOrdemServico.findFirst.mockResolvedValue(item("EM_ANDAMENTO"));

    const response = await POST(requestPost(arquivo("foto.jpg", "image/jpeg", [0xff, 0xd8, 0xff])), props);

    expect(response.status).toBe(409);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("remove o novo Blob quando a referência perde a corrida de atualização", async () => {
    prismaMock.itemOrdemServico.updateMany.mockResolvedValue({ count: 0 });

    const response = await POST(requestPost(arquivo("foto.jpg", "image/jpeg", [0xff, 0xd8, 0xff])), props);

    expect(response.status).toBe(409);
    expect(delMock).toHaveBeenCalledWith("ordens-servico/os-1/itens/item-1/nova.jpg");
  });

  it("substitui a referência antes de apagar a foto anterior", async () => {
    prismaMock.itemOrdemServico.findFirst.mockResolvedValue(item("ABERTA", "anterior.jpg"));

    const response = await POST(requestPost(arquivo("foto.jpg", "image/jpeg", [0xff, 0xd8, 0xff])), props);

    expect(response.status).toBe(201);
    expect(prismaMock.itemOrdemServico.updateMany).toHaveBeenCalledBefore(delMock);
    expect(delMock).toHaveBeenCalledWith("anterior.jpg");
  });

  it("desvincula a foto antes de removê-la do Blob", async () => {
    prismaMock.itemOrdemServico.findFirst.mockResolvedValue(item("ABERTA", "foto.jpg"));
    const request = new NextRequest("http://localhost/api/ordens-servico/os-1/itens/item-1/foto", { method: "DELETE" });

    const response = await DELETE(request, props);

    expect(response.status).toBe(204);
    expect(prismaMock.itemOrdemServico.updateMany).toHaveBeenCalledBefore(delMock);
    expect(delMock).toHaveBeenCalledWith("foto.jpg");
  });

  it("serve a foto privada somente pela rota autenticada", async () => {
    prismaMock.itemOrdemServico.findFirst.mockResolvedValue(item("ABERTA", "foto.jpg"));
    getMock.mockResolvedValue({
      statusCode: 200,
      blob: { contentType: "image/jpeg", size: 3, etag: "etag-1" },
      stream: new ReadableStream({ start(controller) { controller.enqueue(Uint8Array.from([0xff, 0xd8, 0xff])); controller.close(); } }),
    });
    const request = new NextRequest("http://localhost/api/ordens-servico/os-1/itens/item-1/foto");

    const response = await GET(request, props);

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-cache");
    expect(response.headers.get("X-Content-Type-Options")).toBe("nosniff");
    expect(getMock).toHaveBeenCalledWith("foto.jpg", expect.objectContaining({ access: "private" }));
  });
});
