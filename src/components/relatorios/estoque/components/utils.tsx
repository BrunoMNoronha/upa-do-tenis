const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

export const formatCurrency = (value: number) => {
  return currencyFormatter.format(value);
};

export const formatDate = (date: Date | string) => {
  const d = new Date(date);
  return new Intl.DateTimeFormat("pt-BR").format(d);
};
