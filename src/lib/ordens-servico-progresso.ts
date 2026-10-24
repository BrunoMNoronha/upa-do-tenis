/**
 * Apresentação do detalhe da OS: etapas de progresso, linha do tempo e
 * rótulos amigáveis. Módulo puro (sem Prisma); deriva tudo dos dados que o
 * detalhe já recebe, sem recalcular regras financeiras.
 */
import type { OsStatus } from "@/lib/ordens-servico-status";
import { rotuloStatusOperacional } from "@/lib/ordens-servico-status-apresentacao";

const ETAPAS: OsStatus[] = ["ABERTA", "EM_ANDAMENTO", "CONCLUIDA", "ENTREGUE"];

export type EstadoEtapa = "concluida" | "atual" | "pendente";

export type EtapaProgresso = {
  status: OsStatus;
  rotulo: string;
  estado: EstadoEtapa;
  /** ISO do momento em que a OS entrou na etapa; `null` quando ainda não entrou. */
  data: string | null;
};

type HistoricoParaProgresso = { id?: string; statusAnterior?: string | null; statusNovo: string; criadoEm: string };

type OrdemParaProgresso = {
  status: string;
  dataEntrada: string;
  historicosStatus: ReadonlyArray<HistoricoParaProgresso>;
};

/** Data mais antiga em que o histórico registra a entrada em `status`. */
function entradaNoStatus(historicos: ReadonlyArray<HistoricoParaProgresso>, status: string): string | null {
  const datas = historicos
    .filter((historico) => historico.statusNovo === status)
    .map((historico) => historico.criadoEm)
    .sort();
  return datas[0] ?? null;
}

/**
 * Quatro etapas do fluxo (Aberta → Em andamento → Concluída → Entregue).
 * A etapa "Aberta" usa a data de entrada; as demais, o histórico de status.
 * Numa OS cancelada, nenhuma etapa é "atual": as percorridas ficam concluídas.
 */
export function montarEtapasProgresso(ordem: OrdemParaProgresso): EtapaProgresso[] {
  const cancelada = ordem.status === "CANCELADA";
  const indiceAtual = ETAPAS.indexOf(ordem.status as OsStatus);

  return ETAPAS.map((status, indice) => {
    const data = indice === 0 ? ordem.dataEntrada : entradaNoStatus(ordem.historicosStatus, status);
    let estado: EstadoEtapa;
    if (cancelada) {
      estado = data ? "concluida" : "pendente";
    } else if (indice < indiceAtual) {
      estado = "concluida";
    } else if (indice === indiceAtual) {
      // Etapa final alcançada conta como concluída.
      estado = status === "ENTREGUE" ? "concluida" : "atual";
    } else {
      estado = "pendente";
    }
    return { status, rotulo: rotuloStatusOperacional(status), estado, data: estado === "pendente" ? null : data };
  });
}

export type TipoEventoLinhaDoTempo = "criacao" | "status" | "pagamento" | "estorno";

export type EventoLinhaDoTempo = {
  id: string;
  tipo: TipoEventoLinhaDoTempo;
  titulo: string;
  detalhe: string | null;
  data: string;
};

type OrdemParaLinhaDoTempo = {
  dataEntrada: string;
  historicosStatus: ReadonlyArray<{
    id: string;
    statusAnterior?: string | null;
    statusNovo: string;
    observacao?: string | null;
    criadoEm: string;
  }>;
  pagamentos: ReadonlyArray<{
    id: string;
    tipo: string;
    valor: number;
    dataPagamento: string;
    observacoes?: string | null;
    formaPagamento?: { nome: string } | null;
    estorno?: { id: string; valor?: number; motivo: string; dataEstorno: string; usuario?: { nome: string } | null } | null;
  }>;
};

const moeda = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

/**
 * Linha do tempo única, do mais recente para o mais antigo: criação da OS,
 * transições de status, pagamentos e estornos. Sem histórico de abertura,
 * a criação usa a data de entrada.
 */
