"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ImagemOtimizacaoError, otimizarImagem, type ImagemOtimizada } from "@/lib/imagem-otimizacao";
import { LIMITE_FOTOS_POR_ITEM } from "@/lib/ordens-servico-fotos";

export type FotoOtimizadaSelecionada = {
  chaveIdempotencia: string;
  arquivo: File;
  preview: string;
  resultado: ImagemOtimizada;
};

function gerarChaveFoto() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") return crypto.randomUUID();
  return `foto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function useFotosOtimizadas(limite = LIMITE_FOTOS_POR_ITEM) {
  const [fotos, setFotos] = useState<FotoOtimizadaSelecionada[]>([]);
  const [processando, setProcessando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const urls = useRef(new Set<string>());
  const ativo = useRef(true);
  const processamentoEmCurso = useRef(false);

  useEffect(() => {
    const urlsCriadas = urls.current;
    ativo.current = true;
    return () => {
      ativo.current = false;
      urlsCriadas.forEach((url) => URL.revokeObjectURL(url));
      urlsCriadas.clear();
    };
  }, []);

  const selecionar = useCallback(async (arquivos: File[]) => {
    setErro(null);
    if (arquivos.length === 0) return true;
    if (processamentoEmCurso.current) return false;
    const restantes = limite - fotos.length;
    if (arquivos.length > restantes) {
      setErro(`Selecione no máximo ${restantes} foto${restantes === 1 ? "" : "s"}.`);
      return false;
    }

    processamentoEmCurso.current = true;
    setProcessando(true);
    const novas: FotoOtimizadaSelecionada[] = [];
    try {
      for (const arquivo of arquivos) {
        const resultado = await otimizarImagem(arquivo);
        if (!ativo.current) return false;
        const preview = URL.createObjectURL(resultado.file);
        urls.current.add(preview);
        novas.push({
          chaveIdempotencia: gerarChaveFoto(),
          arquivo: resultado.file,
          preview,
          resultado,
        });
      }
      setFotos((atuais) => [...atuais, ...novas]);
      return true;
    } catch (error) {
      novas.forEach((foto) => {
        URL.revokeObjectURL(foto.preview);
        urls.current.delete(foto.preview);
      });
      setErro(error instanceof ImagemOtimizacaoError ? error.message : "Não foi possível processar uma das imagens.");
      return false;
    } finally {
      processamentoEmCurso.current = false;
      if (ativo.current) setProcessando(false);
    }
  }, [fotos.length, limite]);

  const remover = useCallback((chaveIdempotencia: string) => {
    setFotos((atuais) => {
      const removida = atuais.find((foto) => foto.chaveIdempotencia === chaveIdempotencia);
      if (removida) {
        URL.revokeObjectURL(removida.preview);
        urls.current.delete(removida.preview);
      }
      return atuais.filter((foto) => foto.chaveIdempotencia !== chaveIdempotencia);
    });
    setErro(null);
  }, []);

  const limpar = useCallback(() => {
    setFotos((atuais) => {
      atuais.forEach((foto) => {
        URL.revokeObjectURL(foto.preview);
        urls.current.delete(foto.preview);
      });
      return [];
    });
    setErro(null);
  }, []);

  return { fotos, processando, erro, selecionar, remover, limpar, limite };
}
