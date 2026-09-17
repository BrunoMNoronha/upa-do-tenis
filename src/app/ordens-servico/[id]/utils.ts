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

/**
 * Decide se a ação "Receber pagamento" deve ser exibida no detalhe da OS.
 *
 * Usa exclusivamente o `saldo` consolidado pelo backend (`resumoFinanceiro`),
 * sem recalcular valores no frontend. Só oculta quando o saldo é um número
 * válido igual a zero; dado ausente ou inválido NÃO é tratado como quitado.
 */
export function deveExibirReceberPagamento(
  resumo: (Pick<ResumoFinanceiro, "saldo"> & Partial<Pick<ResumoFinanceiro, "statusFinanceiro">>) | null | undefined,
): boolean {
  // OS cancelada não recebe pagamento; a API também recusa (#229).
  if (resumo?.statusFinanceiro === "CANCELADO") {
    return false;
  }
  const saldo = resumo?.saldo;
  if (typeof saldo !== "number" || !Number.isFinite(saldo)) {
    return true;
  }
  return saldo > 0;
}
