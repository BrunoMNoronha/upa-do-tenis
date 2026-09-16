import { describe, expect, it } from "vitest";
import { NextRequest } from "next/server";

import { SESSAO_COOKIE_NOME } from "@/lib/auth-constants";
import { criarTokenSessao } from "@/lib/auth-session";
import { montarCaminhoAcompanhamento } from "@/lib/os-acompanhamento-token";
import { middleware } from "./middleware";

function criarRequest(path: string, token?: string) {
  return new NextRequest(`http://localhost${path}`, {
    headers: token ? { cookie: `${SESSAO_COOKIE_NOME}=${token}` } : {},
  });
}

describe("middleware de autenticação", () => {
  it("bloqueia IP estrangeiro", async () => {
    const req = criarRequest("/login");
    req.headers.set("x-vercel-ip-country", "US");
    const response = await middleware(req);
    expect(response.status).toBe(403);
  });

  it("permite IP BR", async () => {
    const req = criarRequest("/login");
    req.headers.set("x-vercel-ip-country", "BR");
    const response = await middleware(req);
    expect(response.status).toBe(200);
  });

  it("redireciona página privada sem sessão para /login", async () => {
    const response = await middleware(criarRequest("/dashboard"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("redireciona a raiz sem sessão para /login", async () => {
    const response = await middleware(criarRequest("/"));

    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost/login");
  });

  it("responde 401 em API privada sem sessão", async () => {
    for (const rota of [
      "/api/dashboard",
      "/api/caixa",
      "/api/caixa/abc/movimentacoes",
      "/api/clientes",
      "/api/ordens-servico/abc/pagamentos",
      "/api/relatorios/financeiro-os",
      "/api/vendas",
      "/api/usuarios",
    ]) {
      const response = await middleware(criarRequest(rota));

      expect(response.status, `rota ${rota}`).toBe(401);
    }
  });

  it("responde 401 em API privada com token adulterado", async () => {
    const response = await middleware(criarRequest("/api/caixa", "token-invalido"));

    expect(response.status).toBe(401);
  });

  it("deixa passar página privada com sessão válida", async () => {
    const token = criarTokenSessao("usr-1");
    const response = await middleware(criarRequest("/caixa", token));

    expect(response.status).toBe(200);
    expect(response.headers.get("location")).toBeNull();
  });

  it("deixa passar API privada com sessão válida", async () => {
    const token = criarTokenSessao("usr-1");
    const response = await middleware(criarRequest("/api/vendas", token));

    expect(response.status).toBe(200);
  });

  it("mantém rotas públicas acessíveis sem sessão", async () => {
    for (const rota of ["/login", "/api/auth/login", "/api/auth/logout"]) {
      const response = await middleware(criarRequest(rota));

      expect(response.status, `rota ${rota}`).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("deixa a página pública de acompanhamento chegar à validação do token sem sessão", async () => {
    for (const rota of [montarCaminhoAcompanhamento("os-1"), "/acompanhar/token-truncado"]) {
      const response = await middleware(criarRequest(rota));

      expect(response.status, `rota ${rota}`).toBe(200);
      expect(response.headers.get("location")).toBeNull();
    }
  });

  it("não abre subrotas, a raiz de /acompanhar nem APIs com o prefixo público", async () => {
    const caminho = montarCaminhoAcompanhamento("os-1");

    for (const rota of ["/acompanhar", "/acompanhar/", `${caminho}/dashboard`, "/acompanhar/x/../../caixa"]) {
      const response = await middleware(criarRequest(rota));
      expect(response.status, `rota ${rota}`).toBe(307);
      expect(response.headers.get("location")).toBe("http://localhost/login");
    }

    for (const rota of ["/api/acompanhar/x", `/api/ordens-servico${caminho}`]) {
      const response = await middleware(criarRequest(rota));
      expect(response.status, `rota ${rota}`).toBe(401);
    }
  });

  it("token de acompanhamento não vale como sessão administrativa", async () => {
    const token = montarCaminhoAcompanhamento("os-1").split("/").pop();

    expect((await middleware(criarRequest("/api/ordens-servico/os-1", token))).status).toBe(401);
    expect((await middleware(criarRequest("/ordens-servico/os-1", token))).status).toBe(307);
  });
});
