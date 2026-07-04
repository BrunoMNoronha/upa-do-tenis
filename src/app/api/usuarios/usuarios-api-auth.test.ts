import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { SESSAO_COOKIE_NOME, criarTokenSessao } from "@/lib/auth-session";
import { POST } from "./route";
import { PATCH } from "./[id]/route";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    usuario: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

function criarRequest(url: string, method: string, cookie?: string) {
  return new NextRequest(`http://localhost${url}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(cookie ? { cookie } : {}),
    },
    body: JSON.stringify({}),
  });
}

describe("proteção das APIs de usuários", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejeita POST /api/usuarios sem sessão", async () => {
    const response = await POST(criarRequest("/api/usuarios", "POST"));

    expect(response.status).toBe(401);
    expect(prismaMock.usuario.create).not.toHaveBeenCalled();
  });

  it("rejeita POST /api/usuarios com token adulterado", async () => {
    const response = await POST(
      criarRequest("/api/usuarios", "POST", `${SESSAO_COOKIE_NOME}=token-invalido`)
    );

    expect(response.status).toBe(401);
    expect(prismaMock.usuario.create).not.toHaveBeenCalled();
  });

  it("rejeita PATCH /api/usuarios/[id] sem sessão", async () => {
    const response = await PATCH(criarRequest("/api/usuarios/usr-1", "PATCH"), {
      params: { id: "usr-1" },
    });

    expect(response.status).toBe(401);
    expect(prismaMock.usuario.update).not.toHaveBeenCalled();
  });

  it("rejeita sessão de usuário que foi inativado", async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      id: "usr-1",
      nome: "Bruno",
      email: "bruno@exemplo.com",
      ativo: false,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    });

    const token = criarTokenSessao("usr-1");
    const response = await POST(
      criarRequest("/api/usuarios", "POST", `${SESSAO_COOKIE_NOME}=${token}`)
    );

    expect(response.status).toBe(401);
    expect(prismaMock.usuario.create).not.toHaveBeenCalled();
  });

  it("aceita sessão válida de usuário ativo (segue para validação do corpo)", async () => {
    prismaMock.usuario.findUnique.mockResolvedValueOnce({
      id: "usr-1",
      nome: "Bruno",
      email: "bruno@exemplo.com",
      ativo: true,
      criadoEm: new Date(),
      atualizadoEm: new Date(),
    });

    const token = criarTokenSessao("usr-1");
    const response = await POST(
      criarRequest("/api/usuarios", "POST", `${SESSAO_COOKIE_NOME}=${token}`)
    );

    // Corpo vazio: passa da autenticação (não é 401) e falha na validação (400).
    expect(response.status).toBe(400);
  });
});
