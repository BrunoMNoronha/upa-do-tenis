import { prisma } from "@/lib/prisma";
import { obterResumoCaixaAberto } from "@/lib/caixa";
import { obterDadosEmpresa } from "@/lib/configuracoes";
import { getDashboardMetrics, type DashboardMetrics } from "@/lib/dashboard-service";
import { dataOperacional, intervaloDoDiaOperacional } from "@/lib/date-range";
import { arredondarMoeda, normalizarDecimalParaNumero } from "@/lib/ordens-servico-financeiro";
import { getEstatisticasGlobaisEstoque, getListaInsumosCriticos } from "@/lib/relatorio-estoque-service";
import { contarDiasPeriodo } from "@/lib/insights-schema";

/**
 * Monta o retrato agregado do negócio enviado à IA. Somente leitura: reutiliza
 * os cálculos homologados do dashboard e do relatório de estoque e acrescenta
 * contagens/somas simples. Não envia IDs nem dados pessoais de clientes.
 */

const LIMITE_INSUMOS_CRITICOS = 10;
const STATUS_OS_FINALIZADAS = ["CONCLUIDA", "ENTREGUE", "CANCELADA"];

export interface IndicadoresPeriodo {
  recebidoLiquido: number;
  saldoPendenteOsDoPeriodo: number;
  ticketMedioOs: number;
  osPorStatus: { abertas: number; emAndamento: number; concluidas: number; entregues: number };
  osPorSituacaoPagamento: { pagas: number; parciais: number; semPagamento: number };
  servicosMaisExecutados: { nome: string; quantidade: number }[];
  insumosMaisUtilizados: { nome: string; quantidade: number }[];
  atendimentosRapidos: { quantidade: number; valorTotal: number };
  vendasBalcao: { quantidade: number; valorTotal: number };
  recebimentosPorFormaPagamento: { forma: string; valor: number }[];
  novosClientes: number;
}

export interface PayloadInsights {
  contexto: { empresa: string; segmento: string; moeda: "BRL"; dataReferencia: string };
  periodo: { inicio: string; fim: string; dias: number };
  periodoAnterior: { inicio: string; fim: string };
  atual: IndicadoresPeriodo;
  anterior: IndicadoresPeriodo;
  recebimentosPorDia: { dia: string; valor: number }[] | null;
  situacaoAtual: {
    osAtrasadas: { quantidade: number; saldoEmAberto: number };
    osAguardandoRetirada: number;
    caixaAberto: { aberto: boolean; abertoDesde: string | null };
    estoqueInsumos: {
      ativos: number;
      zerados: number;
      abaixoDoMinimo: number;
      valorEstimado: number;
      criticos: { nome: string; quantidade: number; minimo: number; unidade: string; situacao: string }[];
    };
    produtosSemEstoque: number;
  };
}

function deslocarDia(dia: string, dias: number): string {
  const [ano, mes, d] = dia.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, d + dias));
  return data.toISOString().slice(0, 10);
}

/** Período imediatamente anterior, com a mesma quantidade de dias. */
export function calcularPeriodoAnterior(inicio: string, fim: string): { inicio: string; fim: string } {
  const dias = contarDiasPeriodo(inicio, fim);
  const fimAnterior = deslocarDia(inicio, -1);
  return { inicio: deslocarDia(fimAnterior, -(dias - 1)), fim: fimAnterior };
}

async function lerIndicadoresComplementares(inicioDia: string, fimDia: string) {
  const { inicio } = intervaloDoDiaOperacional(inicioDia);
  const { fimExclusivo } = intervaloDoDiaOperacional(fimDia);
  const periodo = { gte: inicio, lt: fimExclusivo };

  const [atendimentos, vendas, recebimentosPorForma, novosClientes] = await Promise.all([
    // Atendimento estornado não conta: o estorno é sempre total (mesma regra do dashboard).
    prisma.atendimentoRapido.aggregate({
      _count: { id: true },
      _sum: { valorTotal: true },
      where: { dataHora: periodo, pagamentos: { none: { estorno: { isNot: null } } } },
    }),
    prisma.venda.aggregate({
      _count: { id: true },
      _sum: { valorTotal: true },
      where: { dataVenda: periodo, status: { not: "CANCELADA" } },
    }),
    prisma.pagamento.groupBy({
      by: ["formaPagamentoId"],
      _sum: { valor: true },
      where: { dataPagamento: periodo, estorno: { is: null } },
    }),
    prisma.cliente.count({ where: { criadoEm: periodo } }),
  ]);

  return { atendimentos, vendas, recebimentosPorForma, novosClientes };
}

type Complementares = Awaited<ReturnType<typeof lerIndicadoresComplementares>>;

