import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET, POST } from "./route";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { listarCaixasMock, abrirCaixaMock, CaixaErrorMock, exigirSessaoApiMock } = vi.hoisted(() => {
  class CaixaErrorMock extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.name = "CaixaError";
      this.status = status;
    }
  }

  return {
    listarCaixasMock: vi.fn(),
    abrirCaixaMock: vi.fn(),
    CaixaErrorMock,
    exigirSessaoApiMock: vi.fn(),
  };
});

vi.mock("@/lib/caixa", () => ({
  listarCaixas: listarCaixasMock,
  abrirCaixa: abrirCaixaMock,
  CaixaError: CaixaErrorMock,
}));

vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: exigirSessaoApiMock,
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

function criarRequest(body?: unknown, searchParams = "") {
  return new NextRequest(`http://localhost/api/caixa${searchParams}`, {
    method: body ? "POST" : "GET",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("GET /api/caixa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exigirSessaoApiMock.mockResolvedValue(null);
  });

  it("retorna 401 quando não autenticado", async () => {
    exigirSessaoApiMock.mockResolvedValueOnce(
      NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    );

    const response = await GET(criarRequest());

    expect(response.status).toBe(401);
    expect(listarCaixasMock).not.toHaveBeenCalled();
  });

  it("retorna 200 e lista caixas sem filtros", async () => {
    const caixas = [{ id: "1" }];
    listarCaixasMock.mockResolvedValueOnce(caixas);

    const response = await GET(criarRequest());
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toEqual(caixas);
    expect(listarCaixasMock).toHaveBeenCalledWith({
      take: undefined,
      skip: undefined,
      dataInicio: undefined,
      dataFim: undefined,
    });
  });

  it("retorna 200 e lista caixas com filtros", async () => {
    listarCaixasMock.mockResolvedValueOnce([]);

    const response = await GET(criarRequest(undefined, "?take=10&skip=5&dataInicio=2024-01-01&dataFim=2024-12-31"));

    expect(response.status).toBe(200);
    expect(listarCaixasMock).toHaveBeenCalledWith({
      take: 10,
      skip: 5,
      dataInicio: "2024-01-01",
      dataFim: "2024-12-31",
    });
  });

  it("retorna 500 para erro inesperado", async () => {
    listarCaixasMock.mockRejectedValueOnce(new Error("Erro de DB"));

    const response = await GET(criarRequest());

    expect(response.status).toBe(500);
  });
});

describe("POST /api/caixa", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exigirSessaoApiMock.mockResolvedValue(null);
  });

  it("retorna 401 quando não autenticado", async () => {
    exigirSessaoApiMock.mockResolvedValueOnce(
      NextResponse.json({ message: "Não autorizado" }, { status: 401 })
    );

    const response = await POST(criarRequest({ saldoInicial: 100 }));

    expect(response.status).toBe(401);
    expect(abrirCaixaMock).not.toHaveBeenCalled();
  });

  it("retorna 201 e dados do caixa ao abrir com sucesso", async () => {
    const novoCaixa = { id: "2", saldoInicial: 250 };
    abrirCaixaMock.mockResolvedValueOnce(novoCaixa);

    const payload = { saldoInicial: 250, observacao: "Caixa extra" };
    const response = await POST(criarRequest(payload));
    const data = await response.json();

    expect(response.status).toBe(201);
    expect(data).toEqual(novoCaixa);
    expect(abrirCaixaMock).toHaveBeenCalledWith(payload);
  });

  it("retorna 400 quando o payload é inválido", async () => {
    // saldoInicial inválido (deveria ser número, mas enviando string que não é um número em formato string ou um valor negativo)
    const response = await POST(criarRequest({ saldoInicial: -50 }));

    expect(response.status).toBe(400);
    expect(abrirCaixaMock).not.toHaveBeenCalled();
  });

  it("retorna o status e mensagem de erro do CaixaError", async () => {
    abrirCaixaMock.mockRejectedValueOnce(
      new CaixaErrorMock("Já existe um caixa aberto.", 400)
    );

    const response = await POST(criarRequest({ saldoInicial: 100 }));
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.message).toBe("Já existe um caixa aberto.");
  });

  it("retorna 500 para erro inesperado", async () => {
    abrirCaixaMock.mockRejectedValueOnce(new Error("Falha interna"));

    const response = await POST(criarRequest({ saldoInicial: 100 }));

    expect(response.status).toBe(500);
  });
});
