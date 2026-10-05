import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { SESSAO_COOKIE_NOME, SESSAO_DURACAO_SEGUNDOS, criarTokenSessao } from "@/lib/auth-session";

const { prismaMock, cookieStore, redirectMock } = vi.hoisted(() => ({
  prismaMock: {
    usuario: {
      findUnique: vi.fn(),
    },
    caixa: { findFirst: vi.fn() },
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

const { exigirSessao, obterUsuarioSessao, exigirSessaoApi } = await import("@/lib/auth-server");

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
  prismaMock.caixa.findFirst.mockReset().mockResolvedValue(null);
});

afterEach(() => vi.useRealTimers());

describe("exigirSessao (enforcement server-side das páginas privadas)", () => {
  it("redireciona para /login quando não há cookie de sessão", async () => {
    await expect(exigirSessao()).rejects.toThrow("NEXT_REDIRECT:/login");

    expect(redirectMock).toHaveBeenCalledWith("/login");
    expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
    expect(prismaMock.caixa.findFirst).not.toHaveBeenCalled();
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

describe("encaminhamento ao fechamento após validar a sessão", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-05T12:00:00Z"));
    cookieStore.valor = criarTokenSessao("usr-1");
    prismaMock.usuario.findUnique.mockResolvedValue(usuarioAtivo);
  });

  it.each(["2026-10-04T11:00:00Z", "2026-10-01T11:00:00Z"])(
    "encaminha caixa aberto em %s para /caixa", async (dataAbertura) => {
      prismaMock.caixa.findFirst.mockResolvedValue({ id: "anterior", dataAbertura: new Date(dataAbertura) });
      await expect(exigirSessao()).rejects.toThrow("NEXT_REDIRECT:/caixa");
      expect(prismaMock.caixa.findFirst).toHaveBeenCalledWith({
        where: { status: "ABERTO" }, select: { id: true, dataAbertura: true },
      });
    }
  );

  it("libera caixa aberto hoje", async () => {
    prismaMock.caixa.findFirst.mockResolvedValue({ id: "hoje", dataAbertura: new Date("2026-10-05T11:00:00Z") });
    expect(await exigirSessao()).toMatchObject({ id: "usr-1" });
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("não confunde virada UTC com a data operacional", async () => {
    vi.setSystemTime(new Date("2026-10-05T02:59:00Z"));
    cookieStore.valor = criarTokenSessao("usr-1");
    prismaMock.caixa.findFirst.mockResolvedValue({ id: "anterior", dataAbertura: new Date("2026-10-04T23:00:00Z") });
    await exigirSessao();
    expect(redirectMock).not.toHaveBeenCalled();
    vi.setSystemTime(new Date("2026-10-05T03:01:00Z"));
    await expect(exigirSessao()).rejects.toThrow("NEXT_REDIRECT:/caixa");
  });

  it("permite conferir e fechar em /caixa sem consultar a pendência nem criar loop", async () => {
    prismaMock.caixa.findFirst.mockRejectedValue(new Error("consulta indisponível"));
    expect(await exigirSessao({ permitirFechamento: true })).toMatchObject({ id: "usr-1" });
    expect(prismaMock.caixa.findFirst).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("cessa o encaminhamento quando outra sessão fecha o caixa", async () => {
    prismaMock.caixa.findFirst
      .mockResolvedValueOnce({ id: "anterior", dataAbertura: new Date("2026-10-04T11:00:00Z") })
      .mockResolvedValueOnce(null);
    await expect(exigirSessao()).rejects.toThrow("NEXT_REDIRECT:/caixa");
    redirectMock.mockClear();
    await exigirSessao();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("propaga erro de leitura para o estado recuperável, sem inventar estado", async () => {
    prismaMock.caixa.findFirst.mockRejectedValueOnce(new Error("falha de leitura"));
    await expect(exigirSessao()).rejects.toThrow("falha de leitura");
    expect(redirectMock).not.toHaveBeenCalled();
    await exigirSessao();
  });

  it("preserva autenticação de APIs sem consultar caixa ou redirecionar", async () => {
    const request = new NextRequest("http://localhost/api/caixa/atual", {
      headers: { cookie: `${SESSAO_COOKIE_NOME}=${cookieStore.valor}` },
    });
    expect(await exigirSessaoApi(request)).toBeNull();
    expect(prismaMock.caixa.findFirst).not.toHaveBeenCalled();
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
