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

export const MENSAGEM_CANCELAMENTO_COM_PAGAMENTO =
  "Esta OS possui pagamento registrado e não pode ser cancelada. O estorno de pagamentos ainda não está disponível.";

export const MENSAGEM_PAGAMENTO_OS_CANCELADA =
  "Não é possível registrar pagamento em uma OS cancelada.";

/**
 * Cancelamento considerando o financeiro (#229): enquanto não existir estorno
 * e devolução (#230), uma OS com qualquer valor pago não pode ser cancelada.
 * `valorPago` é o consolidado do backend (inclui sinal e pagamentos).
 */
export function podeCancelarOrdemServicoComFinanceiro(status: string, valorPago: number): boolean {
  return podeCancelarOrdemServico(status) && !(valorPago > 0);
}
