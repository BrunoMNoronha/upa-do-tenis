const brlFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL"
});

export const formatCurrencyBRL = (valueInCents: number): string => brlFormatter.format(valueInCents / 100);
