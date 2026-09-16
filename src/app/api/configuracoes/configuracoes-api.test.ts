import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn(),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    configuracaoSistema: {
      findUnique: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

import { exigirSessaoApi } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";
import { GET, PUT } from "./route";

function criarRequest(method: "GET" | "PUT", body?: unknown) {
  return new NextRequest("http://localhost/api/configuracoes", {
    method,
    headers: { "Content-Type": "application/json" },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

describe("/api/configuracoes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(exigirSessaoApi).mockResolvedValue(null as any);
  });

  describe("GET", () => {
    it("retorna 401 se o usuário não estiver autenticado", async () => {
      vi.mocked(exigirSessaoApi).mockResolvedValue(
        new Response(JSON.stringify({ message: "Não autenticado." }), {
          status: 401,
        }) as any,
      );

      const req = criarRequest("GET");
      const res = await GET(req);

      expect(res.status).toBe(401);
      expect(await res.json()).toEqual({ message: "Não autenticado." });
    });

    it("retorna linkAvaliacaoGoogle null quando não há valor salvo", async () => {
      vi.mocked(prisma.configuracaoSistema.findUnique).mockResolvedValue(null as any);

      const req = criarRequest("GET");
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ linkAvaliacaoGoogle: null });
    });

    it("retorna a URL persistida quando configurada", async () => {
      vi.mocked(prisma.configuracaoSistema.findUnique).mockResolvedValue({
        chave: "linkAvaliacaoGoogle",
        valor: "https://g.page/r/upa-do-tenis/review",
        atualizadoEm: new Date(),
      } as any);

      const req = criarRequest("GET");
      const res = await GET(req);

      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({
        linkAvaliacaoGoogle: "https://g.page/r/upa-do-tenis/review",
      });
    });

    it("retorna 500 em caso de erro no banco", async () => {
      vi.mocked(prisma.configuracaoSistema.findUnique).mockRejectedValue(
        new Error("Erro de conexão"),
      );

      const req = criarRequest("GET");
      const res = await GET(req);

      expect(res.status).toBe(500);
    });
  });

  describe("PUT", () => {
    it("retorna 401 se não autenticado", async () => {
      vi.mocked(exigirSessaoApi).mockResolvedValue(
        new Response(JSON.stringify({ message: "Não autenticado." }), {
          status: 401,
        }) as any,
      );

      const req = criarRequest("PUT", {
        linkAvaliacaoGoogle: "https://g.page/review",
      });
      const res = await PUT(req);

      expect(res.status).toBe(401);
    });

    it("salva URL HTTPS válida e retorna 200", async () => {
      vi.mocked(prisma.configuracaoSistema.upsert).mockResolvedValue({} as any);

      const req = criarRequest("PUT", {
        linkAvaliacaoGoogle: "  https://g.page/r/upa-do-tenis/review  ",
      });
      const res = await PUT(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.linkAvaliacaoGoogle).toBe(
        "https://g.page/r/upa-do-tenis/review",
      );
      expect(prisma.configuracaoSistema.upsert).toHaveBeenCalledWith({
        where: { chave: "linkAvaliacaoGoogle" },
        update: { valor: "https://g.page/r/upa-do-tenis/review" },
        create: {
          chave: "linkAvaliacaoGoogle",
          valor: "https://g.page/r/upa-do-tenis/review",
        },
      });
    });

    it("permite limpar o link enviando string vazia ou null", async () => {
      vi.mocked(prisma.configuracaoSistema.upsert).mockResolvedValue({} as any);

      const req = criarRequest("PUT", { linkAvaliacaoGoogle: "" });
      const res = await PUT(req);

      expect(res.status).toBe(200);
      const data = await res.json();
      expect(data.linkAvaliacaoGoogle).toBeNull();
      expect(prisma.configuracaoSistema.upsert).toHaveBeenCalledWith({
        where: { chave: "linkAvaliacaoGoogle" },
        update: { valor: "" },
        create: { chave: "linkAvaliacaoGoogle", valor: "" },
      });
    });

    it("rejeita URL HTTP ou esquema inválido com 400", async () => {
      const invalidos = [
        "http://inseguro.com",
        "javascript:alert(1)",
        "data:text/html,abc",
        "invalid-url",
      ];

      for (const link of invalidos) {
        const req = criarRequest("PUT", { linkAvaliacaoGoogle: link });
        const res = await PUT(req);

        expect(res.status).toBe(400);
        expect(prisma.configuracaoSistema.upsert).not.toHaveBeenCalled();
      }
    });

    it("retorna 500 se o banco falhar na persistência", async () => {
      vi.mocked(prisma.configuracaoSistema.upsert).mockRejectedValue(
        new Error("Falha de gravação"),
      );

      const req = criarRequest("PUT", {
        linkAvaliacaoGoogle: "https://g.page/r/upa",
      });
      const res = await PUT(req);

      expect(res.status).toBe(500);
    });
  });
});
