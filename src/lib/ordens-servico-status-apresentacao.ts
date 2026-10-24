/**
 * Rótulos e tons de exibição dos status da OS. Módulo puro (sem Prisma),
 * usado pela listagem e pelo detalhe; não altera regras de transição.
 */
import type { OsStatus } from "@/lib/ordens-servico-status";

export type TomStatus = "neutral" | "success" | "warning" | "danger" | "accent";

const ROTULOS_OPERACIONAIS: Record<OsStatus, string> = {
  ABERTA: "Aberta",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  ENTREGUE: "Entregue",
  CANCELADA: "Cancelada",
};

const TONS_OPERACIONAIS: Record<OsStatus, TomStatus> = {
  ABERTA: "neutral",
  EM_ANDAMENTO: "warning",
  CONCLUIDA: "success",
  ENTREGUE: "neutral",
  CANCELADA: "danger",
};

export function rotuloStatusOperacional(status: string): string {
  return ROTULOS_OPERACIONAIS[status as OsStatus] ?? status;
}

export function tomStatusOperacional(status: string): TomStatus {
  return TONS_OPERACIONAIS[status as OsStatus] ?? "neutral";
}

const ROTULOS_FINANCEIROS: Record<string, string> = {
  PENDENTE: "Pendente",
  PARCIAL: "Parcial",
  PAGO: "Pago",
  CANCELADO: "Cancelado",
};

const TONS_FINANCEIROS: Record<string, TomStatus> = {
  PENDENTE: "danger",
  PARCIAL: "warning",
  PAGO: "success",
  CANCELADO: "neutral",
};

export function rotuloStatusFinanceiro(status: string): string {
  return ROTULOS_FINANCEIROS[status] ?? status;
}

export function tomStatusFinanceiro(status: string): TomStatus {
  return TONS_FINANCEIROS[status] ?? "neutral";
}

export type ProximaAcaoStatus = { rotulo: string; statusNovo: OsStatus };

/**
 * Ação principal de avanço do fluxo operacional (sem cancelamento, que tem
 * fluxo próprio). Coerente com `transicoesPermitidas`; `null` para estados finais.
 */
export function proximaAcaoStatus(status: string): ProximaAcaoStatus | null {
  switch (status) {
    case "ABERTA":
      return { rotulo: "Iniciar serviço", statusNovo: "EM_ANDAMENTO" };
    case "EM_ANDAMENTO":
      return { rotulo: "Marcar como concluída", statusNovo: "CONCLUIDA" };
    case "CONCLUIDA":
      return { rotulo: "Entregar ao cliente", statusNovo: "ENTREGUE" };
    default:
      return null;
  }
}
