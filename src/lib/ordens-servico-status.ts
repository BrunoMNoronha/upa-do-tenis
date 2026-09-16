/**
 * Regras de transição de status da Ordem de Serviço.
 *
 * Módulo sem dependência de Prisma para poder ser importado por componentes
 * cliente. A rota de status é quem garante a regra no backend.
 */

export type OsStatus = "ABERTA" | "EM_ANDAMENTO" | "CONCLUIDA" | "ENTREGUE" | "CANCELADA";

// Cancelamento é uma transição de estado controlada (nunca exclusão física).
// Somente uma OS ABERTA pode ser cancelada; CANCELADA é estado final.
export const transicoesPermitidas: Record<OsStatus, OsStatus[]> = {
  ABERTA: ["EM_ANDAMENTO", "CANCELADA"],
  EM_ANDAMENTO: ["CONCLUIDA"],
  CONCLUIDA: ["ENTREGUE"],
  ENTREGUE: [], // Estado final
  CANCELADA: [], // Estado final
};

export function transicaoPermitida(statusAtual: string, statusNovo: string): boolean {
  const permitidas = transicoesPermitidas[statusAtual as OsStatus] ?? [];
  return permitidas.includes(statusNovo as OsStatus);
}

export function podeCancelarOrdemServico(status: string): boolean {
  return transicaoPermitida(status, "CANCELADA");
}
