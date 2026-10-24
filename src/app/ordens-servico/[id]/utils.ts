import { ResumoFinanceiro } from "./types";

import { formatCurrency } from "@/lib/formatters";
import { rotuloStatusFinanceiro, rotuloStatusOperacional } from "@/lib/ordens-servico-status-apresentacao";
export const currencyFormatter = { format: formatCurrency };

export const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

/** Rótulo de status operacional ou financeiro, com acentuação ("Concluída", "Parcial"). */
export function formatarStatus(status: string) {
  const operacional = rotuloStatusOperacional(status);
  if (operacional !== status) return operacional;
  const financeiro = rotuloStatusFinanceiro(status);
  if (financeiro !== status) return financeiro;
  return status
    .toLowerCase()
    .split("_")
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(" ");
}

/** Percentual pago do total (0–100, inteiro); total zero ou inválido devolve 0. */
export function percentualPago(valorPago: number, valorTotal: number): number {
  const total = Number(valorTotal);
  const pago = Number(valorPago);
  if (!Number.isFinite(total) || total <= 0 || !Number.isFinite(pago)) return 0;
  return Math.min(100, Math.max(0, Math.round((pago / total) * 100)));
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
