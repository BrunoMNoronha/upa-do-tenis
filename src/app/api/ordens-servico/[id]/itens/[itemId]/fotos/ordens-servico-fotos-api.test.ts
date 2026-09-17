import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

type TxMock = {
  fotoItemOrdem: {
    findUnique: ReturnType<typeof vi.fn>;
    count: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
  };
};

const { authMock, delMock, putMock, prismaMock, txMock } = vi.hoisted(() => {
  const tx: TxMock = {
    fotoItemOrdem: { findUnique: vi.fn(), count: vi.fn(), create: vi.fn() },
  };
  return {
    authMock: vi.fn(),
    delMock: vi.fn(),
    putMock: vi.fn(),
    txMock: tx,
    prismaMock: {
      itemOrdemServico: { findFirst: vi.fn() },
      fotoItemOrdem: { findMany: vi.fn(), findUnique: vi.fn() },
      $transaction: vi.fn(async (callback: (client: TxMock) => unknown) => callback(tx)),
    },
  };
});

vi.mock("@/lib/auth-server", () => ({ exigirSessaoApi: authMock }));
vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@vercel/blob", () => ({ del: delMock, put: putMock }));

import { GET, POST } from "./route";

const props = { params: Promise.resolve({ id: "os-1", itemId: "item-1" }) };
const pathname = "ordens-servico/os-1/itens/item-1/foto-chave-1.jpg";

function item(status = "ABERTA") {
  return { id: "item-1", ordemServicoId: "os-1", ordemServico: { status } };
}

function arquivo() {
  return new File([Uint8Array.from([0xff, 0xd8, 0xff])], "foto.jpg", { type: "image/jpeg" });
}

function requestPost(chave = "foto-chave-1") {
  const form = new FormData();
  form.set("foto", arquivo());
  form.set("chaveIdempotencia", chave);
  return new NextRequest("http://localhost/api/ordens-servico/os-1/itens/item-1/fotos", { method: "POST", body: form });
}

describe("API da galeria de fotos do item", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authMock.mockResolvedValue(null);
    prismaMock.itemOrdemServico.findFirst.mockResolvedValue(item());
    prismaMock.fotoItemOrdem.findMany.mockResolvedValue([]);
    prismaMock.fotoItemOrdem.findUnique.mockResolvedValue(null);
    txMock.fotoItemOrdem.findUnique.mockResolvedValue(null);
    txMock.fotoItemOrdem.count.mockResolvedValue(0);
    txMock.fotoItemOrdem.create.mockResolvedValue({ id: "foto-1", criadoEm: new Date("2026-09-16T20:00:00Z") });
    putMock.mockResolvedValue({ pathname });
    delMock.mockResolvedValue(undefined);
  });

  it("lista apenas id e data, sem expor pathname", async () => {
    prismaMock.fotoItemOrdem.findMany.mockResolvedValue([{ id: "foto-1", criadoEm: new Date("2026-09-16T20:00:00Z") }]);
    const response = await GET(new NextRequest("http://localhost/api/ordens-servico/os-1/itens/item-1/fotos"), props);
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ fotos: [{ id: "foto-1", criadoEm: "2026-09-16T20:00:00.000Z" }] });
  });

  it("rejeita item pertencente a outra OS", async () => {
    prismaMock.itemOrdemServico.findFirst.mockResolvedValue(null);
    const response = await POST(requestPost(), props);
    expect(response.status).toBe(404);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("rejeita upload quando a OS nao esta aberta", async () => {
    prismaMock.itemOrdemServico.findFirst.mockResolvedValue(item("EM_ANDAMENTO"));
    const response = await POST(requestPost(), props);
    expect(response.status).toBe(409);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("cria foto privada com chave idempotente", async () => {
    const response = await POST(requestPost(), props);
    expect(response.status).toBe(201);
    expect(putMock).toHaveBeenCalledWith(pathname, expect.any(Buffer), expect.objectContaining({ access: "private", addRandomSuffix: false }));
    expect(txMock.fotoItemOrdem.create).toHaveBeenCalledWith(expect.objectContaining({ data: { itemOrdemServicoId: "item-1", pathname } }));
  });

  it("repete a resposta sem novo Blob quando a chave ja foi concluida", async () => {
    prismaMock.fotoItemOrdem.findUnique.mockResolvedValue({ id: "foto-1", itemOrdemServicoId: "item-1", criadoEm: new Date("2026-09-16T20:00:00Z") });
    const response = await POST(requestPost(), props);
    expect(response.status).toBe(200);
    expect((await response.json()).repetida).toBe(true);
    expect(putMock).not.toHaveBeenCalled();
  });

  it("impede a sexta foto e remove o Blob sem referencia", async () => {
    txMock.fotoItemOrdem.count.mockResolvedValue(5);
    const response = await POST(requestPost(), props);
    expect(response.status).toBe(409);
    expect(delMock).toHaveBeenCalledWith(pathname);
    expect(txMock.fotoItemOrdem.create).not.toHaveBeenCalled();
  });

  it("nao cria referencia quando o envio ao Blob falha", async () => {
    putMock.mockRejectedValue(new Error("falha blob"));
    const response = await POST(requestPost(), props);
    expect(response.status).toBe(500);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
    expect(txMock.fotoItemOrdem.create).not.toHaveBeenCalled();
  });

  it("compensa o Blob quando o banco falha", async () => {
    txMock.fotoItemOrdem.create.mockRejectedValue(new Error("falha banco"));
    const response = await POST(requestPost(), props);
    expect(response.status).toBe(500);
    expect(delMock).toHaveBeenCalledWith(pathname);
  });

  it("nao apaga o Blob se uma repeticao simultanea ja criou o registro", async () => {
    txMock.fotoItemOrdem.create.mockRejectedValue(new Error("conflito simultaneo"));
    prismaMock.fotoItemOrdem.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "foto-concorrente", itemOrdemServicoId: "item-1" });
    const response = await POST(requestPost(), props);
    expect(response.status).toBe(500);
    expect(delMock).not.toHaveBeenCalled();
  });
});
