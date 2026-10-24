"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import type { DadosSugestaoAvaliacao } from "@/lib/os-avaliacao-whatsapp";
import { alterarStatusOS, type DadosSugestaoConclusao } from "@/lib/os-conclusao-whatsapp";
import type { OsStatus } from "@/lib/ordens-servico-status";

type OrdemParaAcoes = Parameters<typeof alterarStatusOS>[0] & { id: string; favorita?: boolean };

type OpcoesAcoes = {
  nomeExibicaoEmpresa: string;
  /** Chamado depois que o backend confirma a conclusão (sugestão de WhatsApp). */
  onConcluida?: (dados: DadosSugestaoConclusao) => void;
  /** Chamado depois que o backend confirma a entrega (pedido de avaliação). */
  onEntregue?: (dados: DadosSugestaoAvaliacao) => void;
  /** Recarrega os dados da tela após uma ação bem-sucedida (padrão: router.refresh). */
  aoAtualizar?: () => void;
};

/**
 * Ações de uma OS compartilhadas entre listagem e detalhe: avançar status
 * (com sugestões de WhatsApp) e favoritar. O backend é a fonte de verdade:
 * sem atualização otimista, a tela é recarregada após persistir.
 */
export function useAcoesOrdemServico(ordem: OrdemParaAcoes, opcoes: OpcoesAcoes) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [favoritaPending, setFavoritaPending] = useState(false);
  const [statusPending, setStatusPending] = useState(false);
  // Ref além do estado: dois cliques no mesmo tick ainda não veem o re-render.
  const statusEmAndamentoRef = useRef(false);
  const isFavorita = ordem.favorita === true;

  const atualizar = () => {
    if (opcoes.aoAtualizar) {
      opcoes.aoAtualizar();
      return;
    }
    startTransition(() => {
      router.refresh();
    });
  };

  const avancarStatus = async (novoStatus: OsStatus) => {
    // Guarda contra clique duplo: uma única requisição (e um único modal).
    if (statusEmAndamentoRef.current || isPending) return;
    statusEmAndamentoRef.current = true;
    setError(null);
    setStatusPending(true);
    try {
      const resultado = await alterarStatusOS(ordem, novoStatus);

      if (!resultado.ok) {
        setError(resultado.mensagem);
        return;
      }

      // Sugestão de WhatsApp só depois de o backend confirmar a conclusão/entrega.
      if (resultado.sugestaoConclusao) {
        opcoes.onConcluida?.({ ...resultado.sugestaoConclusao, nomeExibicaoEmpresa: opcoes.nomeExibicaoEmpresa });
      } else if (resultado.sugestaoAvaliacao) {
        let linkAvaliacao: string | null = null;
        try {
          const resp = await fetch("/api/configuracoes");
          if (resp.ok) {
            const config = await resp.json();
            linkAvaliacao = config?.linkAvaliacaoGoogle ?? null;
          }
        } catch {
          // Erro de rede na busca do link não bloqueia a OS entregue
        }

        opcoes.onEntregue?.({
          ...resultado.sugestaoAvaliacao,
          linkAvaliacaoGoogle: linkAvaliacao,
          nomeExibicaoEmpresa: opcoes.nomeExibicaoEmpresa,
        });
      }

      atualizar();
    } finally {
      statusEmAndamentoRef.current = false;
      setStatusPending(false);
    }
  };

  // Marcador operacional (issue #153): após persistir, a tela é recarregada e
  // a ordenação vinda do servidor reposiciona a OS (favoritas primeiro).
  const alternarFavorita = async () => {
    if (favoritaPending || isPending) return;
    setError(null);
    setFavoritaPending(true);
    try {
      const response = await fetch(`/api/ordens-servico/${ordem.id}/favorita`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ favorita: !isFavorita }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.message || (isFavorita ? "Erro ao remover a OS dos favoritos." : "Erro ao favoritar a OS."));
        return;
      }

      atualizar();
    } catch {
      setError("Não foi possível comunicar com o servidor. Tente novamente.");
    } finally {
      setFavoritaPending(false);
    }
  };

  return {
    error,
    isPending,
    isFavorita,
    favoritaPending,
    statusPending: statusPending || isPending,
    avancarStatus,
    alternarFavorita,
  };
}
