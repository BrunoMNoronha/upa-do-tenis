"use client";

import { useEffect, useRef } from "react";
import Image from "next/image";
import type { UseFormRegisterReturn } from "react-hook-form";

import { Button, Input, Label } from "@/components/ui";
import { Combobox } from "@/components/combobox";
import { FotoOtimizadaResumo } from "@/components/foto-otimizada-resumo";
import { useFotoOtimizada } from "@/components/use-foto-otimizada";
import { formatCurrency } from "@/lib/formatters";
import { calcularSubtotalItem, type ServicoDoItem } from "@/lib/ordens-servico-itens";

export type ServicoCatalogo = { id: string; nome: string; precoBase: unknown };

export type EstadoFotoItem = { arquivo: File | null; processando: boolean };

export type StatusUploadFotoItem = "pendente" | "enviando" | "enviada" | "erro";

/**
 * Chave local estável do item, usada para reassociar a foto ao item depois
 * que a OS existe no banco. `crypto.randomUUID` não existe em contexto
 * inseguro (http na rede local, comum no celular da loja), por isso o fallback.
 */
export function gerarClientKeyItem(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

type Props = {
  indice: number;
  clientKey: string;
  descricaoField: UseFormRegisterReturn;
  erroDescricao?: string;
  erroServicos?: string;
  servicos: ServicoDoItem[];
  catalogo: ServicoCatalogo[];
  onAdicionarServico: (servicoId: string) => void;
  onAtualizarValorServico: (servicoId: string, valor: string) => void;
  onRemoverServico: (servicoId: string) => void;
  onFotoChange: (clientKey: string, estado: EstadoFotoItem) => void;
  /** Situação do upload da foto depois que a OS foi criada. */
  statusUpload?: StatusUploadFotoItem;
  erroUpload?: string;
  onRemoverItem: () => void;
  podeRemover: boolean;
  bloqueado: boolean;
};

/**
 * Card de um item recebido (issue #205): descrição, foto opcional, lista de
 * serviços e subtotal. A foto fica fora do JSON do formulário; o card avisa
 * o pai a cada mudança para que o upload aconteça após a criação da OS.
 */
export function ItemRecebidoFormCard({
  indice,
  clientKey,
  descricaoField,
  erroDescricao,
  erroServicos,
  servicos,
  catalogo,
  onAdicionarServico,
  onAtualizarValorServico,
  onRemoverServico,
  onFotoChange,
  statusUpload,
  erroUpload,
  onRemoverItem,
  podeRemover,
  bloqueado,
}: Props) {
  const foto = useFotoOtimizada();
  const fotoInputRef = useRef<HTMLInputElement>(null);
  const fotoProcessando = foto.estado === "processando";
  const subtotal = calcularSubtotalItem({ servicos });
  const idBase = `item-${clientKey}`;

  useEffect(() => {
    onFotoChange(clientKey, { arquivo: foto.arquivo, processando: fotoProcessando });
  }, [clientKey, foto.arquivo, fotoProcessando, onFotoChange]);

  const selecionarFoto = (arquivo: File | null) => {
    void foto.selecionar(arquivo).then((ok) => {
      // Após erro, limpa o input para permitir escolher o mesmo arquivo de novo.
      if (!ok && fotoInputRef.current) fotoInputRef.current.value = "";
    });
  };

  const limparFoto = () => {
    foto.limpar();
    if (fotoInputRef.current) fotoInputRef.current.value = "";
  };

  return (
    <div
      data-testid={`item-recebido-${indice}`}
      className="grid gap-4 rounded-2xl border border-[color:var(--border)] bg-white p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-semibold text-[color:var(--text)]">Item {indice + 1}</h4>
        {podeRemover ? (
          <button
            type="button"
            onClick={onRemoverItem}
            disabled={bloqueado}
            className="text-xs font-semibold text-slate-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Remover item
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid content-start gap-2">
          <Label htmlFor={`${idBase}-descricao`} className="sr-only">
            Descrição do item {indice + 1}
          </Label>
          <Input
            id={`${idBase}-descricao`}
            {...descricaoField}
            placeholder="Ex.: tênis preto"
            disabled={bloqueado}
          />
          {erroDescricao ? <p role="alert" className="text-sm text-red-600">{erroDescricao}</p> : null}
        </div>

        <div className="grid content-start gap-2">
          {/* Input real fica visualmente oculto; o label estilizado é a área de toque. */}
          <input
            id={`${idBase}-foto`}
            ref={fotoInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            disabled={bloqueado}
            onChange={(event) => selecionarFoto(event.target.files?.[0] ?? null)}
            className="peer sr-only"
          />
          <label
            htmlFor={`${idBase}-foto`}
            className={`relative flex min-h-[3.25rem] w-full cursor-pointer items-center gap-3 overflow-hidden rounded-2xl border border-dashed transition peer-focus-visible:ring-2 peer-focus-visible:ring-[color:var(--accent-soft)] peer-disabled:cursor-not-allowed peer-disabled:opacity-60 ${
              foto.preview
                ? "border-[color:var(--accent-soft)] bg-white p-2"
                : "border-black/15 bg-white px-4 py-3 hover:border-[color:var(--accent)] hover:bg-[color:var(--accent-tint)]"
            }`}
          >
            {foto.preview ? (
              <>
                <span className="relative block h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-slate-50">
                  <Image src={foto.preview} alt={`Prévia da foto do item ${indice + 1}`} fill unoptimized className="object-cover" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[color:var(--text)]">Foto selecionada</span>
                  <span className="block text-xs text-[color:var(--accent-strong)]">Toque para trocar</span>
                </span>
              </>
            ) : (
              <>
                <svg
                  className="h-6 w-6 shrink-0 text-[color:var(--accent-strong)]"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M4 8.5A2.5 2.5 0 0 1 6.5 6h1.2l1.1-1.6a1.5 1.5 0 0 1 1.2-.6h4a1.5 1.5 0 0 1 1.2.6L16.3 6h1.2A2.5 2.5 0 0 1 20 8.5V17a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17z" />
                  <circle cx="12" cy="12.5" r="3.5" />
                </svg>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium text-[color:var(--text)]">Foto do item (opcional)</span>
                  <span className="block text-xs text-slate-500">Tirar foto ou escolher da galeria</span>
                </span>
              </>
            )}
          </label>
          {foto.preview ? (
            <button
              type="button"
              onClick={limparFoto}
              disabled={bloqueado}
              className="justify-self-start text-xs font-semibold text-slate-500 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Remover foto
            </button>
          ) : null}
          {fotoProcessando ? <p role="status" className="text-sm text-slate-600">Otimizando foto…</p> : null}
          {foto.erro ? <p role="alert" className="text-sm text-red-600">{foto.erro}</p> : null}
          {foto.resultado ? <FotoOtimizadaResumo resultado={foto.resultado} /> : null}
          {statusUpload === "enviada" ? (
            <p role="status" className="text-sm text-emerald-700">Foto salva na OS.</p>
          ) : null}
          {statusUpload === "erro" ? (
            <p role="alert" className="text-sm text-red-600">{erroUpload ?? "Não foi possível salvar a foto deste item."}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3">
        <Label htmlFor={`${idBase}-servico`} className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-500">
          Serviços
        </Label>
        {bloqueado ? null : (
          <Combobox
            id={`${idBase}-servico`}
            options={catalogo.map((servico) => ({ value: servico.id, label: servico.nome }))}
            value=""
            onChange={onAdicionarServico}
            placeholder="Adicionar serviço..."
            emptyText="Serviço não encontrado"
          />
        )}
        {erroServicos ? <p role="alert" className="text-sm text-red-600">{erroServicos}</p> : null}
        {servicos.length > 0 ? (
          <div className="space-y-2">
            {servicos.map((item) => {
              const servico = catalogo.find((option) => option.id === item.servicoId);
              return (
                <div
                  key={item.servicoId}
                  className="grid gap-2 rounded-xl border border-slate-200 bg-slate-50 p-3 sm:grid-cols-[1fr_10rem_auto] sm:items-center"
                >
                  <p className="text-sm font-medium text-slate-700">{servico?.nome || "Serviço"}</p>
                  <Input
                    aria-label={`Valor de ${servico?.nome || "serviço"} no item ${indice + 1}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.valor}
                    disabled={bloqueado}
                    onChange={(event) => onAtualizarValorServico(item.servicoId, event.target.value)}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    disabled={bloqueado}
                    onClick={() => onRemoverServico(item.servicoId)}
                  >
                    Remover
                  </Button>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-slate-500">
            Nenhum serviço selecionado. O item poderá ser detalhado depois.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[color:var(--border)] pt-3 text-sm">
        <span className="text-slate-600">Subtotal do item</span>
        <span className="font-semibold text-[color:var(--accent-strong)]">{formatCurrency(subtotal)}</span>
      </div>
    </div>
  );
}
