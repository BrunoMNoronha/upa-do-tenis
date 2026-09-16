import { prisma } from "@/lib/prisma";
import { calcularResumoFinanceiroOS, normalizarValoresDecimalParaClient } from "@/lib/ordens-servico-financeiro";

export {
  transicoesPermitidas,
  transicaoPermitida,
  podeCancelarOrdemServico,
} from "@/lib/ordens-servico-status";
export type { OsStatus } from "@/lib/ordens-servico-status";

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
    // Favoritas primeiro (marcador operacional, issue #153). Dentro de cada
    // grupo vale a ordem operacional: dataEntrada pode ser retroativa; criadoEm
    // desempata registros do mesmo dia mantendo o mais recente primeiro.
    orderBy: [{ favorita: "desc" }, { dataEntrada: "desc" }, { criadoEm: "desc" }],
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

/**
 * Marca ou desmarca uma OS como favorita. Operação idempotente: quando o
 * estado persistido já é o solicitado, nada é gravado. Só o campo
 * `favorita` é escrito; status, datas, valores e vínculos ficam intactos.
 */
export async function definirFavoritaOrdemServico(id: string, favorita: boolean) {
  const atual = await prisma.ordemServico.findUnique({
    where: { id },
    select: { id: true, numero: true, favorita: true },
  });

  if (!atual) {
    throw new OrdemServicoDetalheError("Ordem de serviço não encontrada.", 404);
  }

  if (atual.favorita === favorita) {
    return atual;
  }

  return prisma.ordemServico.update({
    where: { id },
    data: { favorita },
    select: { id: true, numero: true, favorita: true },
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
