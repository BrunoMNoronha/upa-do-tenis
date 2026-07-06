export const TIPOS_FORMA_PAGAMENTO = [
  "DINHEIRO",
  "PIX",
  "CARTAO_CREDITO",
  "CARTAO_DEBITO",
  "OUTRO",
] as const;

export type TipoFormaPagamento = (typeof TIPOS_FORMA_PAGAMENTO)[number];

export const TIPO_FORMA_PAGAMENTO_LABELS: Record<TipoFormaPagamento, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "PIX",
  CARTAO_CREDITO: "Cartão de Crédito",
  CARTAO_DEBITO: "Cartão de Débito",
  OUTRO: "Outro",
};
