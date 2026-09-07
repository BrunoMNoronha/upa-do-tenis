import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { hashPassword } from "@/lib/passwords";
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

const MINUTO = 60_000;
const IP_ATACANTE = "198.51.100.1";
const IP_BALCAO = "203.0.113.7";

const usuario = {
  id: "usr-1",
  nome: "Bruno",
  email: "bruno@exemplo.com",
  senhaHash: hashPassword("senha-correta"),
  ativo: true,
  criadoEm: new Date(),
  atualizadoEm: new Date(),
};

function criarRequest(email: string, senha: string, ip: string) {
  return new NextRequest("http://localhost/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-real-ip": ip },
    body: JSON.stringify({ email, senha }),
  });
}

/** Tentativa com senha errada contra um e-mail cadastrado. */
function tentarSenhaErrada(ip = IP_ATACANTE) {
  prismaMock.usuario.findUnique.mockResolvedValueOnce(usuario);
  return POST(criarRequest(usuario.email, "senha-errada", ip));
}

describe("rate limiting em POST /api/auth/login", () => {
  beforeEach(() => {
    // `mockReset` e não `clearAllMocks`: quando a rota responde 429 ela não
    // chega a consultar o Prisma, então um `mockResolvedValueOnce` enfileirado
    // sobra. `clearAllMocks` limpa as chamadas mas não a fila, e o valor
    // vazaria para o caso seguinte.
    prismaMock.usuario.findUnique.mockReset();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    // Store limpo por caso: o módulo mantém uma instância compartilhada.
    redefinirStoreLogin(new RateLimitStoreMemoria());
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-09-07T12:00:00.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    redefinirStoreLogin(null);
  });

  it("responde 401 nas tentativas dentro do limite", async () => {
    for (let i = 0; i < POLITICA_LOGIN_EMAIL_IP.limiteFalhas - 1; i += 1) {
      const response = await tentarSenhaErrada();

      expect(response.status).toBe(401);
      await expect(response.json()).resolves.toEqual({
        message: "E-mail ou senha inválidos.",
      });
    }
  });

  it("responde 429 com Retry-After acima do limite", async () => {
    for (let i = 0; i < POLITICA_LOGIN_EMAIL_IP.limiteFalhas; i += 1) {
      expect((await tentarSenhaErrada()).status).toBe(401);
    }

    const response = await tentarSenhaErrada();

    expect(response.status).toBe(429);
    expect(response.headers.get("Retry-After")).toBe("60");
    await expect(response.json()).resolves.toEqual({
      message: "Muitas tentativas de login. Tente novamente em 1 minuto.",
    });
  });

  it("não chega a verificar a senha enquanto está bloqueado", async () => {
    for (let i = 0; i < POLITICA_LOGIN_EMAIL_IP.limiteFalhas; i += 1) {
      await tentarSenhaErrada();
    }

    prismaMock.usuario.findUnique.mockClear();

    const response = await POST(criarRequest(usuario.email, "senha-errada", IP_ATACANTE));

    expect(response.status).toBe(429);
    // É o que impede o endpoint de virar vetor de DoS por exaustão de CPU
    // (scrypt) e o que garante que o bloqueio não pode ser contornado.
    expect(prismaMock.usuario.findUnique).not.toHaveBeenCalled();
  });

  it("volta a permitir quando a janela de bloqueio expira", async () => {
    for (let i = 0; i < POLITICA_LOGIN_EMAIL_IP.limiteFalhas; i += 1) {
      await tentarSenhaErrada();
    }

    expect((await tentarSenhaErrada()).status).toBe(429);

    vi.advanceTimersByTime(MINUTO + 1);

    // Liberado: volta a avaliar a credencial e responde 401 de novo.
    expect((await tentarSenhaErrada()).status).toBe(401);
  });

  it("login bem-sucedido zera o contador", async () => {
    for (let i = 0; i < POLITICA_LOGIN_EMAIL_IP.limiteFalhas - 1; i += 1) {
      expect((await tentarSenhaErrada()).status).toBe(401);
    }

    prismaMock.usuario.findUnique.mockResolvedValueOnce(usuario);
    const sucesso = await POST(criarRequest(usuario.email, "senha-correta", IP_ATACANTE));

    expect(sucesso.status).toBe(200);
    expect(sucesso.cookies.get(SESSAO_COOKIE_NOME)?.value).toBeTruthy();

    // Contador zerado: uma nova falha isolada não pode bloquear.
    expect((await tentarSenhaErrada()).status).toBe(401);
    expect((await tentarSenhaErrada()).status).toBe(401);
  });

  it("bloqueio não revela se o e-mail existe", async () => {
    const inexistente = "ninguem@exemplo.com";

    for (let i = 0; i < POLITICA_LOGIN_EMAIL_IP.limiteFalhas; i += 1) {
      prismaMock.usuario.findUnique.mockResolvedValueOnce(null);
      await POST(criarRequest(inexistente, "senha-errada", IP_ATACANTE));
    }

    prismaMock.usuario.findUnique.mockResolvedValueOnce(null);
    const respostaInexistente = await POST(criarRequest(inexistente, "senha-errada", IP_ATACANTE));

    // Mesmo status, mesmo corpo e mesmo cabeçalho do bloqueio de um e-mail
    // cadastrado (verificado no caso "responde 429 com Retry-After").
    expect(respostaInexistente.status).toBe(429);
    expect(respostaInexistente.headers.get("Retry-After")).toBe("60");
    await expect(respostaInexistente.json()).resolves.toEqual({
      message: "Muitas tentativas de login. Tente novamente em 1 minuto.",
    });
  });

  it("bloqueio de um IP não afeta o operador em outro IP", async () => {
    for (let i = 0; i < POLITICA_LOGIN_EMAIL_IP.limiteFalhas; i += 1) {
      await tentarSenhaErrada(IP_ATACANTE);
    }

    expect((await tentarSenhaErrada(IP_ATACANTE)).status).toBe(429);

    prismaMock.usuario.findUnique.mockResolvedValueOnce(usuario);
    const doBalcao = await POST(criarRequest(usuario.email, "senha-correta", IP_BALCAO));

    expect(doBalcao.status).toBe(200);
  });

  it("usuário inativo com senha correta não conta como falha", async () => {
    for (let i = 0; i < POLITICA_LOGIN_EMAIL_IP.limiteFalhas + 3; i += 1) {
      prismaMock.usuario.findUnique.mockResolvedValueOnce({ ...usuario, ativo: false });
      const response = await POST(criarRequest(usuario.email, "senha-correta", IP_BALCAO));

      expect(response.status).toBe(403);
    }
  });

  it("registra tentativa malsucedida em log, sem senha nem token", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    await tentarSenhaErrada();

    expect(warn).toHaveBeenCalledTimes(1);

    const registrado = JSON.parse(warn.mock.calls[0][0] as string);

    expect(registrado).toMatchObject({
      evento: "login_falha",
      email: usuario.email,
      ip: IP_ATACANTE,
      falhasConsecutivas: 1,
    });

    const serializado = warn.mock.calls[0][0] as string;
    expect(serializado).not.toContain("senha-errada");
    expect(serializado).not.toContain(usuario.senhaHash);
    expect(serializado).not.toContain("scrypt");
  });

  it("corpo inválido não consome o limite", async () => {
    for (let i = 0; i < POLITICA_LOGIN_EMAIL_IP.limiteFalhas + 3; i += 1) {
      const response = await POST(
        new NextRequest("http://localhost/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-real-ip": IP_ATACANTE },
          body: JSON.stringify({ email: "nao-e-email", senha: "" }),
        })
      );

      expect(response.status).toBe(400);
    }

    // O limite segue intacto para tentativas legítimas do mesmo IP.
    expect((await tentarSenhaErrada()).status).toBe(401);
  });
});
