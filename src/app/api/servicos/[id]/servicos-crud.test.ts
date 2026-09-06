import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { DELETE, PATCH } from "./route";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    servicoItemOrdem: {
      count: vi.fn(),
    },
    servico: {
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
  return new NextRequest(`http://localhost/api/servicos/${id}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("PATCH /api/servicos/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("atualiza os campos informados (200)", async () => {
    prismaMock.servico.update.mockResolvedValueOnce({ id: "srv-1", nome: "Troca de sola" });

    const response = await PATCH(criarRequest("srv-1", "PATCH", { nome: "Troca de sola" }), {
      params: { id: "srv-1" },
    });

    expect(response.status).toBe(200);
    expect(prismaMock.servico.update).toHaveBeenCalledWith({
      where: { id: "srv-1" },
      data: { nome: "Troca de sola" },
    });
  });

  it("atualiza todos os parâmetros do serviço (200)", async () => {
    prismaMock.servico.update.mockResolvedValueOnce({
      id: "srv-1",
      nome: "Troca de sola premium",
      descricao: "Sola reforçada",
      precoBase: 125.5,
      ativo: false,
    });

    const response = await PATCH(
      criarRequest("srv-1", "PATCH", {
        nome: "Troca de sola premium",
        descricao: "Sola reforçada",
        precoBase: "R$ 125,50",
        ativo: false,
      }),
      { params: { id: "srv-1" } },
    );

    expect(response.status).toBe(200);
    expect(prismaMock.servico.update).toHaveBeenCalledWith({
      where: { id: "srv-1" },
      data: {
        nome: "Troca de sola premium",
        descricao: "Sola reforçada",
        precoBase: 125.5,
        ativo: false,
      },
    });
  });

  it("inativa o serviço sem alterar os demais campos (200)", async () => {
    prismaMock.servico.update.mockResolvedValueOnce({ id: "srv-1", ativo: false });

    const response = await PATCH(criarRequest("srv-1", "PATCH", { ativo: false }), {
      params: { id: "srv-1" },
    });

    expect(response.status).toBe(200);
    expect(prismaMock.servico.update).toHaveBeenCalledWith({
      where: { id: "srv-1" },
      data: { ativo: false },
    });
  });

  it("rejeita payload inválido (400)", async () => {
    const response = await PATCH(criarRequest("srv-1", "PATCH", { nome: "a" }), {
      params: { id: "srv-1" },
    });

    expect(response.status).toBe(400);
    expect(prismaMock.servico.update).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o serviço não existe", async () => {
    prismaMock.servico.update.mockRejectedValueOnce({ code: "P2025" });

    const response = await PATCH(criarRequest("inexistente", "PATCH", { nome: "Qualquer" }), {
      params: { id: "inexistente" },
    });

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/servicos/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloqueia exclusão de serviço vinculado a ordem de serviço (409)", async () => {
    prismaMock.servicoItemOrdem.count.mockResolvedValueOnce(3);

    const response = await DELETE(criarRequest("srv-1", "DELETE"), { params: { id: "srv-1" } });

    expect(response.status).toBe(409);
    expect(prismaMock.servico.delete).not.toHaveBeenCalled();
  });

  it("permite exclusão de serviço sem vínculo (204)", async () => {
    prismaMock.servicoItemOrdem.count.mockResolvedValueOnce(0);
    prismaMock.servico.delete.mockResolvedValueOnce({ id: "srv-1" });

    const response = await DELETE(criarRequest("srv-1", "DELETE"), { params: { id: "srv-1" } });

    expect(response.status).toBe(204);
    expect(prismaMock.servico.delete).toHaveBeenCalledWith({ where: { id: "srv-1" } });
  });

  it("retorna 404 quando o serviço não existe", async () => {
    prismaMock.servicoItemOrdem.count.mockResolvedValueOnce(0);
    prismaMock.servico.delete.mockRejectedValueOnce({ code: "P2025" });

    const response = await DELETE(criarRequest("inexistente", "DELETE"), {
      params: { id: "inexistente" },
    });

    expect(response.status).toBe(404);
  });
});
