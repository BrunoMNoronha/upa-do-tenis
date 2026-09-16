"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { FotoOtimizadaResumo } from "@/components/foto-otimizada-resumo";
import { Button } from "@/components/ui";
import { useFotoOtimizada } from "@/components/use-foto-otimizada";

type Props = {
  ordemServicoId: string;
  itemId: string;
  descricaoItem: string;
  possuiFoto: boolean;
  editavel: boolean;
  onAtualizada: () => void | Promise<void>;
};

export function FotoRecebimentoItem({
  ordemServicoId,
  itemId,
  descricaoItem,
  possuiFoto,
  editavel,
  onAtualizada,
}: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const foto = useFotoOtimizada();
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const endpoint = `/api/ordens-servico/${ordemServicoId}/itens/${itemId}/foto`;
  const processando = foto.estado === "processando";
  const erro = foto.erro ?? erroEnvio;

  const limparSelecao = () => {
    foto.limpar();
    if (inputRef.current) inputRef.current.value = "";
  };

  const selecionar = (file: File | null) => {
    setErroEnvio(null);
    void foto.selecionar(file).then((ok) => {
      // Após erro, limpa o input para permitir escolher o mesmo arquivo de novo.
      if (!ok && inputRef.current) inputRef.current.value = "";
    });
  };

  const salvar = async () => {
    if (!foto.arquivo || salvando || processando) return;
    setSalvando(true);
    setErroEnvio(null);
    try {
      const dados = new FormData();
      dados.set("foto", foto.arquivo);
      const response = await fetch(endpoint, { method: "POST", body: dados });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Não foi possível salvar a foto.");
      }
      limparSelecao();
      await onAtualizada();
    } catch (error) {
      setErroEnvio(error instanceof Error ? error.message : "Falha de comunicação ao salvar a foto.");
    } finally {
      setSalvando(false);
    }
  };

  const remover = async () => {
    if (salvando || processando || !window.confirm("Remover a foto de recebimento deste item?")) return;
    setSalvando(true);
    setErroEnvio(null);
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Não foi possível remover a foto.");
      }
      await onAtualizada();
    } catch (error) {
      setErroEnvio(error instanceof Error ? error.message : "Falha de comunicação ao remover a foto.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-black/10 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Foto no recebimento</p>
          <p className="mt-1 text-xs text-slate-500">JPEG, PNG ou WebP, até 25 MB. A foto é otimizada antes do envio.</p>
        </div>
        {!editavel && possuiFoto ? <span className="text-xs font-medium text-slate-500">Somente leitura</span> : null}
      </div>

      {foto.preview || possuiFoto ? (
        <div className="relative mt-3 aspect-[4/3] max-w-sm overflow-hidden rounded-xl border border-black/10 bg-white">
          <Image
            src={foto.preview || `${endpoint}?v=${possuiFoto ? "1" : "0"}`}
            alt={`Foto de recebimento de ${descricaoItem}`}
            fill
            unoptimized
            className="object-contain"
          />
        </div>
      ) : (
        <p className="mt-3 text-sm text-slate-600">Nenhuma foto registrada para este item.</p>
      )}

      {editavel ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            disabled={salvando}
            className="block max-w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:font-medium file:text-slate-800"
            onChange={(event) => selecionar(event.target.files?.[0] ?? null)}
          />
          {processando ? <p role="status" className="text-sm text-slate-600">Otimizando foto…</p> : null}
          {foto.arquivo ? (
            <>
              <Button type="button" isLoading={salvando} disabled={processando} onClick={() => void salvar()}>Salvar foto</Button>
              <Button type="button" variant="secondary" disabled={salvando} onClick={limparSelecao}>Cancelar</Button>
            </>
          ) : null}
          {possuiFoto && !foto.arquivo && !processando ? (
            <Button type="button" variant="ghost" disabled={salvando} onClick={() => void remover()}>Remover foto</Button>
          ) : null}
        </div>
      ) : null}
      {foto.resultado ? <div className="mt-2"><FotoOtimizadaResumo resultado={foto.resultado} /></div> : null}
      {erro ? <p role="alert" className="mt-2 text-sm font-medium text-rose-700">{erro}</p> : null}
    </div>
  );
}