export function montarLinhaDoTempo(ordem: OrdemParaLinhaDoTempo): EventoLinhaDoTempo[] {
  const eventos: EventoLinhaDoTempo[] = [];
  const criacaoNoHistorico = ordem.historicosStatus.some((historico) => !historico.statusAnterior);

  for (const historico of ordem.historicosStatus) {
    const criacao = !historico.statusAnterior;
    eventos.push({
      id: `status-${historico.id}`,
      tipo: criacao ? "criacao" : "status",
      titulo: criacao
        ? `OS criada · ${rotuloStatusOperacional(historico.statusNovo)}`
        : `${rotuloStatusOperacional(historico.statusAnterior as string)} → ${rotuloStatusOperacional(historico.statusNovo)}`,
      detalhe: historico.observacao || null,
      data: historico.criadoEm,
    });
  }

  if (!criacaoNoHistorico) {
    eventos.push({ id: "criacao", tipo: "criacao", titulo: "OS criada · Aberta", detalhe: null, data: ordem.dataEntrada });
  }

  for (const pagamento of ordem.pagamentos) {
    const forma = pagamento.formaPagamento?.nome;
    eventos.push({
      id: `pagamento-${pagamento.id}`,
      tipo: "pagamento",
      titulo: `${rotuloTipoPagamento(pagamento.tipo)} recebido · ${moeda.format(Number(pagamento.valor || 0))}${forma ? ` (${forma})` : ""}`,
      detalhe: pagamento.observacoes || null,
      data: pagamento.dataPagamento,
    });
    if (pagamento.estorno) {
      const valor = pagamento.estorno.valor ?? pagamento.valor;
      const autor = pagamento.estorno.usuario?.nome;
      eventos.push({
        id: `estorno-${pagamento.estorno.id}`,
        tipo: "estorno",
        titulo: `Pagamento estornado · ${moeda.format(Number(valor || 0))}`,
        detalhe: autor ? `${pagamento.estorno.motivo} · por ${autor}` : pagamento.estorno.motivo,
        data: pagamento.estorno.dataEstorno,
      });
    }
  }

  return eventos.sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime());
}

function tituloCase(valor: string) {
  return valor
    .toLowerCase()
    .split("_")
    .filter(Boolean)
    .map((parte, indice) => (indice === 0 ? `${parte.charAt(0).toUpperCase()}${parte.slice(1)}` : parte))
    .join(" ");
}

const ROTULOS_TIPO_ITEM: Record<string, string> = {
  CALCADO: "Calçado",
  TENIS: "Tênis",
  BOLSA: "Bolsa",
  MOCHILA: "Mochila",
  CINTO: "Cinto",
  OUTRO: "Outro",
};

/** Rótulo amigável do tipo de item ("CALCADO" → "Calçado"). */
export function rotuloTipoItem(tipo: string | null | undefined): string {
  if (!tipo) return "Item";
  return ROTULOS_TIPO_ITEM[tipo.toUpperCase()] ?? tituloCase(tipo);
}

const ROTULOS_TIPO_PAGAMENTO: Record<string, string> = {
  PAGAMENTO: "Pagamento",
  SINAL: "Sinal",
};

/** Rótulo amigável do tipo de pagamento ("PAGAMENTO" → "Pagamento"). */
export function rotuloTipoPagamento(tipo: string | null | undefined): string {
  if (!tipo) return "Pagamento";
  return ROTULOS_TIPO_PAGAMENTO[tipo.toUpperCase()] ?? tituloCase(tipo);
}

/** Soma do custo dos insumos aplicados, arredondada para centavos (exibição). */
export function somarCustoInsumos(insumos: ReadonlyArray<{ custoTotalAplicado: number | string }>): number {
  const total = insumos.reduce((soma, insumo) => soma + Number(insumo.custoTotalAplicado || 0), 0);
  return Math.round(total * 100) / 100;
}
