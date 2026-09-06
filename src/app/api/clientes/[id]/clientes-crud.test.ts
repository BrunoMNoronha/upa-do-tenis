import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { DELETE, PATCH } from "./route";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    ordemServico: {
      count: vi.fn(),
    },
    venda: {
      count: vi.fn(),
    },
    cliente: {
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
  return new NextRequest(`http://localhost/api/clientes/${id}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
}

describe("PATCH /api/clientes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("atualiza os campos informados, sanitizando o telefone (200)", async () => {
    prismaMock.cliente.update.mockResolvedValueOnce({ id: "cli-1", nome: "Maria" });

    const response = await PATCH(
      criarRequest("cli-1", "PATCH", { nome: "Maria", telefone: "(11) 98888-7777" }),
      { params: { id: "cli-1" } }
    );

    expect(response.status).toBe(200);
    expect(prismaMock.cliente.update).toHaveBeenCalledWith({
      where: { id: "cli-1" },
      data: { nome: "Maria", telefone: "11988887777" },
    });
  });

  it("inativa o cliente sem alterar os demais campos (200)", async () => {
    prismaMock.cliente.update.mockResolvedValueOnce({ id: "cli-1", ativo: false });

    const response = await PATCH(criarRequest("cli-1", "PATCH", { ativo: false }), {
      params: { id: "cli-1" },
    });

    expect(response.status).toBe(200);
    expect(prismaMock.cliente.update).toHaveBeenCalledWith({
      where: { id: "cli-1" },
      data: { ativo: false },
    });
  });

  it("rejeita telefone inválido (400)", async () => {
    const response = await PATCH(criarRequest("cli-1", "PATCH", { telefone: "123" }), {
      params: { id: "cli-1" },
    });

    expect(response.status).toBe(400);
    expect(prismaMock.cliente.update).not.toHaveBeenCalled();
  });

  it("retorna 404 quando o cliente não existe", async () => {
    prismaMock.cliente.update.mockRejectedValueOnce({ code: "P2025" });

    const response = await PATCH(criarRequest("inexistente", "PATCH", { nome: "Maria" }), {
      params: { id: "inexistente" },
    });

    expect(response.status).toBe(404);
  });
});

describe("DELETE /api/clientes/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("bloqueia exclusão de cliente com ordem de serviço (409)", async () => {
    prismaMock.ordemServico.count.mockResolvedValueOnce(1);
    prismaMock.venda.count.mockResolvedValueOnce(0);

    const response = await DELETE(criarRequest("cli-1", "DELETE"), { params: { id: "cli-1" } });

    expect(response.status).toBe(409);
    expect(prismaMock.cliente.delete).not.toHaveBeenCalled();
  });

  it("bloqueia exclusão de cliente com venda, preservando o histórico (409)", async () => {
    prismaMock.ordemServico.count.mockResolvedValueOnce(0);
    prismaMock.venda.count.mockResolvedValueOnce(3);

    const response = await DELETE(criarRequest("cli-1", "DELETE"), { params: { id: "cli-1" } });

    expect(response.status).toBe(409);
    expect(prismaMock.cliente.delete).not.toHaveBeenCalled();
  });

  it("permite exclusão de cliente sem vínculo (204)", async () => {
    prismaMock.ordemServico.count.mockResolvedValueOnce(0);
    prismaMock.venda.count.mockResolvedValueOnce(0);
    prismaMock.cliente.delete.mockResolvedValueOnce({ id: "cli-1" });

    const response = await DELETE(criarRequest("cli-1", "DELETE"), { params: { id: "cli-1" } });

    expect(response.status).toBe(204);
    expect(prismaMock.cliente.delete).toHaveBeenCalledWith({ where: { id: "cli-1" } });
  });

  it("retorna 404 quando o cliente não existe", async () => {
    prismaMock.ordemServico.count.mockResolvedValueOnce(0);
    prismaMock.venda.count.mockResolvedValueOnce(0);
    prismaMock.cliente.delete.mockRejectedValueOnce({ code: "P2025" });

    const response = await DELETE(criarRequest("inexistente", "DELETE"), {
      params: { id: "inexistente" },
    });

    expect(response.status).toBe(404);
  });
});