export function montarIndicadoresPeriodo(
  metricas: DashboardMetrics,
  complementares: Complementares,
  nomesFormas: Map<string, string>,
): IndicadoresPeriodo {
  return {
    recebidoLiquido: arredondarMoeda(metricas.totalRecebido),
    saldoPendenteOsDoPeriodo: arredondarMoeda(metricas.totalPendente),
    ticketMedioOs: arredondarMoeda(metricas.ticketMedio),
    osPorStatus: {
      abertas: metricas.osAbertas,
      emAndamento: metricas.osEmAndamento,
      concluidas: metricas.osConcluidas,
      entregues: metricas.osEntregues,
    },
    osPorSituacaoPagamento: {
      pagas: metricas.osPagas,
      parciais: metricas.osParcialmentePagas,
      semPagamento: metricas.osPendentesPagamento,
    },
    servicosMaisExecutados: metricas.topServicos.map(({ nome, quantidade }) => ({ nome, quantidade })),
    insumosMaisUtilizados: metricas.topInsumos.map(({ nome, quantidade }) => ({ nome, quantidade })),
    atendimentosRapidos: {
      quantidade: complementares.atendimentos._count.id,
      valorTotal: arredondarMoeda(normalizarDecimalParaNumero(complementares.atendimentos._sum.valorTotal)),
    },
    vendasBalcao: {
      quantidade: complementares.vendas._count.id,
      valorTotal: arredondarMoeda(normalizarDecimalParaNumero(complementares.vendas._sum.valorTotal)),
    },
    recebimentosPorFormaPagamento: complementares.recebimentosPorForma
      .map((grupo) => ({
        forma: nomesFormas.get(grupo.formaPagamentoId) ?? "Outra",
        valor: arredondarMoeda(normalizarDecimalParaNumero(grupo._sum.valor)),
      }))
      .filter((item) => item.valor !== 0)
      .sort((a, b) => b.valor - a.valor),
    novosClientes: complementares.novosClientes,
  };
}

export async function lerSituacaoAtual(agora: Date = new Date()): Promise<PayloadInsights["situacaoAtual"]> {
  const [atrasadas, aguardandoRetirada, caixa, estatisticas, criticos, produtosSemEstoque] = await Promise.all([
    prisma.ordemServico.aggregate({
      _count: { id: true },
      _sum: { saldo: true },
      where: { dataPrevisao: { lt: agora }, status: { notIn: STATUS_OS_FINALIZADAS } },
    }),
    prisma.ordemServico.count({ where: { status: "CONCLUIDA" } }),
    obterResumoCaixaAberto(),
    getEstatisticasGlobaisEstoque(),
    getListaInsumosCriticos(),
    prisma.produto.count({ where: { ativo: true, quantidadeEstoque: { lte: 0 } } }),
  ]);

  return {
    osAtrasadas: {
      quantidade: atrasadas._count.id,
      saldoEmAberto: arredondarMoeda(normalizarDecimalParaNumero(atrasadas._sum.saldo)),
    },
    osAguardandoRetirada: aguardandoRetirada,
    caixaAberto: {
      aberto: caixa !== null,
      abertoDesde: caixa ? dataOperacional(caixa.dataAbertura) : null,
    },
    estoqueInsumos: {
      ativos: estatisticas.totalInsumosAtivos,
      zerados: estatisticas.totalInsumosZerados,
      abaixoDoMinimo: estatisticas.totalInsumosAbaixoMinimo,
      valorEstimado: arredondarMoeda(estatisticas.valorTotalEstimado),
      criticos: criticos.slice(0, LIMITE_INSUMOS_CRITICOS).map((insumo) => ({
        nome: insumo.nome,
        quantidade: insumo.quantidadeEstoque,
        minimo: insumo.estoqueMinimo,
        unidade: insumo.unidadeMedida,
        situacao: insumo.status,
      })),
    },
    produtosSemEstoque,
  };
}

/** Indicadores e série diária de um período avulso (usado pelas ferramentas do Assistente). */
export async function lerIndicadoresPeriodo(
  inicio: string,
  fim: string,
): Promise<{ indicadores: IndicadoresPeriodo; recebimentosPorDia: PayloadInsights["recebimentosPorDia"] }> {
  const [metricas, complementares, formas] = await Promise.all([
    getDashboardMetrics(inicio, fim),
    lerIndicadoresComplementares(inicio, fim),
    prisma.formaPagamento.findMany({ select: { id: true, nome: true } }),
  ]);

  return {
    indicadores: montarIndicadoresPeriodo(
      metricas,
      complementares,
      new Map(formas.map((forma) => [forma.id, forma.nome])),
    ),
    recebimentosPorDia: metricas.recebimentosPorDia?.map(({ dia, valor }) => ({ dia, valor })) ?? null,
  };
}

export async function montarPayloadInsights(
  periodo: { inicio: string; fim: string },
  agora: Date = new Date(),
): Promise<PayloadInsights> {
  const anterior = calcularPeriodoAnterior(periodo.inicio, periodo.fim);

  const [empresa, metricasAtual, metricasAnterior, compAtual, compAnterior, formas, situacaoAtual] =
    await Promise.all([
      obterDadosEmpresa(),
      getDashboardMetrics(periodo.inicio, periodo.fim),
      getDashboardMetrics(anterior.inicio, anterior.fim),
      lerIndicadoresComplementares(periodo.inicio, periodo.fim),
      lerIndicadoresComplementares(anterior.inicio, anterior.fim),
      prisma.formaPagamento.findMany({ select: { id: true, nome: true } }),
      lerSituacaoAtual(agora),
    ]);

  const nomesFormas = new Map(formas.map((forma) => [forma.id, forma.nome]));

  return {
    contexto: {
      empresa: empresa.nomeFantasia,
      segmento: "Sapataria: conserto, reforma e cuidados com calçados",
      moeda: "BRL",
      dataReferencia: dataOperacional(agora),
    },
    periodo: { ...periodo, dias: contarDiasPeriodo(periodo.inicio, periodo.fim) },
    periodoAnterior: anterior,
    atual: montarIndicadoresPeriodo(metricasAtual, compAtual, nomesFormas),
    anterior: montarIndicadoresPeriodo(metricasAnterior, compAnterior, nomesFormas),
    recebimentosPorDia: metricasAtual.recebimentosPorDia?.map(({ dia, valor }) => ({ dia, valor })) ?? null,
    situacaoAtual,
  };
}
