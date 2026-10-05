"use client";

import { useCallback, useEffect, useState } from "react";

import {
  CHAVE_CARRINHO_CATALOGO,
  lerCarrinho,
  serializarCarrinho,
  type ItemCarrinho,
} from "@/lib/carrinho-catalogo";

/**
 * Carrinho persistido no `localStorage`. Armazenamento indisponível (modo
 * privado, bloqueio de cookies) mantém o carrinho só em memória; conteúdo
 * corrompido é descartado com aviso, sem quebrar a página.
 */
export function useCarrinhoCatalogo() {
  const [itens, setItensEstado] = useState<ItemCarrinho[]>([]);
  const [carregado, setCarregado] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);

  useEffect(() => {
    let bruto: string | null = null;
    try {
      bruto = window.localStorage.getItem(CHAVE_CARRINHO_CATALOGO);
    } catch {
      setAviso("O navegador não permite salvar o carrinho. Ele funciona, mas será perdido ao fechar a página.");
    }
    const lido = lerCarrinho(bruto);
    if (lido.descartado) setAviso("Parte do carrinho salvo estava ilegível e foi descartada.");
    setItensEstado(lido.itens);
    setCarregado(true);
  }, []);

  useEffect(() => {
    if (!carregado) return;
    try {
      window.localStorage.setItem(CHAVE_CARRINHO_CATALOGO, serializarCarrinho(itens));
    } catch {
      // Sem armazenamento: o carrinho segue em memória; o aviso já foi exibido na leitura.
    }
  }, [itens, carregado]);

  const atualizar = useCallback((transformar: (atual: ItemCarrinho[]) => ItemCarrinho[]) => {
    setItensEstado((atual) => transformar(atual));
  }, []);

  return { itens, carregado, aviso, atualizar };
}
