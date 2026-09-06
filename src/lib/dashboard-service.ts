import { prisma } from './prisma';
import { inicioDoDia, inicioDoDiaSeguinte } from './date-range';

export interface DashboardMetrics {
  totalRecebido: number;
  totalPendente: number;
  osAbertas: number;
  osEmAndamento: number;
  osConcluidas: number;
  osEntregues: number;
  osPendentesPagamento: number;
  osParcialmentePagas: number;
  osPagas: number;
  ticketMedio: number;
  topServicos: { id: string; nome: string; quantidade: number }[];
  topInsumos: { id: string; nome: string; quantidade: number }[];
}

export async function getDashboardMetrics(dataInicio: Date, dataFim: Date): Promise<DashboardMetrics> {
  // Intervalo semiaberto em dias locais: >= início do dia inicial e
  // < início do dia seguinte ao final, incluindo registros criados hoje.
  const inicio = inicioDoDia(dataInicio);
  const fimExclusivo = inicioDoDiaSeguinte(dataFim);

  // 1. Total Recebido no período (Soma de todos os pagamentos)
  const totalRecebidoAgg = await prisma.pagamento.aggregate({
    _sum: {
      valor: true,
    },
    where: {
      dataPagamento: {
        gte: inicio,
        lt: fimExclusivo,
      },
    },
  });
  const totalRecebido = Number(totalRecebidoAgg._sum.valor || 0);

  // 2. Total Pendente (Soma do saldo das OS que entraram no período e não estão canceladas)
  const totalPendenteAgg = await prisma.ordemServico.aggregate({
    _sum: {
      saldo: true,
    },
    where: {
      dataEntrada: {
        gte: inicio,
        lt: fimExclusivo,
      },
      status: {
        notIn: ['CANCELADA'],
      },
      saldo: {
        gt: 0,
      },
    },
  });
  const totalPendente = Number(totalPendenteAgg._sum.saldo || 0);

  // 3. Contagem de OS por Status (Apenas as que entraram no período)
  const osPorStatus = await prisma.ordemServico.groupBy({
    by: ['status'],
    _count: {
      id: true,
    },
    where: {
      dataEntrada: {
        gte: inicio,
        lt: fimExclusivo,
      },
    },
  });

  const osAbertas = osPorStatus.find(s => s.status === 'ABERTA')?._count.id || 0;
  const osEmAndamento = osPorStatus.find(s => s.status === 'EM_ANDAMENTO')?._count.id || 0;
  const osConcluidas = osPorStatus.find(s => s.status === 'CONCLUIDA')?._count.id || 0;
  const osEntregues = osPorStatus.find(s => s.status === 'ENTREGUE')?._count.id || 0;

  // 4. Status Financeiro das OS
  // Pagas: saldo = 0 e valorTotal > 0
  const osPagas = await prisma.ordemServico.count({
    where: {
      dataEntrada: { gte: inicio, lt: fimExclusivo },
      status: { notIn: ['CANCELADA'] },
      saldo: 0,
      valorTotal: { gt: 0 },
    },
  });

  // Pendentes de Pagamento: valorPago = 0 e valorTotal > 0
  const osPendentesPagamento = await prisma.ordemServico.count({
    where: {
      dataEntrada: { gte: inicio, lt: fimExclusivo },
      status: { notIn: ['CANCELADA'] },
      valorPago: 0,
      valorTotal: { gt: 0 },
    },
  });

  // Parcialmente Pagas: valorPago > 0 e saldo > 0
  const osParcialmentePagas = await prisma.ordemServico.count({
    where: {
      dataEntrada: { gte: inicio, lt: fimExclusivo },
      status: { notIn: ['CANCELADA'] },
      valorPago: { gt: 0 },
      saldo: { gt: 0 },
    },
  });

  // 5. Ticket Médio
  const ticketMedioAgg = await prisma.ordemServico.aggregate({
    _avg: {
      valorTotal: true,
    },
    where: {
      dataEntrada: { gte: inicio, lt: fimExclusivo },
      status: { notIn: ['CANCELADA'] },
      valorTotal: { gt: 0 },
    },
  });
  const ticketMedio = Number(ticketMedioAgg._avg.valorTotal || 0);

  // 6. Top 5 Serviços mais executados
  const topServicosAgg = await prisma.servicoItemOrdem.groupBy({
    by: ['servicoId'],
    _count: {
      servicoId: true,
    },
    where: {
      itemOrdemServico: {
        ordemServico: {
          dataEntrada: { gte: inicio, lt: fimExclusivo },
          status: { notIn: ['CANCELADA'] },
        }
      }
    },
    orderBy: {
      _count: {
        servicoId: 'desc',
      },
    },
    take: 5,
  });

  const servicosIds = topServicosAgg.map(s => s.servicoId);
  const servicos = await prisma.servico.findMany({
    where: { id: { in: servicosIds } },
    select: { id: true, nome: true },
  });

  // Otimização de performance: usa Map para busca O(1) em vez de array.find() O(N*M).
  // Reduz complexidade de O(N*M) para O(N+M).
  const servicosMap = new Map(servicos.map(s => [s.id, s]));

  const topServicos = topServicosAgg.map(agg => {
    const servico = servicosMap.get(agg.servicoId);
    return {
      id: agg.servicoId,
      nome: servico?.nome || 'Serviço Desconhecido',
      quantidade: agg._count.servicoId,
    };
  });

  // 7. Top 5 Insumos mais utilizados
  const topInsumosAgg = await prisma.insumoItemOrdem.groupBy({
    by: ['insumoId'],
    _sum: {
      quantidade: true,
    },
    where: {
      itemOrdemServico: {
        ordemServico: {
          dataEntrada: { gte: inicio, lt: fimExclusivo },
          status: { notIn: ['CANCELADA'] },
        }
      }
    },
    orderBy: {
      _sum: {
        quantidade: 'desc',
      },
    },
    take: 5,
  });

  const insumosIds = topInsumosAgg.map(i => i.insumoId);
  const insumos = await prisma.insumo.findMany({
    where: { id: { in: insumosIds } },
    select: { id: true, nome: true, unidadeMedida: true },
  });

  // Otimização de performance: usa Map para busca O(1) em vez de array.find() O(N*M).
  // Reduz complexidade de O(N*M) para O(N+M).
  const insumosMap = new Map(insumos.map(i => [i.id, i]));

  const topInsumos = topInsumosAgg.map(agg => {
    const insumo = insumosMap.get(agg.insumoId);
    return {
      id: agg.insumoId,
      nome: insumo ? `${insumo.nome} (${insumo.unidadeMedida})` : 'Insumo Desconhecido',
      quantidade: Number(agg._sum.quantidade || 0),
    };
  });

  return {
    totalRecebido,
    totalPendente,
    osAbertas,
    osEmAndamento,
    osConcluidas,
    osEntregues,
    osPendentesPagamento,
    osParcialmentePagas,
    osPagas,
    ticketMedio,
    topServicos,
    topInsumos,
  };
}
