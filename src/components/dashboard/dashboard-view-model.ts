import type { DashboardMetrics } from "@/lib/dashboard-service";

/**
 * View model do Dashboard: derivações puras a partir de `DashboardMetrics`,
 * concentrando somas, percentuais e proteções contra divisão por zero fora
 * do JSX. Não altera nem recalcula regras financeiras: apenas agrega o que
 * a API já devolve.
 */

export type StatusOperacionalId = "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA" | "ENTREGUE";
export type StatusFinanceiroId = "PAGAS" | "PARCIAIS" | "PENDENTES";

export type ItemFila = {
  id: StatusOperacionalId;
  rotulo: string;
  descricao: string;
  quantidade: number;
  /** Percentual inteiro (0-100) sobre o total de OS ativas. */
  percentual: number;
  href: string;
};

export type ItemSituacaoFinanceira = {
  id: StatusFinanceiroId;
  rotulo: string;
  quantidade: number;
  /** Percentual inteiro (0-100) sobre o total de OS com situação financeira. */
  percentual: number;
  href: string;
};

export type ItemRanking = {
  id: string;
  nome: string;
  quantidade: number;
  /** Largura relativa da barra (0-100), normalizada pelo maior item. */
  proporcao: number;
};

export type ItemRecebimentoDia = {
  /** "YYYY-MM-DD" no fuso da operação. */
  dia: string;
  /** "16/09" */
  rotuloCurto: string;
  /** "qua., 16/09" (dia da semana calculado sobre o calendário, sem fuso). */
  rotuloCompleto: string;
  /** Recebido líquido do dia; negativo num dia em que os estornos superam os pagamentos (#230). */
  valor: number;
  /**
   * Altura da barra (0-100) em relação à altura do gráfico. Sem dia negativo,
   * normalizada pelo maior dia; com dia negativo, pela soma do maior positivo e
   * do maior negativo, para que as duas áreas usem a mesma escala.
   */
  proporcao: number;
};

export type RecebimentosPorDiaViewModel =
  | { disponivel: false }
  | {
      disponivel: true;
      dias: ItemRecebimentoDia[];
      /** Maior recebimento diário, ou null quando nenhum dia teve valor. */
      melhorDia: ItemRecebimentoDia | null;
      diasComRecebimento: number;
      /**
       * Altura (0-100) da área acima do eixo. 100 quando não há dia negativo;
       * abaixo disso, a área restante recebe as barras negativas.
       */
      alturaAreaPositiva: number;
    };

export type DashboardViewModel = {
  totalRecebido: number;
  totalPendente: number;
  ticketMedio: number;
  /** Soma de abertas, em andamento, concluídas e entregues (canceladas não incluídas). */
  totalOrdensAtivas: number;
  fila: ItemFila[];
  /** Total de OS com situação financeira apurada (pagas + parciais + pendentes). */
  totalOrdensFinanceiras: number;
  percentualPagas: number;
  /** OS que ainda têm saldo a receber: parcialmente pagas + sem pagamento. */
  ordensComSaldo: number;
  situacaoFinanceira: ItemSituacaoFinanceira[];
  servicos: ItemRanking[];
  insumos: ItemRanking[];
  /** Série diária; indisponível quando a API devolve null (período acima do limite). */
  recebimentosPorDia: RecebimentosPorDiaViewModel;
  /** true quando nenhuma métrica do período tem valor. */
  vazio: boolean;
};

export function percentualInteiro(parte: number, total: number): number {
  if (!Number.isFinite(parte) || !Number.isFinite(total) || total <= 0) return 0;
  return Math.round((parte / total) * 100);
}

function normalizarRanking(itens: DashboardMetrics["topServicos"]): ItemRanking[] {
  const ordenados = [...itens].sort((a, b) => b.quantidade - a.quantidade);
  const maior = ordenados[0]?.quantidade ?? 0;

  return ordenados.map((item) => ({
    id: item.id,
    nome: item.nome,
    quantidade: item.quantidade,
    proporcao: percentualInteiro(item.quantidade, maior),
  }));
}

const formatadorDiaDaSemana = new Intl.DateTimeFormat("pt-BR", { weekday: "short", timeZone: "UTC" });

/** Altura mínima (0-100) de uma barra visível, reservada nos dois lados do eixo. */
export const ALTURA_MINIMA_BARRA = 2;

/**
 * Posição do eixo (0-100). Com os dois sinais, cada lado reserva ao menos a
 * altura mínima de uma barra, para que um valor pequeno de um lado não
 * arredonde a área para 0 e empurre a barra para fora do gráfico.
 */
function calcularAlturaAreaPositiva(maior: number, maiorNegativo: number): number {
  if (maiorNegativo <= 0) return 100;
  if (maior <= 0) return 0;
  const altura = percentualInteiro(maior, maior + maiorNegativo);
  return Math.min(Math.max(altura, ALTURA_MINIMA_BARRA), 100 - ALTURA_MINIMA_BARRA);
}

