import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

const { mockExigirSessaoApi, mockListarCaixas, mockAbrirCaixa, CaixaError } = vi.hoisted(() => {
  return {
    mockExigirSessaoApi: vi.fn(),
    mockListarCaixas: vi.fn(),
    mockAbrirCaixa: vi.fn(),
    CaixaError: class CaixaError extends Error {
      status: number;
      constructor(message: string, status = 400) {
        super(message);
        this.name = "CaixaError";
        this.status = status;
      }
    }
  };
});

vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: mockExigirSessaoApi,
}));

vi.mock("@/lib/caixa", () => ({
  listarCaixas: mockListarCaixas,
  abrirCaixa: mockAbrirCaixa,
  CaixaError,
}));

function criarRequest(method: string, url: string, body?: any) {
  return new NextRequest(url, {
    method,
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

describe("Caixa API (src/app/api/caixa/route.ts)", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET", () => {
    it("deve retornar erro de autenticação se sessão for inválida", async () => {
      const respErroAuth = new Response("Nao autenticado", { status: 401 });
      mockExigirSessaoApi.mockResolvedValueOnce(respErroAuth);

      const req = criarRequest("GET", "http://localhost/api/caixa");
      const res = await GET(req);

      expect(res.status).toBe(401);
      expect(mockExigirSessaoApi).toHaveBeenCalledWith(req);
      expect(mockListarCaixas).not.toHaveBeenCalled();
    });

    it("deve listar caixas e retornar 200", async () => {
      mockExigirSessaoApi.mockResolvedValueOnce(null); // Autenticado
      const caixasMock = [{ id: "caixa-1" }, { id: "caixa-2" }];
      mockListarCaixas.mockResolvedValueOnce(caixasMock);

      const req = criarRequest("GET", "http://localhost/api/caixa?take=10&skip=0&dataInicio=2023-01-01&dataFim=2023-12-31");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(mockListarCaixas).toHaveBeenCalledWith({
        take: 10,
        skip: 0,
        dataInicio: "2023-01-01",
        dataFim: "2023-12-31"
      });
      expect(json).toEqual(caixasMock);
    });

    it("deve lidar com parametros opcionais vazios", async () => {
        mockExigirSessaoApi.mockResolvedValueOnce(null);
        mockListarCaixas.mockResolvedValueOnce([]);

        const req = criarRequest("GET", "http://localhost/api/caixa");
        const res = await GET(req);

        expect(res.status).toBe(200);
        expect(mockListarCaixas).toHaveBeenCalledWith({
          take: undefined,
          skip: undefined,
          dataInicio: undefined,
          dataFim: undefined
        });
    });

    it("deve retornar 500 em caso de erro no servico", async () => {
      mockExigirSessaoApi.mockResolvedValueOnce(null); // Autenticado
      mockListarCaixas.mockRejectedValueOnce(new Error("Database error"));

      const req = criarRequest("GET", "http://localhost/api/caixa");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.message).toBe("Ocorreu um erro interno ao listar caixas.");
    });
  });

  describe("POST", () => {
    it("deve retornar erro de autenticação se sessão for inválida", async () => {
      const respErroAuth = new Response("Nao autenticado", { status: 401 });
      mockExigirSessaoApi.mockResolvedValueOnce(respErroAuth);

      const req = criarRequest("POST", "http://localhost/api/caixa", { saldoInicial: 100 });
      const res = await POST(req);

      expect(res.status).toBe(401);
      expect(mockExigirSessaoApi).toHaveBeenCalledWith(req);
      expect(mockAbrirCaixa).not.toHaveBeenCalled();
    });

    it("deve rejeitar body invalido com 400", async () => {
      mockExigirSessaoApi.mockResolvedValueOnce(null);

      // saldoInicial negativo (deve falhar no zod schema)
      const req = criarRequest("POST", "http://localhost/api/caixa", { saldoInicial: -10 });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("Dados inválidos.");
      expect(json.errors).toBeDefined();
      expect(mockAbrirCaixa).not.toHaveBeenCalled();
    });

    it("deve abrir o caixa e retornar 201", async () => {
      mockExigirSessaoApi.mockResolvedValueOnce(null);
      const caixaCriado = { id: "caixa-novo", saldoInicial: 100, observacao: "teste" };
      mockAbrirCaixa.mockResolvedValueOnce(caixaCriado);

      const payload = { saldoInicial: 100, observacao: "teste" };
      const req = criarRequest("POST", "http://localhost/api/caixa", payload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(201);
      expect(mockAbrirCaixa).toHaveBeenCalledWith(payload);
      expect(json).toEqual(caixaCriado);
    });

    it("deve lidar com CaixaError retornando o status correspondente", async () => {
      mockExigirSessaoApi.mockResolvedValueOnce(null);
      mockAbrirCaixa.mockRejectedValueOnce(new CaixaError("Já existe um caixa aberto.", 400));

      const payload = { saldoInicial: 100 };
      const req = criarRequest("POST", "http://localhost/api/caixa", payload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.message).toBe("Já existe um caixa aberto.");
    });

    it("deve retornar 500 em caso de erro generico no servico", async () => {
      mockExigirSessaoApi.mockResolvedValueOnce(null);
      mockAbrirCaixa.mockRejectedValueOnce(new Error("Erro generico"));

      const payload = { saldoInicial: 100 };
      const req = criarRequest("POST", "http://localhost/api/caixa", payload);
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.message).toBe("Ocorreu um erro interno ao abrir o caixa.");
    });
  });
});
