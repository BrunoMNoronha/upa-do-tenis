/**
 * Cálculo do Atendimento Rápido em centavos inteiros. Módulo puro, usado pelo
 * schema de validação, pelo serviço transacional e pelo formulário.
 *
 * Cada item é um serviço prestado com o seu valor (sem quantidade: dois pares
 * do mesmo serviço são dois itens). Regra: o atendimento só existe 100% pago —
 * a soma dos pagamentos precisa ser exatamente igual ao total dos itens.
 */

import { somarCentavos } from "@/lib/centavos";

export type ItemAtendimentoEntrada = {
  servicoId: string;
  valorCentavos: number;
};

export type PagamentoAtendimentoEntrada = {
  formaPagamentoId: string;
  valorCentavos: number;
};

export type CalculoAtendimentoRapido = {
  totalCentavos: number;
  somaPagamentosCentavos: number;
  /** Positivo: falta pagar; negativo: pagamento acima do total. */
  diferencaCentavos: number;
};

export function calcularAtendimentoRapido(
  itens: readonly ItemAtendimentoEntrada[],
  pagamentos: readonly PagamentoAtendimentoEntrada[],
): CalculoAtendimentoRapido {
  const totalCentavos = somarCentavos(itens.map((item) => item.valorCentavos));
  const somaPagamentosCentavos = somarCentavos(pagamentos.map((pagamento) => pagamento.valorCentavos));

  return {
    totalCentavos,
    somaPagamentosCentavos,
    diferencaCentavos: totalCentavos - somaPagamentosCentavos,
  };
}
