/** Revalida a identidade exibida; nunca aplica a conferência a outro caixa. */
export async function enviarFechamentoCaixa(
  caixaId: string,
  payload: { saldoFinalInformado: number; observacao: string },
  fetcher: typeof fetch = fetch
) {
  const atual = await fetcher("/api/caixa/atual", { cache: "no-store" });
  if (!atual.ok) {
    throw new Error("Não foi possível conferir o caixa atual. Tente novamente.");
  }
  const { caixa } = await atual.json();
  if (caixa?.id !== caixaId) {
    throw new Error("O caixa exibido já foi fechado ou substituído. Confira o estado atualizado antes de continuar.");
  }

  const response = await fetcher(`/api/caixa/${encodeURIComponent(caixaId)}/fechar`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const erro = await response.json().catch(() => null);
    throw new Error(erro?.message || "Erro ao fechar caixa. Tente novamente.");
  }
}
