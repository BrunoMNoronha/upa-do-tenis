import { arredondarMoeda } from "./ordens-servico-financeiro";

/**
 * Regras puras dos itens recebidos de uma OS (issue #205).
 *
 * Uma OS pode representar vários objetos do mesmo cliente, cada um com a sua
 * própria lista de serviços. Estas funções não tocam banco nem UI: são
 * compartilhadas pela API de criação, pelo formulário e pela listagem.
 */

export const LIMITE_ITENS_POR_OS = 10;
export const TIPO_ITEM_PADRAO = "CALCADO";

export type ServicoDoItem = { servicoId: string; valor: number };

export type ItemOrdemServicoNormalizado = {
  clientKey: string;
  tipoItem: string;
  descricao: string;
  observacoes?: string;
  servicos: ServicoDoItem[];
  /**
   * Valor informado manualmente quando o item não possui serviços. Só existe
   * no contrato antigo (campo `valorEstimado` da OS inteira); no contrato
   * novo o subtotal é sempre derivado dos serviços.
   */
  valorSemServicos?: number;
};

type EntradaItem = {
  clientKey?: string;
  tipoItem?: string;
  descricao: string;
  observacoes?: string;
  servicos?: ServicoDoItem[];
};

type EntradaFormulario = {
  itens?: EntradaItem[];
  itemRecebido?: string;
  servicoId?: string;
  servicos?: ServicoDoItem[];
  valorEstimado?: number;
};

/**
 * Converte o payload de criação em uma lista de itens, aceitando tanto o
 * contrato novo (`itens[]`) quanto o antigo (`itemRecebido` + `servicos`),
 * que continua chegando de navegadores com o JavaScript anterior em cache.
 */
export function normalizarItensOrdemServico(data: EntradaFormulario): ItemOrdemServicoNormalizado[] {
  if (data.itens && data.itens.length > 0) {
    return data.itens.map((item, indice) => ({
      clientKey: item.clientKey?.trim() || `item-${indice + 1}`,
      tipoItem: item.tipoItem?.trim() || TIPO_ITEM_PADRAO,
      descricao: item.descricao.trim(),
      observacoes: item.observacoes?.trim() || undefined,
      servicos: item.servicos ?? [],
    }));
  }

  const descricao = data.itemRecebido?.trim() ?? "";
  if (!descricao) return [];

  const servicosLista = data.servicos ?? [];
  const servicosInformados = servicosLista.length > 0
    ? servicosLista
    : data.servicoId
      ? [{ servicoId: data.servicoId, valor: data.valorEstimado ?? 0 }]
      : [];

  return [{
    clientKey: "item-1",
    tipoItem: TIPO_ITEM_PADRAO,
    descricao,
    servicos: servicosInformados,
    valorSemServicos: servicosInformados.length === 0 ? data.valorEstimado ?? 0 : undefined,
  }];
}

/** Subtotal do item: soma dos serviços, ou o valor manual do contrato antigo. */
export function calcularSubtotalItem(item: Pick<ItemOrdemServicoNormalizado, "servicos" | "valorSemServicos">): number {
  if (item.servicos.length === 0) {
    return arredondarMoeda(item.valorSemServicos ?? 0);
  }
  return arredondarMoeda(item.servicos.reduce((total, servico) => total + Number(servico.valor || 0), 0));
}

/** Total da OS: soma dos subtotais de todos os itens. */
export function calcularTotalItens(itens: Array<Pick<ItemOrdemServicoNormalizado, "servicos" | "valorSemServicos">>): number {
  return arredondarMoeda(itens.reduce((total, item) => total + calcularSubtotalItem(item), 0));
}

/**
 * Devolve o índice do primeiro item que repete um serviço, ou -1. O mesmo
 * serviço é permitido em itens diferentes (dois pares com a mesma limpeza),
 * mas não duas vezes no mesmo item.
 */
export function encontrarItemComServicoRepetido(itens: Array<{ servicos: ServicoDoItem[] }>): number {
  return itens.findIndex((item) => {
    const ids = item.servicos.map((servico) => servico.servicoId);
    return new Set(ids).size !== ids.length;
  });
}

/** IDs distintos de serviços usados em qualquer item, para uma única consulta. */
export function listarServicoIdsDosItens(itens: Array<{ servicos: ServicoDoItem[] }>): string[] {
  return Array.from(new Set(itens.flatMap((item) => item.servicos.map((servico) => servico.servicoId))));
}

type ItemResumivel = {
  descricao?: string | null;
  servicos?: Array<{ servico?: { nome?: string | null } | null }> | null;
};

export type ResumoItensOrdem = {
  /** Ex.: "Tênis preto" ou "3 itens: Tênis preto, Bota marrom +1". */
  itens: string;
  /** Serviços distintos de todos os itens, ou "Geral" quando não há nenhum. */
  servicos: string;
  quantidade: number;
};

const MAXIMO_DESCRICOES_NO_RESUMO = 2;

/** Resumo dos itens para o card da listagem, sem depender de `itens[0]`. */
export function resumirItensOrdem(itens: ItemResumivel[] | null | undefined): ResumoItensOrdem {
  const lista = itens ?? [];
  const descricoes = lista
    .map((item) => item.descricao?.trim())
    .filter((descricao): descricao is string => Boolean(descricao));
  const servicos = Array.from(new Set(
    lista
      .flatMap((item) => (item.servicos ?? []).map((vinculo) => vinculo.servico?.nome?.trim()))
      .filter((nome): nome is string => Boolean(nome)),
  ));

  let resumoItens: string;
  if (descricoes.length === 0) {
    resumoItens = "Nenhum";
  } else if (descricoes.length === 1) {
    resumoItens = descricoes[0];
  } else {
    const visiveis = descricoes.slice(0, MAXIMO_DESCRICOES_NO_RESUMO).join(", ");
    const restantes = descricoes.length - MAXIMO_DESCRICOES_NO_RESUMO;
    resumoItens = `${descricoes.length} itens: ${visiveis}${restantes > 0 ? ` +${restantes}` : ""}`;
  }

  return {
    itens: resumoItens,
    servicos: servicos.length > 0 ? servicos.join(", ") : "Geral",
    quantidade: lista.length,
  };
}
