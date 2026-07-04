import { describe, expect, it } from "vitest";

import {
  SESSAO_DURACAO_SEGUNDOS,
  criarTokenSessao,
  verificarTokenSessao,
} from "./auth-session";

describe("auth-session", () => {
  it("cria token verificável com o id do usuário", () => {
    const token = criarTokenSessao("usuario-1");
    const payload = verificarTokenSessao(token);

    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe("usuario-1");
  });

  it("não expõe o id em texto puro sem codificação", () => {
    const token = criarTokenSessao("usuario-1");

    expect(token).not.toContain("usuario-1");
  });

  it("rejeita token expirado", () => {
    const agora = Date.now();
    const token = criarTokenSessao("usuario-1", agora);
    const depoisDaExpiracao = agora + (SESSAO_DURACAO_SEGUNDOS + 1) * 1000;

    expect(verificarTokenSessao(token, depoisDaExpiracao)).toBeNull();
  });

  it("aceita token dentro da validade", () => {
    const agora = Date.now();
    const token = criarTokenSessao("usuario-1", agora);
    const antesDaExpiracao = agora + (SESSAO_DURACAO_SEGUNDOS - 60) * 1000;

    expect(verificarTokenSessao(token, antesDaExpiracao)).not.toBeNull();
  });

  it("rejeita token com payload adulterado", () => {
    const token = criarTokenSessao("usuario-1");
    const [, assinatura] = token.split(".");
    const payloadFalso = Buffer.from(
      JSON.stringify({ sub: "usuario-2", exp: Math.floor(Date.now() / 1000) + 3600 })
    ).toString("base64url");

    expect(verificarTokenSessao(`${payloadFalso}.${assinatura}`)).toBeNull();
  });

  it("rejeita token com assinatura adulterada", () => {
    const token = criarTokenSessao("usuario-1");
    const [payload] = token.split(".");
    const assinaturaFalsa = Buffer.from("assinatura-invalida").toString("base64url");

    expect(verificarTokenSessao(`${payload}.${assinaturaFalsa}`)).toBeNull();
  });

  it("rejeita token malformado", () => {
    expect(verificarTokenSessao("")).toBeNull();
    expect(verificarTokenSessao("sem-ponto")).toBeNull();
    expect(verificarTokenSessao("a.b.c")).toBeNull();
    expect(verificarTokenSessao("..")).toBeNull();
  });
});
