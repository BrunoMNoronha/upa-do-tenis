import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { PATCH } from "./route";
import { MENSAGEM_CANCELAMENTO_NAO_PERMITIDO } from "@/lib/ordens-servico";

// Regra: somente OS ABERTA pode ser cancelada (ABERTA -> CANCELADA). A
// proteção vive no backend: leitura do status persistido + update condicional.

const { prismaMock } = vi.hoisted(() => {
  const mock: any = {
    ordemServico: { findUnique: vi.fn(), updateMany: vi.fn(), findUniqueOrThrow: vi.fn() },
    historicoStatus: { create: vi.fn() },
    $transaction: vi.fn(async (callback: any) => callback(mock)),
  };
  return { prismaMock: mock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
}));

const osId = "os-1";

function executar(statusNovo: string, id = osId) {
  return PATCH(
    new NextRequest(`http://localhost/api/ordens-servico/${id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusNovo }),
    }),
    { params: Promise.resolve({ id }) },
  );
}

function osComStatus(status: string) {
  return { id: osId, status, dataConclusao: null };
}

describe("PATCH /api/ordens-servico/[id]/status — cancelamento", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
    prismaMock.ordemServico.updateMany.mockResolvedValue({ count: 1 });
    prismaMock.ordemServico.findUniqueOrThrow.mockImplementation(async () => osComStatus("CANCELADA"));
    prismaMock.historicoStatus.create.mockResolvedValue({ id: "hist-1" });
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => vi.restoreAllMocks());

  it("permite ABERTA -> CANCELADA com update condicional ao status lido e histórico", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValue(osComStatus("ABERTA"));

    const resposta = await executar("CANCELADA");

    expect(resposta.status).toBe(200);
    expect((await resposta.json()).status).toBe("CANCELADA");
    expect(prismaMock.ordemServico.updateMany).toHaveBeenCalledWith({
      where: { id: osId, status: "ABERTA" },
      data: { status: "CANCELADA", dataConclusao: null },
    });
    expect(prismaMock.historicoStatus.create).toHaveBeenCalledWith({
      data: {
        ordemServicoId: osId,
        statusAnterior: "ABERTA",
        statusNovo: "CANCELADA",
        observacao: undefined,
      },
    });
  });

  it.each(["EM_ANDAMENTO", "CONCLUIDA", "ENTREGUE", "CANCELADA"])(
    "rejeita cancelar OS em %s sem alterar o registro",
    async (statusAtual) => {
      prismaMock.ordemServico.findUnique.mockResolvedValue(osComStatus(statusAtual));

      const resposta = await executar("CANCELADA");

      expect(resposta.status).toBe(400);
      expect((await resposta.json()).message).toBe(MENSAGEM_CANCELAMENTO_NAO_PERMITIDO);
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.ordemServico.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.historicoStatus.create).not.toHaveBeenCalled();
    },
  );

  it("rejeita com 409 quando o status muda entre a leitura e a escrita (tela obsoleta)", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValue(osComStatus("ABERTA"));
    prismaMock.ordemServico.updateMany.mockResolvedValue({ count: 0 });

    const resposta = await executar("CANCELADA");

    expect(resposta.status).toBe(409);
    expect((await resposta.json()).message).toBe(MENSAGEM_CANCELAMENTO_NAO_PERMITIDO);
    expect(prismaMock.historicoStatus.create).not.toHaveBeenCalled();
  });

  it("não permite sair de CANCELADA para nenhum outro status", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValue(osComStatus("CANCELADA"));

    for (const destino of ["EM_ANDAMENTO", "CONCLUIDA", "ENTREGUE"]) {
      const resposta = await executar(destino);
      expect(resposta.status).toBe(400);
    }
    expect(prismaMock.ordemServico.updateMany).not.toHaveBeenCalled();
  });

  it("mantém as transições homologadas (ABERTA -> EM_ANDAMENTO) com update condicional", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValue(osComStatus("ABERTA"));
    prismaMock.ordemServico.findUniqueOrThrow.mockResolvedValue(osComStatus("EM_ANDAMENTO"));

    const resposta = await executar("EM_ANDAMENTO");

    expect(resposta.status).toBe(200);
    expect(prismaMock.ordemServico.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: osId, status: "ABERTA" } }),
    );
  });

  it("retorna 404 quando a OS não existe", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValue(null);

    const resposta = await executar("CANCELADA");

    expect(resposta.status).toBe(404);
    expect(prismaMock.ordemServico.updateMany).not.toHaveBeenCalled();
  });
});
