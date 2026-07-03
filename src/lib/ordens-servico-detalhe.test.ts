import { Prisma } from "@prisma/client";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  obterDetalheOrdemServico,
  OrdemServicoDetalheError,
} from "@/lib/ordens-servico";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: {
    ordemServico: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock("@/lib/prisma", () => ({
  prisma: prismaMock,
}));

function criarDetalheOS(params?: {
  pagamentos?: Array<{ valor: number; formaPagamentoId?: string }>;
  valorTotal?: number;
  valorPago?: number;
}) {
  return {
    id: "os-1",
    numero: "OS-1001",
    status: "ABERTA",
    dataEntrada: new Date("2026-07-03T08:00:00.000Z"),
    dataPrevisao: new Date("2026-07-05T12:00:00.000Z"),
    dataConclusao: null,
    valorTotal: new Prisma.Decimal(params?.valorTotal ?? 150),
    valorDesconto: new Prisma.Decimal(0),
    valorSinal: new Prisma.Decimal(0),
    valorPago: new Prisma.Decimal(params?.valorPago ?? 0),
    saldo: new Prisma.Decimal((params?.valorTotal ?? 150) - (params?.valorPago ?? 0)),
    observacoes: "Teste",
    cliente: {
      id: "cli-1",
      nome: "Cliente Teste",
      telefone: "11999999999",
      email: null,
      cpfCnpj: null,
      observacoes: null,
      criadoEm: new Date("2026-07-02T08:00:00.000Z"),
      atualizadoEm: new Date("2026-07-02T08:00:00.000Z"),
    },
    itens: [
      {
        id: "item-1",
        tipoItem: "CALCADO",
        descricao: "Tenis corrida",
        valor: new Prisma.Decimal(150),
        servicos: [
          {
            id: "sio-1",
            valor: new Prisma.Decimal(150),
            servico: {
              id: "srv-1",
              nome: "Troca de sola",
              precoBase: new Prisma.Decimal(150),
            },
          },
        ],
      },
    ],
    pagamentos: (params?.pagamentos ?? []).map((p, index) => ({
      id: `pag-${index}`,
      tipo: "PAGAMENTO",
      valor: new Prisma.Decimal(p.valor),
      formaPagamentoId: p.formaPagamentoId ?? "fp-1",
      dataPagamento: new Date("2026-07-03T10:00:00.000Z"),
      observacoes: null,
      criadoEm: new Date("2026-07-03T10:00:00.000Z"),
      formaPagamento: {
        id: p.formaPagamentoId ?? "fp-1",
        nome: "PIX",
        tipo: "DIGITAL",
        ativo: true,
        criadoEm: new Date("2026-07-02T08:00:00.000Z"),
        atualizadoEm: new Date("2026-07-02T08:00:00.000Z"),
      },
    })),
    historicosStatus: [
      {
        id: "hist-1",
        ordemServicoId: "os-1",
        statusAnterior: null,
        statusNovo: "ABERTA",
        observacao: null,
        criadoEm: new Date("2026-07-03T08:00:00.000Z"),
      },
    ],
  };
}

describe("ordens-servico detalhe", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna detalhe consolidado para OS existente", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValueOnce(
      criarDetalheOS({ pagamentos: [{ valor: 50 }] }),
    );

    const detalhe = await obterDetalheOrdemServico("os-1");

    expect(detalhe.id).toBe("os-1");
    expect(detalhe.cliente.nome).toBe("Cliente Teste");
    expect(detalhe.itens.length).toBe(1);
    expect(detalhe.itens[0].servicos.length).toBe(1);
    expect(detalhe.pagamentos.length).toBe(1);
    expect(detalhe.pagamentos[0].formaPagamento.nome).toBe("PIX");
    expect(detalhe.historicosStatus.length).toBe(1);
  });

  it("falha para OS inexistente", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValueOnce(null);

    await expect(obterDetalheOrdemServico("os-inexistente")).rejects.toMatchObject<
      OrdemServicoDetalheError
    >({
      message: "Ordem de serviço não encontrada.",
      status: 404,
    });
  });

  it("retorna resumo financeiro calculado corretamente", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValueOnce(
      criarDetalheOS({ valorTotal: 150, pagamentos: [{ valor: 50 }, { valor: 25 }] }),
    );

    const detalhe = await obterDetalheOrdemServico("os-1");

    expect(detalhe.resumoFinanceiro).toEqual({
      valorTotal: 150,
      valorDesconto: 0,
      valorSinal: 0,
      valorPago: 75,
      saldo: 75,
      statusFinanceiro: "PARCIAL",
    });
  });

  it("mantem compatibilidade com OS sem pagamentos", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValueOnce(
      criarDetalheOS({ valorTotal: 150, valorPago: 40, pagamentos: [] }),
    );

    const detalhe = await obterDetalheOrdemServico("os-1");

    expect(detalhe.pagamentos).toEqual([]);
    expect(detalhe.resumoFinanceiro.valorPago).toBe(40);
    expect(detalhe.resumoFinanceiro.saldo).toBe(110);
    expect(detalhe.resumoFinanceiro.statusFinanceiro).toBe("PARCIAL");
  });
});