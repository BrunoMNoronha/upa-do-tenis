const ROTULOS_ORIGEM_MOVIMENTACAO_CAIXA: Record<string, string> = {
  MANUAL: "Manual",
  PAGAMENTO_OS: "Pagamento de OS",
  ESTORNO_PAGAMENTO_OS: "Estorno de pagamento de OS",
  VENDA_BALCAO: "Venda de balcão",
  CANCELAMENTO_VENDA_BALCAO: "Cancelamento de venda de balcão",
  ATENDIMENTO_RAPIDO: "Atendimento Rápido",
  ESTORNO_ATENDIMENTO_RAPIDO: "Estorno de Atendimento Rápido",
};

/** Rótulo legível da origem de uma movimentação de caixa; origem desconhecida aparece como veio. */
export function rotuloOrigemMovimentacaoCaixa(origem: string): string {
  return ROTULOS_ORIGEM_MOVIMENTACAO_CAIXA[origem] ?? origem;
}