function montarRecebimentosPorDia(serie: DashboardMetrics["recebimentosPorDia"]): RecebimentosPorDiaViewModel {
  // Respostas sem o campo (API anterior) são tratadas como indisponíveis.
  if (!Array.isArray(serie)) return { disponivel: false };

  const maior = serie.reduce((acc, item) => Math.max(acc, item.valor), 0);
  const maiorNegativo = serie.reduce((acc, item) => Math.max(acc, -item.valor), 0);
  const escala = maior + maiorNegativo;
  let melhorDia: ItemRecebimentoDia | null = null;

  const dias = serie.map((item) => {
    const [ano, mes, dia] = item.dia.split("-");
    const diaDaSemana = formatadorDiaDaSemana.format(new Date(Date.UTC(Number(ano), Number(mes) - 1, Number(dia))));
    const itemVm: ItemRecebimentoDia = {
      dia: item.dia,
      rotuloCurto: `${dia}/${mes}`,
      rotuloCompleto: `${diaDaSemana}, ${dia}/${mes}`,
      valor: item.valor,
      proporcao: percentualInteiro(Math.abs(item.valor), escala),
    };
    if (item.valor > 0 && (melhorDia === null || item.valor > melhorDia.valor)) melhorDia = itemVm;
    return itemVm;
  });

  return {
    disponivel: true,
    dias,
    melhorDia,
    diasComRecebimento: dias.filter((item) => item.valor > 0).length,
    alturaAreaPositiva: calcularAlturaAreaPositiva(maior, maiorNegativo),
  };
}

export function montarDashboardViewModel(metrics: DashboardMetrics): DashboardViewModel {
  const totalOrdensAtivas = metrics.osAbertas + metrics.osEmAndamento + metrics.osConcluidas + metrics.osEntregues;

  const fila: ItemFila[] = [
    {
      id: "ABERTA",
      rotulo: "Abertas",
      descricao: "Aguardando análise",
      quantidade: metrics.osAbertas,
      percentual: percentualInteiro(metrics.osAbertas, totalOrdensAtivas),
      href: "/ordens-servico?statusOp=ABERTA",
    },
    {
      id: "EM_ANDAMENTO",
      rotulo: "Em andamento",
      descricao: "Em execução na oficina",
      quantidade: metrics.osEmAndamento,
      percentual: percentualInteiro(metrics.osEmAndamento, totalOrdensAtivas),
      href: "/ordens-servico?statusOp=EM_ANDAMENTO",
    },
    {
      id: "CONCLUIDA",
      rotulo: "Concluídas",
      descricao: "Prontas para entrega",
      quantidade: metrics.osConcluidas,
      percentual: percentualInteiro(metrics.osConcluidas, totalOrdensAtivas),
      href: "/ordens-servico?statusOp=CONCLUIDA",
    },
    {
      id: "ENTREGUE",
      rotulo: "Entregues",
      descricao: "Finalizadas com o cliente",
      quantidade: metrics.osEntregues,
      percentual: percentualInteiro(metrics.osEntregues, totalOrdensAtivas),
      href: "/ordens-servico?statusOp=ENTREGUE",
    },
  ];

  const totalOrdensFinanceiras = metrics.osPagas + metrics.osParcialmentePagas + metrics.osPendentesPagamento;

  const situacaoFinanceira: ItemSituacaoFinanceira[] = [
    {
      id: "PAGAS",
      rotulo: "Pagas",
      quantidade: metrics.osPagas,
      percentual: percentualInteiro(metrics.osPagas, totalOrdensFinanceiras),
      href: "/ordens-servico?statusFin=PAGAS",
    },
    {
      id: "PARCIAIS",
      rotulo: "Parcialmente pagas",
      quantidade: metrics.osParcialmentePagas,
      percentual: percentualInteiro(metrics.osParcialmentePagas, totalOrdensFinanceiras),
      href: "/ordens-servico?statusFin=PARCIAIS",
    },
    {
      id: "PENDENTES",
      rotulo: "Sem pagamento",
      quantidade: metrics.osPendentesPagamento,
      percentual: percentualInteiro(metrics.osPendentesPagamento, totalOrdensFinanceiras),
      href: "/ordens-servico?statusFin=PENDENTES",
    },
  ];

  const servicos = normalizarRanking(metrics.topServicos);
  const insumos = normalizarRanking(metrics.topInsumos);

  const vazio =
    metrics.totalRecebido === 0 &&
    metrics.totalPendente === 0 &&
    metrics.ticketMedio === 0 &&
    totalOrdensAtivas === 0 &&
    totalOrdensFinanceiras === 0 &&
    servicos.length === 0 &&
    insumos.length === 0;

  return {
    totalRecebido: metrics.totalRecebido,
    totalPendente: metrics.totalPendente,
    ticketMedio: metrics.ticketMedio,
    totalOrdensAtivas,
    fila,
    totalOrdensFinanceiras,
    percentualPagas: percentualInteiro(metrics.osPagas, totalOrdensFinanceiras),
    ordensComSaldo: metrics.osParcialmentePagas + metrics.osPendentesPagamento,
    situacaoFinanceira,
    servicos,
    insumos,
    recebimentosPorDia: montarRecebimentosPorDia(metrics.recebimentosPorDia),
    vazio,
  };
}
