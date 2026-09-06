"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

type ItemCadastro = {
  id: string;
  nome: string;
  ativo: boolean;
};

type UseCadastroAcoesOptions = {
  /** Base da rota de API, sem barra final. Ex.: "/api/servicos". */
  endpoint: string;
  /** Rótulo no masculino ou feminino usado nas mensagens. Ex.: "o serviço". */
  rotulo: string;
};

/**
 * Concentra as ações de lista comuns às telas de cadastro (serviços, insumos,
 * produtos, formas de pagamento e clientes): alternar ativo/inativo e excluir
 * com confirmação. Cada tela mantém o seu próprio formulário.
 */
export function useCadastroAcoes<T extends ItemCadastro>({ endpoint, rotulo }: UseCadastroAcoesOptions) {
  const router = useRouter();
  const [listaError, setListaError] = useState<string | null>(null);
  const [itemParaExcluir, setItemParaExcluir] = useState<T | null>(null);
  const [isPending, startTransition] = useTransition();

  const alternarStatus = useCallback(
    async (item: T) => {
      setListaError(null);

      const response = await fetch(`${endpoint}/${item.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ativo: !item.ativo }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setListaError(payload.message ?? `Não foi possível alterar o status d${rotulo}.`);
        return;
      }

      startTransition(() => {
        router.refresh();
      });
    },
    [endpoint, rotulo, router],
  );

  const pedirExclusao = useCallback((item: T) => {
    setListaError(null);
    setItemParaExcluir(item);
  }, []);

  const cancelarExclusao = useCallback(() => {
    setItemParaExcluir(null);
  }, []);

  /**
   * `aoExcluir` é chamado após o 204, para que a tela possa sair do modo de
   * edição caso o item excluído fosse o que estava sendo editado.
   */
  const confirmarExclusao = useCallback(
    async (aoExcluir?: (item: T) => void) => {
      if (!itemParaExcluir) {
        return;
      }

      const item = itemParaExcluir;
      setItemParaExcluir(null);

      const response = await fetch(`${endpoint}/${item.id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        const payload = (await response.json()) as { message?: string };
        setListaError(payload.message ?? `Não foi possível excluir ${rotulo}.`);
        return;
      }

      aoExcluir?.(item);

      startTransition(() => {
        router.refresh();
      });
    },
    [endpoint, itemParaExcluir, rotulo, router],
  );

  return {
    listaError,
    setListaError,
    isPending,
    startTransition,
    alternarStatus,
    itemParaExcluir,
    pedirExclusao,
    cancelarExclusao,
    confirmarExclusao,
  };
}
