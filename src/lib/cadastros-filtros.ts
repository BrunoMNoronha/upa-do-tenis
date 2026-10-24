import { dataOperacional, intervaloDoDiaOperacional } from "@/lib/date-range";

type SearchParams = URLSearchParams | Record<string, string | string[] | undefined>;

function lerParametro(searchParams: SearchParams, chave: string): string | null {
  if (searchParams instanceof URLSearchParams) {
    return searchParams.get(chave);
  }
  const valor = searchParams[chave];
  return typeof valor === "string" ? valor : null;
}

export type FiltroStatusCadastro = "ativos" | "inativos";

/** Lê `?status=ativos|inativos` dos chips das telas de cadastro. */
export function lerFiltroStatus(searchParams: SearchParams): FiltroStatusCadastro | undefined {
  const valor = lerParametro(searchParams, "status");
  return valor === "ativos" || valor === "inativos" ? valor : undefined;
}

/** Converte o chip de status no valor do campo `ativo` da consulta. */
export function statusParaAtivo(status: FiltroStatusCadastro | undefined): boolean | undefined {
  if (status === "ativos") return true;
  if (status === "inativos") return false;
  return undefined;
}

export type FiltroEstoqueProdutos = "sem";

/** Lê `?estoque=sem` da tela de Produtos. */
export function lerFiltroEstoqueProdutos(searchParams: SearchParams): FiltroEstoqueProdutos | undefined {
  return lerParametro(searchParams, "estoque") === "sem" ? "sem" : undefined;
}

export type FiltroEstoqueInsumos = "baixo" | "zerado";

/**
 * Lê `?estoque=baixo|zerado` da tela de Insumos. Os parâmetros legados
 * `?alerta=true` e `?estoqueBaixo=true` (links do dashboard e dos relatórios)
 * continuam valendo como "baixo".
 */
export function lerFiltroEstoqueInsumos(searchParams: SearchParams): FiltroEstoqueInsumos | undefined {
  const valor = lerParametro(searchParams, "estoque");
  if (valor === "baixo" || valor === "zerado") return valor;
  if (lerParametro(searchParams, "alerta") === "true" || lerParametro(searchParams, "estoqueBaixo") === "true") {
    return "baixo";
  }
  return undefined;
}

/** Meia-noite do dia 1 do mês corrente no fuso da operação. */
export function inicioDoMesOperacional(agora: Date = new Date()): Date {
  const primeiroDia = `${dataOperacional(agora).slice(0, 7)}-01`;
  return intervaloDoDiaOperacional(primeiroDia).inicio;
}
