"use client";

import { useCallback, useRef, useState, useTransition } from "react";
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
  const [isExcluindo, setIsExcluindo] = useState(false);
  const exclusaoEmCurso = useRef(false);

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
    if (exclusaoEmCurso.current) return;
    setListaError(null);
    setItemParaExcluir(item);
  }, []);

  const cancelarExclusao = useCallback(() => {
    if (exclusaoEmCurso.current) return;
    setItemParaExcluir(null);
  }, []);

  /**
   * `aoExcluir` é chamado após o 204, para que a tela possa sair do modo de
   * edição caso o item excluído fosse o que estava sendo editado.
   */
  const confirmarExclusao = useCallback(
    async (aoExcluir?: (item: T) => void) => {
      if (!itemParaExcluir || exclusaoEmCurso.current) {
        return;
      }

      const item = itemParaExcluir;
      // O ref bloqueia duas confirmações no mesmo evento, antes do próximo
      // render. A transição do refresh não acompanha a requisição de rede.
      exclusaoEmCurso.current = true;
      setIsExcluindo(true);
      setListaError(null);

      try {
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
      } catch {
        setListaError(`Não foi possível excluir ${rotulo}. Tente novamente.`);
      } finally {
        // Mantém a confirmação visível durante a rede e, em caso de erro,
        // fecha somente após a resposta para exibir a mensagem na lista.
        setItemParaExcluir(null);
        setIsExcluindo(false);
        exclusaoEmCurso.current = false;
      }
    },
    [endpoint, itemParaExcluir, rotulo, router],
  );

  return {
    listaError,
    setListaError,
    isPending: isPending || isExcluindo,
    isExcluindo,
    startTransition,
    alternarStatus,
    itemParaExcluir,
    pedirExclusao,
    cancelarExclusao,
    confirmarExclusao,
  };
}
