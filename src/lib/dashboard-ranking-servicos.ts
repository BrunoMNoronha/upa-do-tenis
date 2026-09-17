/**
 * Ranking "Serviços mais executados" do Dashboard.
 *
 * Métrica preservada: número de EXECUÇÕES do serviço no período.
 * - Ordem de Serviço: cada `ServicoItemOrdem` é uma execução (um serviço
 *   aplicado a um item/par; o mesmo serviço não se repete no mesmo item).
 *   Conta-se a linha, como antes.
 * - Atendimento Rápido: cada `ItemAtendimentoRapido` é uma execução (dois
 *   pares do mesmo serviço são dois itens). Conta-se a linha, como na OS.
 *
 * Não é quantidade de atendimentos nem de OS. Módulo puro.
 */

export const LIMITE_RANKING_SERVICOS = 5;

export type ExecucoesServico = {
  servicoId: string;
  quantidade: number;
};

/**
 * Soma as execuções das duas origens por serviço e devolve os `limite`
 * maiores. Empate: `servicoId` crescente, para o resultado ser estável.
 */
export function combinarRankingServicos(
  ordensServico: readonly ExecucoesServico[],
  atendimentosRapidos: readonly ExecucoesServico[],
  limite = LIMITE_RANKING_SERVICOS,
): ExecucoesServico[] {
  const totais = new Map<string, number>();

  for (const { servicoId, quantidade } of [...ordensServico, ...atendimentosRapidos]) {
    if (quantidade <= 0) continue;
    totais.set(servicoId, (totais.get(servicoId) ?? 0) + quantidade);
  }

  return [...totais.entries()]
    .map(([servicoId, quantidade]) => ({ servicoId, quantidade }))
    .sort((a, b) => b.quantidade - a.quantidade || (a.servicoId < b.servicoId ? -1 : a.servicoId > b.servicoId ? 1 : 0))
    .slice(0, limite);
}
