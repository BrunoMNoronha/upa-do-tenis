import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { GET, POST } from "./route";
import { listarOrdensServicoPaginado } from "@/lib/ordens-servico";
import { montarCaminhoAcompanhamento, verificarTokenAcompanhamento } from "@/lib/os-acompanhamento-token";

// ── Mocks ─────────────────────────────────────────────────────────────────────

const { prismaMock } = vi.hoisted(() => {
  const mock: any = {
    servico: { findMany: vi.fn() },
    ordemServico: { findUnique: vi.fn(), create: vi.fn() },
    itemOrdemServico: { create: vi.fn() },
    historicoStatus: { create: vi.fn() },
    $transaction: vi.fn(async (callback: any) => callback(mock)),
  };

  return { prismaMock: mock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

// Estes testes cobrem as regras de negócio da API; simulam requisição já
// autenticada. O enforcement de sessão é coberto em api-auth-enforcement.test.ts.
vi.mock("@/lib/auth-server", () => ({
  obterUsuarioSessaoDaRequest: vi.fn().mockResolvedValue({
    id: "usuario-1",
    nome: "Bruno Alves",
    email: "bruno@sapataria.com",
    ativo: true,
  }),
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
}));

vi.mock("@/lib/ordens-servico", () => ({
  listarOrdensServicoPaginado: vi.fn(),
}));

// ── Helpers ───────────────────────────────────────────────────────────────────

const payloadBase = {
  clienteId: "cliente-1",
      numeroOS: "0001",
  itemRecebido: "Tênis preto",
  prazoPrevisto: "2026-09-10",
  valorEstimado: 100,
  servicos: [{ servicoId: "servico-1", valor: 100 }],
};

function criarRequest(body: unknown) {
  return new NextRequest("http://localhost/api/ordens-servico", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function argumentosDoCreate() {
  return prismaMock.ordemServico.create.mock.calls[0][0];
}

// ── Testes ────────────────────────────────────────────────────────────────────

describe("GET /api/ordens-servico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 200 com a página de ordens no contrato { data, pagination }", async () => {
    const mockResultado = {
      data: [{ id: "os-1", numero: "OS-05092026-0001", status: "ABERTA" }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 },
    };
    vi.mocked(listarOrdensServicoPaginado).mockResolvedValue(mockResultado as any);

    const req = new NextRequest("http://localhost/api/ordens-servico", { method: "GET" });
    const resposta = await GET(req);

    expect(resposta.status).toBe(200);
    const body = await resposta.json();
    expect(body).toEqual(mockResultado);
    expect(listarOrdensServicoPaginado).toHaveBeenCalledTimes(1);
    expect(listarOrdensServicoPaginado).toHaveBeenCalledWith({
      filtros: { statusOperacional: "TODAS", statusFinanceiro: "TODAS", busca: "", atrasadas: false },
      paginacao: { page: 1, pageSize: 20, skip: 0, take: 20 },
    });
  });

  it("repassa page, pageSize, filtros e busca da query string", async () => {
    vi.mocked(listarOrdensServicoPaginado).mockResolvedValue({
      data: [],
      pagination: { page: 2, pageSize: 50, total: 0, totalPages: 1 },
    } as any);

    const req = new NextRequest(
      "http://localhost/api/ordens-servico?page=2&pageSize=50&statusOp=ABERTA&statusFin=PENDENTES&busca=cliente&atrasadas=true",
      { method: "GET" },
    );
    const resposta = await GET(req);

    expect(resposta.status).toBe(200);
    expect(listarOrdensServicoPaginado).toHaveBeenCalledWith({
      filtros: { statusOperacional: "ABERTA", statusFinanceiro: "PENDENTES", busca: "cliente", atrasadas: true },
      paginacao: { page: 2, pageSize: 50, skip: 50, take: 50 },
    });
  });

  it("normaliza page/pageSize inválidos e limita pageSize a 100", async () => {
    vi.mocked(listarOrdensServicoPaginado).mockResolvedValue({
      data: [],
      pagination: { page: 1, pageSize: 100, total: 0, totalPages: 1 },
    } as any);

    const req = new NextRequest("http://localhost/api/ordens-servico?page=abc&pageSize=500", { method: "GET" });
    await GET(req);

    expect(listarOrdensServicoPaginado).toHaveBeenCalledWith(
      expect.objectContaining({ paginacao: { page: 1, pageSize: 100, skip: 0, take: 100 } }),
    );
  });

  it("retorna 500 se ocorrer um erro ao listar as ordens", async () => {
    vi.mocked(listarOrdensServicoPaginado).mockRejectedValue(new Error("Erro de banco de dados"));

    const req = new NextRequest("http://localhost/api/ordens-servico", { method: "GET" });
    const resposta = await GET(req);

    expect(resposta.status).toBe(500);
    const body = await resposta.json();
    expect(body.message).toBe("Ocorreu um erro interno ao listar as ordens de serviço.");
  });
});

describe("POST /api/ordens-servico", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    // 05/09/2026 12:00 em Brasília.
    vi.setSystemTime(new Date("2026-09-05T15:00:00Z"));

    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
    prismaMock.servico.findMany.mockResolvedValue([{ id: "servico-1", ativo: true }]);
    prismaMock.ordemServico.findUnique.mockResolvedValue(null);
    prismaMock.ordemServico.create.mockResolvedValue({ id: "os-1", numero: "OS-05092026-0001" });
    prismaMock.itemOrdemServico.create.mockResolvedValue({ id: "item-1" });
    prismaMock.historicoStatus.create.mockResolvedValue({ id: "hist-1" });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("cria OS sem data informada usando a data atual e sem registro de rastreabilidade", async () => {
    const resposta = await POST(criarRequest(payloadBase));

    expect(resposta.status).toBe(201);
    expect(prismaMock.historicoStatus.create).not.toHaveBeenCalled();

    const body = await resposta.json();
    expect(body.caminhoAcompanhamento).toBe(montarCaminhoAcompanhamento("os-1"));
    expect(verificarTokenAcompanhamento(body.caminhoAcompanhamento.split("/").pop())).toBe("os-1");

    const dataEntrada = argumentosDoCreate().data.dataEntrada as Date;
    expect(dataEntrada).toBeInstanceOf(Date);
    expect(dataEntrada.getTime()).toBe(new Date("2026-09-05T15:00:00Z").getTime());
  });

  it("cria OS com data retroativa e registra a rastreabilidade no histórico", async () => {
    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        dataEntrada: "2026-09-01",
        justificativaDataEntrada: "OS anotada no caderno durante a queda de energia.",
      }),
    );

    expect(resposta.status).toBe(201);

    const dataEntrada = argumentosDoCreate().data.dataEntrada as Date;
    expect(dataEntrada.getFullYear()).toBe(2026);
    expect(dataEntrada.getMonth()).toBe(8);
    expect(dataEntrada.getDate()).toBe(1);

    expect(prismaMock.historicoStatus.create).toHaveBeenCalledTimes(1);
    const historico = prismaMock.historicoStatus.create.mock.calls[0][0].data;
    expect(historico.ordemServicoId).toBe("os-1");
    expect(historico.statusAnterior).toBeNull();
    expect(historico.statusNovo).toBe("ABERTA");
    expect(historico.observacao).toContain("[REGISTRO RETROATIVO]");
    expect(historico.observacao).toContain("01/09/2026");
    expect(historico.observacao).toContain("Bruno Alves");
    expect(historico.observacao).toContain("queda de energia");
  });

  it("compõe o número com a data de hoje e o número informado quando não há data retroativa", async () => {
    await POST(criarRequest({ ...payloadBase, numeroOS: "0124" }));

    expect(argumentosDoCreate().data.numero).toBe("OS-05092026-0124");
  });

  it("compõe o número com a Data de Entrada retroativa, não com a data de digitação", async () => {
    await POST(
      criarRequest({
        ...payloadBase,
        numeroOS: "0124",
        dataEntrada: "2026-09-01",
        justificativaDataEntrada: "OS anotada no caderno durante a queda de energia.",
      }),
    );

    expect(argumentosDoCreate().data.numero).toBe("OS-01092026-0124");
  });

  it("preserva zeros à esquerda do número informado", async () => {
    await POST(criarRequest({ ...payloadBase, numeroOS: "0007" }));

    expect(argumentosDoCreate().data.numero).toBe("OS-05092026-0007");
    expect(prismaMock.ordemServico.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { numero: "OS-05092026-0007" } }),
    );
  });

  it("rejeita número da OS ausente sem abrir transação", async () => {
    const { numeroOS: _ignorado, ...semNumero } = payloadBase;
    const resposta = await POST(criarRequest(semNumero));

    expect(resposta.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejeita número da OS com caracteres não numéricos sem abrir transação", async () => {
    const resposta = await POST(criarRequest({ ...payloadBase, numeroOS: "12A" }));

    expect(resposta.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejeita data futura sem abrir transação", async () => {
    const resposta = await POST(criarRequest({ ...payloadBase, dataEntrada: "2026-09-06" }));

    expect(resposta.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("rejeita data retroativa sem justificativa sem abrir transação", async () => {
    const resposta = await POST(criarRequest({ ...payloadBase, dataEntrada: "2026-09-01" }));

    expect(resposta.status).toBe(400);
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("retorna 409 quando já existe OS com o mesmo número composto", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValue({ id: "os-existente" });

    const resposta = await POST(criarRequest(payloadBase));

    expect(resposta.status).toBe(409);
    const body = await resposta.json();
    expect(body.message).toContain("OS-05092026-0001");
    expect(body.caminhoAcompanhamento).toBeUndefined();
    expect(prismaMock.$transaction).not.toHaveBeenCalled();
  });

  it("retorna 409 quando o banco rejeita o número duplicado na inserção (corrida)", async () => {
    const { Prisma } = await import("@prisma/client");
    prismaMock.ordemServico.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "5.22.0",
      }),
    );

    const resposta = await POST(criarRequest(payloadBase));

    expect(resposta.status).toBe(409);
  });

  it("desfaz a criação quando o registro de rastreabilidade falha", async () => {
    prismaMock.historicoStatus.create.mockRejectedValueOnce(new Error("falha ao gravar histórico"));

    const resposta = await POST(
      criarRequest({
        ...payloadBase,
        dataEntrada: "2026-09-01",
        justificativaDataEntrada: "OS anotada no caderno durante a queda de energia.",
      }),
    );

    expect(resposta.status).toBe(500);
    expect((await resposta.json()).caminhoAcompanhamento).toBeUndefined();
  });
});
