import { ResumoFinanceiro } from "./types";

import { formatCurrency } from "@/lib/formatters";
export const currencyFormatter = { format: formatCurrency };

export const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function formatarStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

export function obterTomStatusFinanceiro(status: ResumoFinanceiro["statusFinanceiro"]) {
  if (status === "PAGO") return "success" as const;
  if (status === "PARCIAL") return "warning" as const;
  if (status === "CANCELADO") return "danger" as const;
  return "neutral" as const;
}
