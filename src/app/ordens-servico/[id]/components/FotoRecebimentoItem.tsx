"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui";
import { validarFotoRecebimentoNoCliente } from "@/lib/ordens-servico-foto";

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
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const endpoint = `/api/ordens-servico/${ordemServicoId}/itens/${itemId}/foto`;

  useEffect(() => {
    if (!arquivo) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(arquivo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  const selecionar = (file: File | null) => {
    setErro(null);
    if (!file) {
      setArquivo(null);
      return;
    }
    const mensagem = validarFotoRecebimentoNoCliente(file);
    if (mensagem) {
      setErro(mensagem);
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    setArquivo(file);
  };

  const salvar = async () => {
    if (!arquivo || salvando) return;
    setSalvando(true);
    setErro(null);
    try {
      const dados = new FormData();
      dados.set("foto", arquivo);
      const response = await fetch(endpoint, { method: "POST", body: dados });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Não foi possível salvar a foto.");
      }
      setArquivo(null);
      if (inputRef.current) inputRef.current.value = "";
      await onAtualizada();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha de comunicação ao salvar a foto.");
    } finally {
      setSalvando(false);
    }
  };

  const remover = async () => {
    if (salvando || !window.confirm("Remover a foto de recebimento deste item?")) return;
    setSalvando(true);
    setErro(null);
    try {
      const response = await fetch(endpoint, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload?.message || "Não foi possível remover a foto.");
      }
      await onAtualizada();
    } catch (error) {
      setErro(error instanceof Error ? error.message : "Falha de comunicação ao remover a foto.");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="mt-4 rounded-xl border border-black/10 bg-slate-50 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Foto no recebimento</p>
          <p className="mt-1 text-xs text-slate-500">JPEG, PNG ou WebP, até 4 MB.</p>
        </div>
        {!editavel && possuiFoto ? <span className="text-xs font-medium text-slate-500">Somente leitura</span> : null}
      </div>

      {preview || possuiFoto ? (
        <div className="relative mt-3 aspect-[4/3] max-w-sm overflow-hidden rounded-xl border border-black/10 bg-white">
          <Image
            src={preview || `${endpoint}?v=${possuiFoto ? "1" : "0"}`}
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
            className="block max-w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-200 file:px-3 file:py-2 file:font-medium file:text-slate-800"
            onChange={(event) => selecionar(event.target.files?.[0] ?? null)}
          />
          {arquivo ? (
            <>
              <Button type="button" isLoading={salvando} onClick={() => void salvar()}>Salvar foto</Button>
              <Button type="button" variant="secondary" disabled={salvando} onClick={() => selecionar(null)}>Cancelar</Button>
            </>
          ) : null}
          {possuiFoto && !arquivo ? (
            <Button type="button" variant="ghost" disabled={salvando} onClick={() => void remover()}>Remover foto</Button>
          ) : null}
        </div>
      ) : null}
      {erro ? <p role="alert" className="mt-2 text-sm font-medium text-rose-700">{erro}</p> : null}
    </div>
  );
}
