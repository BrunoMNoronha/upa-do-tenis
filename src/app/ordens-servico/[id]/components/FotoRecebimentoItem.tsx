"use client";

import Image from "next/image";
import { useRef, useState } from "react";

import { FotoOtimizadaResumo } from "@/components/foto-otimizada-resumo";
import { Button } from "@/components/ui";
import { useFotosOtimizadas } from "@/components/use-fotos-otimizadas";
import { LIMITE_FOTOS_POR_ITEM } from "@/lib/ordens-servico-fotos";

type FotoRegistrada = { id: string; criadoEm: string };

type Props = {
  ordemServicoId: string;
  itemId: string;
  descricaoItem: string;
  fotos: FotoRegistrada[];
  possuiFotoLegada: boolean;
  editavel: boolean;
  onAtualizada: () => void | Promise<void>;
};

export function FotoRecebimentoItem({ ordemServicoId, itemId, descricaoItem, fotos: fotosRegistradas, possuiFotoLegada, editavel, onAtualizada }: Props) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);
  const disponiveis = Math.max(0, LIMITE_FOTOS_POR_ITEM - fotosRegistradas.length);
  const fotos = useFotosOtimizadas(disponiveis);
  const [erroEnvio, setErroEnvio] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const endpoint = `/api/ordens-servico/${ordemServicoId}/itens/${itemId}/fotos`;

  const selecionar = (arquivos: File[], input: HTMLInputElement | null) => {
    setErroEnvio(null);
    void fotos.selecionar(arquivos).then(() => {
      if (input) input.value = "";
    });
  };

  const salvar = async () => {
    if (fotos.fotos.length === 0 || salvando || fotos.processando) return;
    setSalvando(true);
    setErroEnvio(null);
    try {
      let salvas = 0;
      const erros: string[] = [];
      for (const foto of [...fotos.fotos]) {
        try {
          const dados = new FormData();
          dados.set("foto", foto.arquivo);
          dados.set("chaveIdempotencia", foto.chaveIdempotencia);
          const response = await fetch(endpoint, { method: "POST", body: dados });
          if (!response.ok) {
            const payload = await response.json().catch(() => ({}));
            throw new Error(payload?.message || "Não foi possível salvar a foto.");
          }
          fotos.remover(foto.chaveIdempotencia);
          salvas += 1;
        } catch (error) {
          erros.push(error instanceof Error ? error.message : "Falha de comunicação ao salvar a foto.");
        }
      }
      if (salvas > 0) await onAtualizada();
      if (erros.length > 0) setErroEnvio(`${erros.length} foto(s) não foram salvas. Tente reenviar somente as pendentes.`);
    } catch (error) {
      setErroEnvio(error instanceof Error ? error.message : "Não foi possível atualizar a galeria.");
    } finally {
      setSalvando(false);
    }
  };

  const remover = async (fotoId: string) => {
    if (salvando || !window.confirm("Remover esta foto de recebimento?")) return;
    setSalvando(true);
    setErroEnvio(null);
    try {
      const response = await fetch(`${endpoint}/${fotoId}`, { method: "DELETE" });
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
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Fotos no recebimento</p>
          <p className="mt-1 text-xs text-slate-500">JPEG, PNG ou WebP, até 25 MB. Máximo de {LIMITE_FOTOS_POR_ITEM} por item.</p>
        </div>
        <span className="text-xs font-medium text-slate-500">{fotosRegistradas.length} de {LIMITE_FOTOS_POR_ITEM}</span>
      </div>

      {fotosRegistradas.length > 0 ? (
        <ul className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {fotosRegistradas.map((foto, indice) => (
            <li key={foto.id} className="rounded-xl border border-black/10 bg-white p-2">
              <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-50">
                <Image src={`${endpoint}/${foto.id}`} alt={`Foto ${indice + 1} de ${descricaoItem}`} fill unoptimized className="object-cover" />
              </div>
              {editavel ? <Button type="button" variant="ghost" disabled={salvando} onClick={() => void remover(foto.id)} className="mt-2 w-full">Remover</Button> : null}
            </li>
          ))}
        </ul>
      ) : possuiFotoLegada ? (
        <div className="relative mt-3 aspect-[4/3] max-w-sm overflow-hidden rounded-xl border border-black/10 bg-white">
          <Image src={`/api/ordens-servico/${ordemServicoId}/itens/${itemId}/foto`} alt={`Foto de recebimento de ${descricaoItem}`} fill unoptimized className="object-contain" />
        </div>
      ) : <p className="mt-3 text-sm text-slate-600">Nenhuma foto registrada para este item.</p>}

      {editavel && disponiveis > 0 ? (
        <div className="mt-3 space-y-3">
          <input ref={cameraRef} id={`camera-${itemId}`} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={salvando || fotos.processando} className="sr-only" onChange={(event) => selecionar(Array.from(event.target.files ?? []), event.currentTarget)} />
          <input ref={galeriaRef} id={`galeria-${itemId}`} type="file" accept="image/jpeg,image/png,image/webp" multiple disabled={salvando || fotos.processando} className="sr-only" onChange={(event) => selecionar(Array.from(event.target.files ?? []), event.currentTarget)} />
          <div className="flex flex-wrap gap-2">
            <label htmlFor={`camera-${itemId}`} className="cursor-pointer rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-800">Tirar foto</label>
            <label htmlFor={`galeria-${itemId}`} className="cursor-pointer rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-800">Escolher da galeria</label>
          </div>
          {fotos.fotos.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label="Novas fotos selecionadas">
              {fotos.fotos.map((foto, indice) => (
                <li key={foto.chaveIdempotencia} className="rounded-xl border border-[color:var(--accent-soft)] bg-white p-2">
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-50">
                    <Image src={foto.preview} alt={`Nova foto ${indice + 1} de ${descricaoItem}`} fill unoptimized className="object-cover" />
                  </div>
                  <Button type="button" variant="ghost" disabled={salvando} onClick={() => fotos.remover(foto.chaveIdempotencia)} className="mt-2 w-full">Remover</Button>
                  <FotoOtimizadaResumo resultado={foto.resultado} />
                </li>
              ))}
            </ul>
          ) : null}
          {fotos.processando ? <p role="status" className="text-sm text-slate-600">Otimizando fotos...</p> : null}
          {fotos.fotos.length > 0 ? <Button type="button" isLoading={salvando} disabled={fotos.processando} onClick={() => void salvar()}>Salvar fotos</Button> : null}
        </div>
      ) : null}
      {!editavel && fotosRegistradas.length > 0 ? <p className="mt-2 text-xs font-medium text-slate-500">Somente leitura</p> : null}
      {fotos.erro || erroEnvio ? <p role="alert" className="mt-2 text-sm font-medium text-rose-700">{fotos.erro ?? erroEnvio}</p> : null}
    </div>
  );
}
