import { beforeEach, describe, expect, it, vi } from "vitest";

import { SESSAO_COOKIE_NOME, SESSAO_DURACAO_SEGUNDOS, criarTokenSessao } from "@/lib/auth-session";

const { prismaMock, cookieStore, redirectMock } = vi.hoisted(() => ({
  prismaMock: {
    usuario: {
      findUnique: vi.fn(),
    },
  },
  cookieStore: {
    valor: undefined as string | undefined,
  },
  redirectMock: vi.fn((destino: string) => {
    throw new Error(`NEXT_REDIRECT:${destino}`);
  }),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("next/headers", () => ({
  cookies: () => ({
    get: (nome: string) =>
      nome === SESSAO_COOKIE_NOME && cookieStore.valor !== undefined
        ? { name: nome, value: cookieStore.valor }
        : undefined,
  }),
}));

vi.mock("next/navigation", () => ({
  redirect: redirectMock,
}));

const { exigirSessao, obterUsuarioSessao } = await import("@/lib/auth-server");

const usuarioAtivo = {
  id: "usr-1",
  nome: "Bruno",
  email: "bruno@exemplo.com",
  ativo: true,
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  cookieStore.valor = undefined;
});

describe("exigirSessao (enforcement server-side das páginas privadas)", () => {
  it("redireciona para /login quando não há cookie de sessão", async () => {
    await expect(exigirSessao()).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(redirectMock).toHaveBeenCalledWith("/login");
    expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
  });

  it("redireciona para /login quando o token está adulterado", async () => {
    cookieStore.valor = "payload-falso.assinatura-falsa";

    await expect(exigirSessao()).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
  });

  it("redireciona para /login quando a assinatura é válida mas o payload expirou", async () => {
    const expirado = Date.now() - (SESSAO_DURACAO_SEGUNDOS + 60) * 1000;
    cookieStore.valor = criarTokenSessao("usr-1", expirado);

    await expect(exigirSessao()).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
  });

  it("redireciona para /login quando o usuário da sessão foi inativado", async () => {
    cookieStore.valor = criarTokenSessao("usr-1");
    prismaMock.usuario.findUnique.mockResolvedValueOnce({ ...usuarioAtivo, ativo: false });

    await expect(exigirSessao()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("redireciona para /login quando o usuário da sessão não existe mais", async () => {
    cookieStore.valor = criarTokenSessao("usr-1");
    prismaMock.usuario.findUnique.mockResolvedValueOnce(null);

    await expect(exigirSessao()).rejects.toThrow("NEXT_REDIRECT:/login");
  });

  it("libera o acesso legítimo com sessão válida de usuário ativo", async () => {
    cookieStore.valor = criarTokenSessao("usr-1");
    prismaMock.usuario.findUnique.mockResolvedValueOnce(usuarioAtivo);

    const usuario = await exigirSessao();

    expect(usuario.id).toBe("usr-1");
    expect(redirectMock).not.toHaveBeenCalled();
  });
});

describe("obterUsuarioSessao", () => {
  it("retorna null sem sessão, sem redirecionar", async () => {
    expect(await obterUsuarioSessao()).toBeNull();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("retorna o usuário com sessão válida", async () => {
    cookieStore.valor = criarTokenSessao("usr-1");
    prismaMock.usuario.findUnique.mockResolvedValueOnce(usuarioAtivo);

    expect(await obterUsuarioSessao()).toMatchObject({ id: "usr-1", ativo: true });
  });
});
