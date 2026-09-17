/**
 * Código operacional do Atendimento Rápido: AR-DDMMAAAA-NNNN.
 *
 * - DDMMAAAA é o dia do registro no fuso da operação (`FUSO_OPERACIONAL`,
 *   America/Sao_Paulo), o mesmo usado pela numeração da Venda de balcão e
 *   pelos filtros de período; nunca o dia UTC do servidor.
 * - NNNN é sequencial por dia, começando em 0001.
 *
 * A concorrência é resolvida no banco (ver `registrarAtendimentoRapido`):
 * advisory lock transacional por dia + UNIQUE em `codigo`. Este módulo só
 * compõe e interpreta o código.
 */

import { formatarDataEntradaParaNumeroOS } from "@/lib/ordens-servico-numero";

export const PREFIXO_ATENDIMENTO_RAPIDO = "AR";

export const SEQUENCIAL_MAXIMO_POR_DIA = 9999;

/**
 * Primeira chave do `pg_advisory_xact_lock(int, int)`: separa os locks do
 * Atendimento Rápido de qualquer outro uso de advisory lock no banco.
 */
export const NAMESPACE_LOCK_ATENDIMENTO_RAPIDO = 4152;

const FORMATO_CODIGO = /^AR-(\d{8})-(\d{4})$/;

export class SequencialAtendimentoRapidoEsgotadoError extends Error {
  constructor() {
    super(`Limite de ${SEQUENCIAL_MAXIMO_POR_DIA} atendimentos rápidos por dia atingido.`);
    this.name = "SequencialAtendimentoRapidoEsgotadoError";
  }
}

/** "2026-09-17" → "AR-17092026-" */
export function prefixoCodigoDoDia(dia: string): string {
  return `${PREFIXO_ATENDIMENTO_RAPIDO}-${formatarDataEntradaParaNumeroOS(dia)}-`;
}

/** ("2026-09-17", 1) → "AR-17092026-0001" */
export function formatarCodigoAtendimentoRapido(dia: string, sequencial: number): string {
  if (!Number.isInteger(sequencial) || sequencial < 1) {
    throw new Error("Sequencial do atendimento rápido inválido.");
  }
  if (sequencial > SEQUENCIAL_MAXIMO_POR_DIA) {
    throw new SequencialAtendimentoRapidoEsgotadoError();
  }
  return `${prefixoCodigoDoDia(dia)}${String(sequencial).padStart(4, "0")}`;
}

/**
 * Próximo código do dia a partir do maior código já gravado nesse dia
 * (`null` quando é o primeiro). O maior código é o último em ordem textual,
 * já que o sufixo tem largura fixa.
 */
export function proximoCodigoDoDia(dia: string, maiorCodigoDoDia: string | null): string {
  if (maiorCodigoDoDia === null) {
    return formatarCodigoAtendimentoRapido(dia, 1);
  }

  const partes = FORMATO_CODIGO.exec(maiorCodigoDoDia);
  if (!partes || !maiorCodigoDoDia.startsWith(prefixoCodigoDoDia(dia))) {
    throw new Error(`Código de atendimento rápido inesperado para o dia ${dia}: ${maiorCodigoDoDia}.`);
  }

  return formatarCodigoAtendimentoRapido(dia, Number.parseInt(partes[2], 10) + 1);
}

/** Segunda chave do advisory lock: o dia como inteiro AAAAMMDD ("2026-09-17" → 20260917). */
export function chaveLockDoDia(dia: string): number {
  // Valida o formato reaproveitando a mesma regra da composição do código.
  formatarDataEntradaParaNumeroOS(dia);
  return Number.parseInt(dia.replace(/-/g, ""), 10);
}
