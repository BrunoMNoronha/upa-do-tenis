"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { FotoOtimizadaResumo } from "@/components/foto-otimizada-resumo";
import { Button, Card, SectionTitle } from "@/components/ui";
import { useFotoOtimizada } from "@/components/use-foto-otimizada";
import { ROTULO_SITUACAO_CATALOGO, situacaoNoCatalogo } from "@/lib/catalogo-regras";
import type { ProdutoListado } from "../types";

type Props = {
  produto: ProdutoListado;
  onAtualizada: () => void;
};

/**
 * Imagem comercial do produto para o catálogo público. Mesmo fluxo das fotos
 * de OS (otimização no navegador, validação no servidor), em pasta própria.
 */
export function ProdutoImagem({ produto, onAtualizada }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const foto = useFotoOtimizada();
  const [salvando, setSalvando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const endpoint = `/api/produtos/${produto.id}/imagem`;
  // `atualizadoEm` muda a cada troca e evita mostrar a imagem anterior do cache.
  const srcAtual = `${endpoint}?v=${encodeURIComponent(produto.atualizadoEm)}`;
  const situacao = situacaoNoCatalogo(produto);
  const inputId = `imagem-produto-${produto.id}`;

  const salvar = async () => {
    if (!foto.arquivo || salvando) return;
    setSalvando(true);
    setErroEnvio(null);
    try {
      const dados = new FormData();
      dados.set("imagem", foto.arquivo);
      const response = await fetch(endpoint, { method: "POST", body: dados });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Não foi possível salvar a imagem.");
      }
      foto.limpar();
      if (inputRef.current) inputRef.current.value = "";
      onAtualizada();
    } catch (error) {
      setErroEnvio(error instanceof Error ? error.message : "Falha de comunicação ao salvar a imagem.");
    } finally {
      setSalvando(false);
    }
  };

  const remover = async () => {
    if (salvando || !window.confirm(`Remover a imagem de "${produto.nome}"?`)) return;
    setSalvando(true);
    setErroEnvio(null);
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Não foi possível remover a imagem.");
      }
      onAtualizada();
    } catch (error) {
      setErroEnvio(error instanceof Error ? error.message : "Falha de comunicação ao remover a imagem.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <Card className="p-6">
      <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">Catálogo público</p>
      <SectionTitle className="mt-2 text-xl">Imagem de {produto.nome}</SectionTitle>
      <p className="mt-2 text-sm text-slate-600">
        Situação: <strong>{ROTULO_SITUACAO_CATALOGO[situacao]}</strong>. Use &quot;Publicar no catálogo&quot; na lista para mudar.
      </p>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Atual</p>
          {produto.possuiImagem ? (
            <div className="relative mt-2 aspect-square overflow-hidden rounded-xl border border-black/10 bg-slate-50">
              <Image src={srcAtual} alt={`Imagem atual de ${produto.nome}`} fill unoptimized className="object-contain" />
            </div>
          ) : (
            <p className="mt-2 rounded-xl border border-dashed border-black/15 bg-slate-50 p-4 text-sm text-slate-600">
              Sem imagem. O catálogo mostra um marcador no lugar.
            </p>
          )}
          {produto.possuiImagem ? (
            <Button type="button" variant="ghost" disabled={salvando} onClick={() => void remover()} className="mt-2 w-full">
              Remover imagem
            </Button>
          ) : null}
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{produto.possuiImagem ? "Trocar" : "Enviar"}</p>
          <input
            ref={inputRef}
            id={inputId}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            disabled={salvando || foto.estado === "processando"}
            className="peer sr-only"
            onChange={(event) => void foto.selecionar(event.target.files?.[0] ?? null)}
          />
          <label htmlFor={inputId} className="mt-2 inline-block cursor-pointer rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-800 peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--accent-strong)]">
            Escolher imagem
          </label>
          <p className="mt-1 text-xs text-slate-500">JPEG, PNG ou WebP, até 25 MB. A imagem é reduzida antes do envio.</p>
          {foto.estado === "processando" ? <p role="status" className="mt-2 text-sm text-slate-600">Otimizando imagem...</p> : null}
          {foto.preview && foto.resultado ? (
            <div className="mt-2 rounded-xl border border-[color:var(--accent-soft)] bg-white p-2">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-50">
                <Image src={foto.preview} alt={`Nova imagem de ${produto.nome}`} fill unoptimized className="object-contain" />
              </div>
              <FotoOtimizadaResumo resultado={foto.resultado} />
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" isLoading={salvando} onClick={() => void salvar()}>Salvar imagem</Button>
                <Button type="button" variant="ghost" disabled={salvando} onClick={foto.limpar}>Descartar</Button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {foto.erro || erroEnvio ? <p role="alert" className="mt-3 text-sm font-medium text-rose-700">{foto.erro ?? erroEnvio}</p> : null}
    </Card>
  );
}
