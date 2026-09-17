import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type TxMock = {
  fotoItemOrdem: { deleteMany: ReturnType<typeof vi.fn> };
  itemOrdemServico: { updateMany: ReturnType<typeof vi.fn> };
};

const { authMock, delMock, getMock, prismaMock, txMock } = vi.hoisted(() => {
  const tx: TxMock = {
    fotoItemOrdem: { deleteMany: vi.fn() },
    itemOrdemServico: { updateMany: vi.fn() },
  };
  return {
    authMock: vi.fn(),
    delMock: vi.fn(),
    getMock: vi.fn(),
    txMock: tx,
    prismaMock: {
      fotoItemOrdem: { findFirst: vi.fn(), count: vi.fn() },
      itemOrdemServico: { count: vi.fn() },
      $transaction: vi.fn(async (callback: (client: TxMock) => unknown) => callback(tx)),
    },
  };
});

vi.mock("@/lib/auth-server", () => ({ exigirSessaoApi: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@vercel/blob", () => ({ del: delMock, get: getMock }));

import { DELETE, GET } from "./route";

const props = { params: Promise.resolve({ id: "os-1", itemId: "item-1", fotoId: "foto-1" }) };
function foto(status = "ABERTA") {
  return { id: "foto-1", itemOrdemServicoId: "item-1", pathname: "foto.jpg", criadoEm: new Date(), itemOrdemServico: { ordemServico: { status } } };
}

describe("API de uma foto da galeria", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(null);
    prismaMock.fotoItemOrdem.findFirst.mockResolvedValue(foto());
    prismaMock.fotoItemOrdem.count.mockResolvedValue(0);
    prismaMock.itemOrdemServico.count.mockResolvedValue(0);
    txMock.fotoItemOrdem.deleteMany.mockResolvedValue({ count: 1 });
    txMock.itemOrdemServico.updateMany.mockResolvedValue({ count: 1 });
    delMock.mockResolvedValue(undefined);
    getMock.mockResolvedValue({
      statusCode: 200,
      blob: { contentType: "image/jpeg", size: 3, etag: "etag-1" },
      stream: new ReadableStream({ start(controller) { controller.enqueue(Uint8Array.from([0xff, 0xd8, 0xff])); controller.close(); } }),
    });
  });

  it("nao encontra foto vinculada a outro item ou OS", async () => {
    prismaMock.fotoItemOrdem.findFirst.mockResolvedValue(null);
    const response = await GET(new NextRequest("http://localhost/foto"), props);
    expect(response.status).toBe(404);
    expect(getMock).not.toHaveBeenCalled();
  });

  it("serve arquivo privado sem expor pathname", async () => {
    const response = await GET(new NextRequest("http://localhost/foto"), props);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-cache");
    expect(getMock).toHaveBeenCalledWith("foto.jpg", expect.objectContaining({ access: "private" }));
  });

  it("bloqueia remocao fora de OS aberta", async () => {
    prismaMock.fotoItemOrdem.findFirst.mockResolvedValue(foto("CONCLUIDA"));
    const response = await DELETE(new NextRequest("http://localhost/foto", { method: "DELETE" }), props);
    expect(response.status).toBe(409);
    expect(txMock.fotoItemOrdem.deleteMany).not.toHaveBeenCalled();
  });

  it("desvincula antes de apagar o Blob", async () => {
    const response = await DELETE(new NextRequest("http://localhost/foto", { method: "DELETE" }), props);
    expect(response.status).toBe(204);
    expect(txMock.fotoItemOrdem.deleteMany).toHaveBeenCalledBefore(delMock);
    expect(txMock.itemOrdemServico.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ fotoRecebimentoPathname: "foto.jpg" }),
      data: { fotoRecebimentoPathname: null },
    }));
    expect(delMock).toHaveBeenCalledWith("foto.jpg");
  });

  it("preserva o Blob enquanto outra referencia ainda o utiliza", async () => {
    prismaMock.itemOrdemServico.count.mockResolvedValue(1);
    const response = await DELETE(new NextRequest("http://localhost/foto", { method: "DELETE" }), props);
    expect(response.status).toBe(204);
    expect(delMock).not.toHaveBeenCalled();
  });
});
