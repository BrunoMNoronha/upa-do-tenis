import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";

import { PATCH } from "./route";

// Issue #153: favoritar/desfavoritar é um marcador operacional. A API deve ser
// idempotente, escrever somente o campo `favorita` e devolver o estado
// persistido, sem tocar status, valores, pagamentos, caixa, estoque ou insumos.

const { prismaMock } = vi.hoisted(() => {
  const mock: any = {
    ordemServico: { findUnique: vi.fn(), update: vi.fn() },
  };
  return { prismaMock: mock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

const { exigirSessaoApiMock } = vi.hoisted(() => ({
  exigirSessaoApiMock: vi.fn(),
}));

vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: exigirSessaoApiMock,
}));

const OS_ID = "os-1";

function criarRequest(body: unknown, id = OS_ID) {
  return new NextRequest(`http://localhost/api/ordens-servico/${id}/favorita`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

function chamarPatch(body: unknown, id = OS_ID) {
  return PATCH(criarRequest(body, id), { params: Promise.resolve({ id }) });
}

function ordemPersistida(favorita: boolean) {
  return { id: OS_ID, numero: "OS-0001", favorita };
}

beforeEach(() => {
  vi.resetAllMocks();
  exigirSessaoApiMock.mockResolvedValue(null);
  prismaMock.ordemServico.update.mockImplementation(async (args: any) => ({
    id: OS_ID,
    numero: "OS-0001",
    favorita: args.data.favorita,
  }));
});

describe("PATCH /api/ordens-servico/[id]/favorita", () => {
  it("favorita uma OS não favorita e persiste somente o campo favorita", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValue(ordemPersistida(false));

    const response = await chamarPatch({ favorita: true });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ id: OS_ID, numero: "OS-0001", favorita: true });
    expect(prismaMock.ordemServico.update).toHaveBeenCalledTimes(1);

    const args = prismaMock.ordemServico.update.mock.calls[0][0];
    expect(args.where).toEqual({ id: OS_ID });
    expect(args.data).toEqual({ favorita: true });
    expect(Object.keys(args.data)).toEqual(["favorita"]);
  });

  it("é idempotente: favoritar OS já favorita devolve o mesmo estado sem gravar", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValue(ordemPersistida(true));

    const response = await chamarPatch({ favorita: true });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ id: OS_ID, numero: "OS-0001", favorita: true });
    expect(prismaMock.ordemServico.update).not.toHaveBeenCalled();
  });

  it("remove uma OS dos favoritos", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValue(ordemPersistida(true));

    const response = await chamarPatch({ favorita: false });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ id: OS_ID, numero: "OS-0001", favorita: false });
    expect(prismaMock.ordemServico.update).toHaveBeenCalledTimes(1);
    expect(prismaMock.ordemServico.update.mock.calls[0][0].data).toEqual({ favorita: false });
  });

  it("é idempotente: desfavoritar OS não favorita devolve o mesmo estado sem gravar", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValue(ordemPersistida(false));

    const response = await chamarPatch({ favorita: false });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({ id: OS_ID, numero: "OS-0001", favorita: false });
    expect(prismaMock.ordemServico.update).not.toHaveBeenCalled();
  });

  it("retorna 404 para OS inexistente sem gravar nada", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValue(null);

    const response = await chamarPatch({ favorita: true }, "os-inexistente");
    const payload = await response.json();

    expect(response.status).toBe(404);
    expect(payload.message).toBe("Ordem de serviço não encontrada.");
    expect(prismaMock.ordemServico.update).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o payload não traz favorita booleano", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValue(ordemPersistida(false));

    for (const body of [{}, { favorita: "true" }, { favorita: 1 }, { favorita: null }]) {
      const response = await chamarPatch(body);
      expect(response.status).toBe(400);
      const payload = await response.json();
      expect(payload.message).toBe("Dados inválidos.");
    }

    const semJson = await chamarPatch("não é json");
    expect(semJson.status).toBe(400);

    expect(prismaMock.ordemServico.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.ordemServico.update).not.toHaveBeenCalled();
  });

  it("retorna 400 quando o id do parâmetro é vazio", async () => {
    const response = await chamarPatch({ favorita: true }, "");

    expect(response.status).toBe(400);
    expect(prismaMock.ordemServico.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.ordemServico.update).not.toHaveBeenCalled();
  });

  it("ignora campos extras do payload e nunca grava outros atributos da OS", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValue(ordemPersistida(false));

    const response = await chamarPatch({
      favorita: true,
      status: "CANCELADA",
      valorTotal: 0,
      saldo: 0,
      numero: "OS-9999",
    });

    expect(response.status).toBe(200);
    expect(prismaMock.ordemServico.update.mock.calls[0][0].data).toEqual({ favorita: true });
  });

  it("exige sessão antes de tocar o banco", async () => {
    exigirSessaoApiMock.mockResolvedValue(
      NextResponse.json({ message: "Não autenticado." }, { status: 401 }),
    );

    const response = await chamarPatch({ favorita: true });

    expect(response.status).toBe(401);
    expect(prismaMock.ordemServico.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.ordemServico.update).not.toHaveBeenCalled();
  });

  it("retorna 500 com a convenção de erro quando o banco falha", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    prismaMock.ordemServico.findUnique.mockRejectedValue(new Error("db down"));

    const response = await chamarPatch({ favorita: true });
    const payload = await response.json();

    expect(response.status).toBe(500);
    expect(payload.message).toBe("Ocorreu um erro interno ao atualizar o favorito da OS.");
    consoleSpy.mockRestore();
  });
});
