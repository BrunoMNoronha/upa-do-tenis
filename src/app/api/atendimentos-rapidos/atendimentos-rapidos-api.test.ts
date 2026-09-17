import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET, POST } from "./route";

const { registrarMock, listarMock, AtendimentoRapidoErrorMock } = vi.hoisted(() => {
  class AtendimentoRapidoErrorMock extends Error {
    status: number;
    constructor(message: string, status = 400) {
      super(message);
      this.name = "AtendimentoRapidoError";
      this.status = status;
    }
  }

  return { registrarMock: vi.fn(), listarMock: vi.fn(), AtendimentoRapidoErrorMock };
});

vi.mock("@/lib/atendimento-rapido", () => ({
  registrarAtendimentoRapido: registrarMock,
  listarAtendimentosRapidosPaginado: listarMock,
  AtendimentoRapidoError: AtendimentoRapidoErrorMock,
}));

// Requisição já autenticada; o 401 sem sessão é coberto em api-auth-enforcement.test.ts.
vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
  obterUsuarioSessaoDaRequest: vi.fn().mockResolvedValue({ id: "usuario-1", nome: "Operador" }),
}));

const payloadValido = {
  chaveIdempotencia: "7d0e1a0c-5a47-4a5c-9c1e-6f7d3c1b2a90",
  itens: [{ servicoId: "srv-1", valor: "100.00" }],
  pagamentos: [
    { formaPagamentoId: "pix", valor: "60.00" },
    { formaPagamentoId: "dinheiro", valor: "40.00" },
  ],
};

function criarPost(body: unknown) {
  return new NextRequest("http://localhost/api/atendimentos-rapidos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

describe("POST /api/atendimentos-rapidos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("201 ao criar, passando valores em centavos e o usuário da sessão", async () => {
    registrarMock.mockResolvedValueOnce({ atendimento: { id: "ar-1", codigo: "AR-17092026-0001" }, reaproveitado: false });

    const response = await POST(criarPost(payloadValido));

    expect(response.status).toBe(201);
    expect(await response.json()).toEqual({
      atendimento: { id: "ar-1", codigo: "AR-17092026-0001" },
      reaproveitado: false,
    });
    expect(registrarMock).toHaveBeenCalledWith(
      {
        chaveIdempotencia: payloadValido.chaveIdempotencia,
        observacoes: undefined,
        itens: [{ servicoId: "srv-1", valorCentavos: 10000 }],
        pagamentos: [
          { formaPagamentoId: "pix", valorCentavos: 6000 },
          { formaPagamentoId: "dinheiro", valorCentavos: 4000 },
        ],
      },
      { usuarioId: "usuario-1" },
    );
  });

  it("200 quando a mesma chave devolve atendimento já registrado", async () => {
    registrarMock.mockResolvedValueOnce({ atendimento: { id: "ar-1" }, reaproveitado: true });

    const response = await POST(criarPost(payloadValido));

    expect(response.status).toBe(200);
    expect((await response.json()).reaproveitado).toBe(true);
  });

  it("400 com mensagem legível quando a soma não bate, sem chamar o serviço", async () => {
    const response = await POST(
      criarPost({ ...payloadValido, pagamentos: [{ formaPagamentoId: "pix", valor: "99.99" }] }),
    );

    expect(response.status).toBe(400);
    expect((await response.json()).message).toMatch(/soma dos pagamentos/);
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("400 para JSON malformado", async () => {
    const response = await POST(criarPost("{nao-json"));
    expect(response.status).toBe(400);
    expect(registrarMock).not.toHaveBeenCalled();
  });

  it("repassa status de erro de domínio (caixa fechado, conflito de chave)", async () => {
    registrarMock.mockRejectedValueOnce(new AtendimentoRapidoErrorMock("Não há caixa aberto. Abra o caixa primeiro.", 400));
    const semCaixa = await POST(criarPost(payloadValido));
    expect(semCaixa.status).toBe(400);
    expect((await semCaixa.json()).message).toBe("Não há caixa aberto. Abra o caixa primeiro.");

    registrarMock.mockRejectedValueOnce(new AtendimentoRapidoErrorMock("Esta chave de envio já foi usada para outro atendimento.", 409));
    const conflito = await POST(criarPost(payloadValido));
    expect(conflito.status).toBe(409);
  });

  it("500 genérico para erro inesperado, sem vazar detalhe técnico", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    registrarMock.mockRejectedValueOnce(new Error("prisma exploded"));

    const response = await POST(criarPost(payloadValido));

    expect(response.status).toBe(500);
    expect((await response.json()).message).toBe("Ocorreu um erro interno ao registrar o atendimento rápido.");
    consoleError.mockRestore();
  });
});

describe("GET /api/atendimentos-rapidos", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("lista com busca por código, período e paginação", async () => {
    listarMock.mockResolvedValueOnce({ data: [], pagination: { page: 2, pageSize: 20, total: 0, totalPages: 1 } });

    const response = await GET(
      new NextRequest(
        "http://localhost/api/atendimentos-rapidos?busca=AR-17092026&dataInicial=2026-09-01&dataFinal=2026-09-17&page=2",
      ),
    );

    expect(response.status).toBe(200);
    expect(listarMock).toHaveBeenCalledWith({
      filtros: { busca: "AR-17092026", dataInicial: "2026-09-01", dataFinal: "2026-09-17" },
      paginacao: expect.objectContaining({ page: 2 }),
    });
  });
});
