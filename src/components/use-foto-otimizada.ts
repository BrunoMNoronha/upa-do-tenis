"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { otimizarImagem, ImagemOtimizacaoError, type ImagemOtimizada } from "@/lib/imagem-otimizacao";

export type EstadoFotoOtimizada = "vazio" | "processando" | "pronto" | "erro";

/**
 * Seleção de foto com otimização no navegador. O preview mostra exatamente o
 * arquivo que será enviado, e a Object URL é revogada ao trocar ou limpar.
 */
export function useFotoOtimizada() {
  const [estado, setEstado] = useState<EstadoFotoOtimizada>("vazio");
  const [resultado, setResultado] = useState<ImagemOtimizada | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  // Descarta resultados de seleções anteriores que terminem fora de ordem.
  const selecaoAtual = useRef(0);

  useEffect(() => {
    if (!resultado) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(resultado.file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [resultado]);

  useEffect(() => () => {
    selecaoAtual.current += 1;
  }, []);

  const limpar = useCallback(() => {
    selecaoAtual.current += 1;
    setResultado(null);
    setErro(null);
    setEstado("vazio");
  }, []);

  const selecionar = useCallback(async (file: File | null): Promise<boolean> => {
    const selecao = ++selecaoAtual.current;
    setResultado(null);
    setErro(null);
    if (!file) {
      setEstado("vazio");
      return false;
    }
    setEstado("processando");
    try {
      const otimizada = await otimizarImagem(file);
      if (selecao !== selecaoAtual.current) return false;
      if (process.env.NODE_ENV === "development") {
        const reducao = (1 - otimizada.tamanhoOtimizado / otimizada.tamanhoOriginal) * 100;
        console.info("[foto] otimizada", {
          originalBytes: otimizada.tamanhoOriginal,
          otimizadaBytes: otimizada.tamanhoOtimizado,
          reducaoPercentual: Number(reducao.toFixed(1)),
          original: `${otimizada.original.largura}x${otimizada.original.altura}`,
          final: `${otimizada.final.largura}x${otimizada.final.altura}`,
          mimeType: otimizada.mimeType,
        });
      }
      setResultado(otimizada);
      setEstado("pronto");
      return true;
    } catch (error) {
      if (selecao !== selecaoAtual.current) return false;
      setErro(error instanceof ImagemOtimizacaoError ? error.message : "Não foi possível processar a imagem.");
      setEstado("erro");
      return false;
    }
  }, []);

  return { estado, resultado, arquivo: resultado?.file ?? null, preview, erro, selecionar, limpar };
}
