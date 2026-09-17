/**
 * Estado e regras do formulário de Atendimento Rápido (navegador).
 *
 * Os campos monetários usam a máscara de digitação por centavos
 * (`maskCurrency`), então o valor é lido dos dígitos — sem ponto flutuante.
 * Tudo aqui é conveniência de tela: o servidor revalida e recalcula.
 */

import { calcularAtendimentoRapido } from "@/lib/atendimento-rapido-calculo";
import { centavosParaDecimal, paraCentavos } from "@/lib/centavos";
import { maskCurrency } from "@/lib/formatters";

export type ServicoCatalogo = {
  id: string;
  nome: string;
  /** Preço do catálogo em texto decimal ("50.00"), valor inicial editável. */
  precoBase: string;
};

export type LinhaServicoFormulario = {
  chave: string;
  servicoId: string;
  valor: string;
};

export type LinhaPagamentoFormulario = {
  chave: string;
  formaPagamentoId: string;
  valor: string;
};

/** "R$ 150,50" → 15050. Campo vazio → 0. */
export function centavosDaMascara(mascara: string): number {
  const digitos = mascara.replace(/\D/g, "");
  return digitos ? Number.parseInt(digitos, 10) : 0;
}

/** 15050 → "R$ 150,50". */
export function mascaraDeCentavos(centavos: number): string {
  return centavos > 0 ? maskCurrency(String(centavos)) : "";
}

/** Preço do catálogo como valor inicial mascarado (vazio se o cadastro não tiver preço válido). */
export function mascaraDoPrecoCatalogo(precoBase: string): string {
  return mascaraDeCentavos(paraCentavos(precoBase) ?? 0);
}

export type ResumoFormulario = {
  totalCentavos: number;
  somaPagamentosCentavos: number;
  /** Positivo: falta distribuir; negativo: pagamentos acima do total. */
  restanteCentavos: number;
};

export function resumirFormulario(
  servicos: readonly LinhaServicoFormulario[],
  pagamentos: readonly LinhaPagamentoFormulario[],
): ResumoFormulario {
  const calculo = calcularAtendimentoRapido(
    servicos.map((linha) => ({ servicoId: linha.servicoId, valorCentavos: centavosDaMascara(linha.valor) })),
    pagamentos.map((linha) => ({ formaPagamentoId: linha.formaPagamentoId, valorCentavos: centavosDaMascara(linha.valor) })),
  );

  return {
    totalCentavos: calculo.totalCentavos,
    somaPagamentosCentavos: calculo.somaPagamentosCentavos,
    restanteCentavos: calculo.diferencaCentavos,
  };
}

/** Primeira pendência que impede o envio, em linguagem de balcão; `null` quando está pronto. */
export function validarFormulario(
  servicos: readonly LinhaServicoFormulario[],
  pagamentos: readonly LinhaPagamentoFormulario[],
): string | null {
  if (servicos.length === 0) return "Adicione ao menos um serviço.";

  for (const [indice, linha] of servicos.entries()) {
    const posicao = `Serviço ${indice + 1}`;
    if (!linha.servicoId) return `${posicao}: selecione o serviço.`;
    if (centavosDaMascara(linha.valor) <= 0) return `${posicao}: informe um valor maior que zero.`;
  }

  if (pagamentos.length === 0) return "Informe ao menos uma forma de pagamento.";

  const formas = new Set<string>();
  for (const [indice, linha] of pagamentos.entries()) {
    const posicao = `Pagamento ${indice + 1}`;
    if (!linha.formaPagamentoId) return `${posicao}: selecione a forma de pagamento.`;
    if (formas.has(linha.formaPagamentoId)) return `${posicao}: forma de pagamento repetida. Some os valores em uma linha.`;
    formas.add(linha.formaPagamentoId);
    if (centavosDaMascara(linha.valor) <= 0) return `${posicao}: informe um valor maior que zero.`;
  }

  const { restanteCentavos } = resumirFormulario(servicos, pagamentos);
  if (restanteCentavos > 0) return "Os pagamentos não cobrem o total do atendimento.";
  if (restanteCentavos < 0) return "Os pagamentos passam do total do atendimento.";

  return null;
}

export function montarPayloadAtendimento(params: {
  chaveIdempotencia: string;
  servicos: readonly LinhaServicoFormulario[];
  pagamentos: readonly LinhaPagamentoFormulario[];
  observacoes: string;
}) {
  return {
    chaveIdempotencia: params.chaveIdempotencia,
    observacoes: params.observacoes.trim() || undefined,
    itens: params.servicos.map((linha) => ({
      servicoId: linha.servicoId,
      valor: centavosParaDecimal(centavosDaMascara(linha.valor)),
    })),
    pagamentos: params.pagamentos.map((linha) => ({
      formaPagamentoId: linha.formaPagamentoId,
      valor: centavosParaDecimal(centavosDaMascara(linha.valor)),
    })),
  };
}
