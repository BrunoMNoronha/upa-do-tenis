import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { hashPassword } from "@/lib/passwords";
import { MENSAGEM_CAPTCHA_RECUSADO } from "@/lib/captcha";
import { POLITICA_LOGIN_EMAIL_IP, redefinirStoreLogin } from "@/lib/login-rate-limit";
import { RateLimitStoreMemoria } from "@/lib/rate-limit";
import { SESSAO_COOKIE_NOME } from "@/lib/auth-constants";
import { POST } from "./route";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    usuario: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

const IP = "203.0.113.7";

const usuario = {
  id: "usr-1",
  nome: "Bruno",
  email: "bruno@exemplo.com",
  senhaHash: hashPassword("senha-correta"),
  ativo: true,
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

function criarRequest(corpo: Record<string, unknown>) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-real-ip": IP },
    body: JSON.stringify(corpo),
  });
}

/** Substitui o `fetch` global usado pelo siteverify. */
function googleResponde(corpo: unknown, status = 200) {
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(corpo), { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

function googleFora() {
  const fetchMock = vi.fn(async () => {
    throw new TypeError("fetch failed");
  });
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("reCAPTCHA em POST /api/auth/login", () => {
  beforeEach(() => {
    prismaMock.usuario.findUnique.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.spyOn(console, "error").mockImplementation(() => {});
    redefinirStoreLogin(new RateLimitStoreMemoria());
    vi.stubEnv("RECAPTCHA_SITE_KEY", "site-key-teste");
    vi.stubEnv("RECAPTCHA_SECRET_KEY", "secret-key-teste");
    vi.stubEnv("RECAPTCHA_SCORE_MINIMO", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    redefinirStoreLogin(null);
  });

  it("entra normalmente com token válido", async () => {
    const fetchMock = googleResponde({ success: true, score: 0.9, action: "login" });
    prismaMock.usuario.findUnique.mockResolvedValueOnce(usuario);

    const response = await POST(
      criarRequest({ email: usuario.email, senha: "senha-correta", captchaToken: "tok" })
    );

    expect(response.status).toBe(200);
    expect(response.cookies.get(SESSAO_COOKIE_NOME)?.value).toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("recusa sem token, com 403 uniforme e sem consultar o usuário", async () => {
    const fetchMock = googleResponde({ success: true, score: 0.9, action: "login" });

    const response = await POST(criarRequest({ email: usuario.email, senha: "senha-correta" }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ message: MENSAGEM_CAPTCHA_RECUSADO });
    expect(response.cookies.get(SESSAO_COOKIE_NOME)?.value).toBeFalsy();
    // Token ausente é recusado localmente: nem o Google nem o banco são tocados.
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
  });

  it("recusa token inválido antes de verificar a senha", async () => {
    googleResponde({ success: false, "error-codes": ["invalid-input-response"] });

    const response = await POST(
      criarRequest({ email: usuario.email, senha: "senha-correta", captchaToken: "falso" })
    );

    expect(response.status).toBe(403);
    expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
  });

  it("recusa score abaixo do mínimo e respeita RECAPTCHA_SCORE_MINIMO", async () => {
    vi.stubEnv("RECAPTCHA_SCORE_MINIMO", "0.8");
    googleResponde({ success: true, score: 0.7, action: "login" });

    const response = await POST(
      criarRequest({ email: usuario.email, senha: "senha-correta", captchaToken: "tok" })
    );

    expect(response.status).toBe(403);
    expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
  });

  it("recusa token de outra ação", async () => {
    googleResponde({ success: true, score: 0.9, action: "cadastro" });

    const response = await POST(
      criarRequest({ email: usuario.email, senha: "senha-correta", captchaToken: "tok" })
    );

    expect(response.status).toBe(403);
  });

  it("a recusa é idêntica para e-mail inexistente", async () => {
    googleResponde({ success: true, score: 0.1, action: "login" });

    const cadastrado = await POST(
      criarRequest({ email: usuario.email, senha: "x", captchaToken: "tok" })
    );
    const inexistente = await POST(
      criarRequest({ email: "ninguem@exemplo.com", senha: "x", captchaToken: "tok" })
    );

    expect(cadastrado.status).toBe(403);
    expect(inexistente.status).toBe(403);
    await expect(cadastrado.json()).resolves.toEqual(await inexistente.json());
    expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
  });

  it("recusa de captcha não consome o contador do rate limit", async () => {
    googleResponde({ success: true, score: 0.1, action: "login" });

    for (let i = 0; i < POLITICA_LOGIN_EMAIL_IP.limiteFalhas + 3; i += 1) {
      const response = await POST(
        criarRequest({ email: usuario.email, senha: "x", captchaToken: "tok" })
      );

      // Continua 403 (captcha), nunca 429: bot barrado não vira bloqueio do
      // operador legítimo no mesmo par (IP, e-mail).
      expect(response.status).toBe(403);
    }

    googleResponde({ success: true, score: 0.9, action: "login" });
    prismaMock.usuario.findUnique.mockResolvedValueOnce(usuario);

    const legitimo = await POST(
      criarRequest({ email: usuario.email, senha: "senha-correta", captchaToken: "tok" })
    );

    expect(legitimo.status).toBe(200);
  });

  it("registra a recusa em log sem senha nem token", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    googleResponde({ success: true, score: 0.2, action: "login" });

    await POST(
      criarRequest({ email: usuario.email, senha: "senha-secreta", captchaToken: "token-secreto" })
    );

    expect(warn).toHaveBeenCalledTimes(1);
    const serializado = warn.mock.calls[0][0] as string;
    expect(JSON.parse(serializado)).toMatchObject({
      evento: "login_captcha_recusado",
      email: usuario.email,
      ip: IP,
      motivo: "score_baixo",
      score: 0.2,
    });
    expect(serializado).not.toContain("senha-secreta");
    expect(serializado).not.toContain("token-secreto");
  });

  it("Google indisponível não derruba o login: segue para a senha", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    googleFora();

    // Senha errada: 401 normal, e a falha conta no rate limit como sempre.
    prismaMock.usuario.findUnique.mockResolvedValueOnce(usuario);
    const errada = await POST(
      criarRequest({ email: usuario.email, senha: "senha-errada", captchaToken: "tok" })
    );
    expect(errada.status).toBe(401);

    // Senha correta: entra.
    prismaMock.usuario.findUnique.mockResolvedValueOnce(usuario);
    const certa = await POST(
      criarRequest({ email: usuario.email, senha: "senha-correta", captchaToken: "tok" })
    );
    expect(certa.status).toBe(200);
    expect(certa.cookies.get(SESSAO_COOKIE_NOME)?.value).toBeTruthy();

    const eventos = erro.mock.calls.map((chamada) => JSON.parse(chamada[0] as string).evento);
    expect(eventos).toContain("captcha_indisponivel");
  });

  it("Google indisponível nunca concede acesso com senha errada", async () => {
    googleFora();
    prismaMock.usuario.findUnique.mockResolvedValueOnce(usuario);

    const response = await POST(
      criarRequest({ email: usuario.email, senha: "senha-errada", captchaToken: "tok" })
    );

    expect(response.status).toBe(401);
    expect(response.cookies.get(SESSAO_COOKIE_NOME)?.value).toBeFalsy();
  });

  it("bloqueio do rate limit vence antes do captcha e não chama o Google", async () => {
    googleFora();

    // Esgota o limite com o Google fora (falhas de senha contam normalmente).
    for (let i = 0; i < POLITICA_LOGIN_EMAIL_IP.limiteFalhas; i += 1) {
      prismaMock.usuario.findUnique.mockResolvedValueOnce(usuario);
      await POST(criarRequest({ email: usuario.email, senha: "senha-errada", captchaToken: "tok" }));
    }

    const fetchMock = googleResponde({ success: true, score: 0.9, action: "login" });
    prismaMock.usuario.findUnique.mockClear();

    const response = await POST(
      criarRequest({ email: usuario.email, senha: "senha-correta", captchaToken: "tok" })
    );

    expect(response.status).toBe(429);
    expect(fetchMock).not.toHaveBeenCalled();
    expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
  });

  it("com as chaves ausentes o captcha fica desligado e o token é ignorado", async () => {
    vi.stubEnv("RECAPTCHA_SITE_KEY", "");
    vi.stubEnv("RECAPTCHA_SECRET_KEY", "");
    const fetchMock = googleFora();
    prismaMock.usuario.findUnique.mockResolvedValueOnce(usuario);

    const response = await POST(criarRequest({ email: usuario.email, senha: "senha-correta" }));

    expect(response.status).toBe(200);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("token acima do tamanho máximo é 400, não 403", async () => {
    const response = await POST(
      criarRequest({ email: usuario.email, senha: "x", captchaToken: "a".repeat(5000) })
    );

    expect(response.status).toBe(400);
  });
});
