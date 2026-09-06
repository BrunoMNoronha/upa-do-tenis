import { prisma } from "@/lib/prisma";
import { calcularResumoFinanceiroOS, normalizarValoresDecimalParaClient } from "@/lib/ordens-servico-financeiro";

export type OsStatus = "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA" | "ENTREGUE";

export const transicoesPermitidas: Record<OsStatus, OsStatus[]> = {
  ABERTA: ["EM_ANDAMENTO"],
  EM_ANDAMENTO: ["CONCLUIDA"],
  CONCLUIDA: ["ENTREGUE"],
  ENTREGUE: [], // Estado final
};

export class OrdemServicoDetalheError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "OrdemServicoDetalheError";
    this.status = status;
  }
}

export async function listarOrdensServico() {
  const ordens = await prisma.ordemServico.findMany({
    include: {
      cliente: true,
      pagamentos: true,
      itens: {
        include: {
          servicos: {
            include: {
              servico: true,
            },
          },
        },
      },
      historicosStatus: {
        orderBy: {
          criadoEm: "desc",
        },
      },
    },
    // Ordem operacional: dataEntrada pode ser retroativa; criadoEm desempata
    // registros do mesmo dia mantendo o mais recente primeiro.
    orderBy: [{ dataEntrada: "desc" }, { criadoEm: "desc" }],
  });

  return ordens.map((ordem) => {
    const normalizada = normalizarValoresDecimalParaClient(ordem);
    const resumoFinanceiro = calcularResumoFinanceiroOS({
      statusOperacional: ordem.status,
      valorTotal: ordem.valorTotal,
      valorDesconto: ordem.valorDesconto,
      valorSinal: ordem.valorSinal,
      valorPago: ordem.valorPago,
      pagamentos: ordem.pagamentos,
      itens: ordem.itens,
    });

    return {
      ...normalizada,
      ...resumoFinanceiro,
    };
  });
}

export async function obterDetalheOrdemServico(id: string) {
  const ordem = await prisma.ordemServico.findUnique({
    where: { id },
    include: {
      cliente: true,
      itens: {
        include: {
          servicos: {
            include: {
              servico: true,
            },
          },
          insumos: {
            include: {
              insumo: true,
            },
            orderBy: {
              criadoEm: "desc",
            },
          },
        },
      },
      pagamentos: {
        include: {
          formaPagamento: true,
        },
        orderBy: [{ dataPagamento: "desc" }, { criadoEm: "desc" }],
      },
      historicosStatus: {
        orderBy: {
          criadoEm: "desc",
        },
      },
    },
  });

  if (!ordem) {
    throw new OrdemServicoDetalheError("Ordem de serviço não encontrada.", 404);
  }

  const resumoFinanceiro = calcularResumoFinanceiroOS({
    statusOperacional: ordem.status,
    valorTotal: ordem.valorTotal,
    valorDesconto: ordem.valorDesconto,
    valorSinal: ordem.valorSinal,
    valorPago: ordem.valorPago,
    pagamentos: ordem.pagamentos,
    itens: ordem.itens,
  });

  const ordemNormalizada = normalizarValoresDecimalParaClient(ordem);

  return {
    ...ordemNormalizada,
    resumoFinanceiro,
  };
}
