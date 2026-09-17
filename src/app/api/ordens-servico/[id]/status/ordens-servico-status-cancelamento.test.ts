import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { PATCH } from "./route";

// Cancelamento seguro de OS: somente ABERTA -> CANCELADA, garantido pelo
// backend com base no estado persistido no momento da operação.

const { prismaMock } = vi.hoisted(() => {
  const mock: any = {
    ordemServico: { findUnique: vi.fn(), updateMany: vi.fn() },
    historicoStatus: { create: vi.fn() },
    pagamento: { count: vi.fn() },
    $transaction: vi.fn(async (callback: any) => callback(mock)),
  };

  return { prismaMock: mock };
});

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: vi.fn().mockResolvedValue(null),
}));

const OS_ID = "os-1";

function criarRequest(body: unknown) {
  return new NextRequest(`http://localhost/api/ordens-servico/${OS_ID}/status`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function chamarPatch(body: unknown) {
  return PATCH(criarRequest(body), { params: Promise.resolve({ id: OS_ID }) });
}

function ordemComStatus(status: string) {
  return {
    id: OS_ID,
    numero: "OS-0001",
    status,
    dataConclusao: null,
    valorTotal: 100,
    valorPago: 0,
    saldo: 100,
  };
}

/**
 * Simula o banco: a primeira leitura devolve o status "persistido" e o
 * updateMany só afeta linha quando o status condicional confere com o
 * status existente no momento da gravação.
 */
function configurarBanco(
  statusPersistido: string,
  statusNoMomentoDoUpdate = statusPersistido,
  statusFinal = "CANCELADA",
) {
  prismaMock.ordemServico.findUnique
    .mockResolvedValueOnce(ordemComStatus(statusPersistido))
    .mockResolvedValue(ordemComStatus(statusFinal));

  prismaMock.ordemServico.updateMany.mockImplementation(async (args: any) => ({
    count: args.where.status === statusNoMomentoDoUpdate ? 1 : 0,
  }));
}

beforeEach(() => {
  vi.resetAllMocks();
  prismaMock.$transaction.mockImplementation(async (callback: any) => callback(prismaMock));
  prismaMock.historicoStatus.create.mockResolvedValue({ id: "hist-1" });
  prismaMock.pagamento.count.mockResolvedValue(0);
});

describe("PATCH /api/ordens-servico/[id]/status - cancelamento", () => {
  it("cancela uma OS ABERTA, registra histórico ABERTA -> CANCELADA e não exclui a OS", async () => {
    configurarBanco("ABERTA");

    const response = await chamarPatch({ statusNovo: "CANCELADA" });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe("CANCELADA");

    expect(prismaMock.ordemServico.updateMany).toHaveBeenCalledTimes(1);
    const updateArgs = prismaMock.ordemServico.updateMany.mock.calls[0][0];
    // Cancelamento exige valorPago = 0 na própria gravação (#229).
    expect(updateArgs.where).toEqual({ id: OS_ID, status: "ABERTA", valorPago: 0, valorSinal: 0 });
    expect(updateArgs.data.status).toBe("CANCELADA");
    expect(updateArgs.data.dataConclusao).toBeNull();

    expect(prismaMock.historicoStatus.create).toHaveBeenCalledWith({
      data: {
        ordemServicoId: OS_ID,
        statusAnterior: "ABERTA",
        statusNovo: "CANCELADA",
        observacao: undefined,
      },
    });

    // Nenhuma exclusão física nem efeito colateral: a rota só toca em
    // ordemServico (update), historicoStatus (create) e lê pagamento (count).
    expect(prismaMock.ordemServico).not.toHaveProperty("delete");
    expect(Object.keys(prismaMock)).toEqual(["ordemServico", "historicoStatus", "pagamento", "$transaction"]);
    expect(prismaMock.pagamento.count).toHaveBeenCalledWith({ where: { ordemServicoId: OS_ID, estorno: null } });
  });

  it("propaga a observação do cancelamento para o histórico", async () => {
    configurarBanco("ABERTA");

    const response = await chamarPatch({ statusNovo: "CANCELADA", observacao: "Cliente desistiu" });

    expect(response.status).toBe(200);
    expect(prismaMock.historicoStatus.create.mock.calls[0][0].data.observacao).toBe("Cliente desistiu");
  });

  it.each(["EM_ANDAMENTO", "CONCLUIDA", "ENTREGUE"])(
    "rejeita cancelamento de OS %s sem gravar nada",
    async (status) => {
      configurarBanco(status);

      const response = await chamarPatch({ statusNovo: "CANCELADA" });
      const payload = await response.json();

      expect(response.status).toBe(400);
      expect(payload.message).toContain("Transição inválida");
      expect(prismaMock.$transaction).not.toHaveBeenCalled();
      expect(prismaMock.ordemServico.updateMany).not.toHaveBeenCalled();
      expect(prismaMock.historicoStatus.create).not.toHaveBeenCalled();
    },
  );

  it("rejeita cancelar novamente uma OS já CANCELADA (400, sem novo histórico)", async () => {
    configurarBanco("CANCELADA");

    const response = await chamarPatch({ statusNovo: "CANCELADA" });

    expect(response.status).toBe(400);
    expect(prismaMock.ordemServico.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.historicoStatus.create).not.toHaveBeenCalled();
  });

  it.each(["EM_ANDAMENTO", "CONCLUIDA", "ENTREGUE"])(
    "não permite reabrir uma OS cancelada para %s",
    async (statusNovo) => {
      configurarBanco("CANCELADA");

      const response = await chamarPatch({ statusNovo });

      expect(response.status).toBe(400);
      expect(prismaMock.ordemServico.updateMany).not.toHaveBeenCalled();
    },
  );

  it("responde 409 quando outro operador alterou o status entre a leitura e a gravação", async () => {
    // A interface mostrava ABERTA, mas no momento do update a OS já estava EM_ANDAMENTO.
    configurarBanco("ABERTA", "EM_ANDAMENTO");

    const response = await chamarPatch({ statusNovo: "CANCELADA" });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.message).toContain("alterada por outro operador");
    expect(prismaMock.ordemServico.updateMany).toHaveBeenCalledTimes(1);
    expect(prismaMock.historicoStatus.create).not.toHaveBeenCalled();
  });

  it("recusa com 409 cancelar OS que tem pagamento registrado, sem gravar nada (#229)", async () => {
    configurarBanco("ABERTA");
    prismaMock.pagamento.count.mockResolvedValue(1);

    const response = await chamarPatch({ statusNovo: "CANCELADA" });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.message).toContain("possui pagamento registrado");
    expect(prismaMock.ordemServico.updateMany).not.toHaveBeenCalled();
    expect(prismaMock.historicoStatus.create).not.toHaveBeenCalled();
  });

  it("recusa com 409 de pagamento quando um pagamento concorrente gravou valorPago antes (#229)", async () => {
    prismaMock.ordemServico.findUnique
      .mockResolvedValueOnce(ordemComStatus("ABERTA"))
      .mockResolvedValueOnce({ status: "ABERTA", valorPago: 40 });
    prismaMock.ordemServico.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.pagamento.count.mockResolvedValueOnce(0).mockResolvedValueOnce(1);

    const response = await chamarPatch({ statusNovo: "CANCELADA" });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.message).toContain("possui pagamento registrado");
    expect(prismaMock.historicoStatus.create).not.toHaveBeenCalled();
  });

  it("recusa com 409 de sinal legado, sem orientar estorno, quando a OS tem só sinal (#229, #230)", async () => {
    prismaMock.ordemServico.findUnique
      .mockResolvedValueOnce(ordemComStatus("ABERTA"))
      .mockResolvedValueOnce({ status: "ABERTA", valorPago: 0, valorSinal: 30 });
    prismaMock.ordemServico.updateMany.mockResolvedValue({ count: 0 });
    prismaMock.pagamento.count.mockResolvedValue(0);

    const response = await chamarPatch({ statusNovo: "CANCELADA" });
    const payload = await response.json();

    expect(response.status).toBe(409);
    expect(payload.message).toContain("sinal registrado no sistema anterior");
    expect(payload.message).not.toContain("Estorne");
    expect(prismaMock.historicoStatus.create).not.toHaveBeenCalled();
  });

  it("não consulta pagamentos nem exige valorPago em transições que não são cancelamento", async () => {
    configurarBanco("ABERTA", "ABERTA", "EM_ANDAMENTO");

    const response = await chamarPatch({ statusNovo: "EM_ANDAMENTO" });

    expect(response.status).toBe(200);
    expect(prismaMock.pagamento.count).not.toHaveBeenCalled();
    expect(prismaMock.ordemServico.updateMany.mock.calls[0][0].where).toEqual({ id: OS_ID, status: "ABERTA" });
  });

  it("retorna 404 quando a OS não existe", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValue(null);

    const response = await chamarPatch({ statusNovo: "CANCELADA" });

    expect(response.status).toBe(404);
    expect(prismaMock.ordemServico.updateMany).not.toHaveBeenCalled();
  });

  it("rejeita status desconhecido pelo schema antes de consultar o banco", async () => {
    configurarBanco("ABERTA");

    const response = await chamarPatch({ statusNovo: "EXCLUIDA" });

    expect(response.status).toBe(400);
    expect(prismaMock.ordemServico.findUnique).not.toHaveBeenCalled();
  });
});

describe("PATCH /api/ordens-servico/[id]/status - regressão do fluxo operacional", () => {
  it.each([
    ["ABERTA", "EM_ANDAMENTO"],
    ["EM_ANDAMENTO", "CONCLUIDA"],
    ["CONCLUIDA", "ENTREGUE"],
  ])("continua permitindo %s -> %s", async (statusAtual, statusNovo) => {
    configurarBanco(statusAtual, statusAtual, statusNovo);

    const response = await chamarPatch({ statusNovo });
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.status).toBe(statusNovo);
    expect(prismaMock.ordemServico.updateMany.mock.calls[0][0].where).toEqual({
      id: OS_ID,
      status: statusAtual,
    });
    expect(prismaMock.historicoStatus.create.mock.calls[0][0].data).toMatchObject({
      statusAnterior: statusAtual,
      statusNovo,
    });
  });

  it("define dataConclusao ao concluir", async () => {
    configurarBanco("EM_ANDAMENTO", "EM_ANDAMENTO", "CONCLUIDA");

    await chamarPatch({ statusNovo: "CONCLUIDA" });

    expect(prismaMock.ordemServico.updateMany.mock.calls[0][0].data.dataConclusao).toBeInstanceOf(Date);
  });
});
