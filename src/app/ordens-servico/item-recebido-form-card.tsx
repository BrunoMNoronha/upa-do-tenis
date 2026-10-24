"use client";

import { useEffect, useId, useRef } from "react";
import Image from "next/image";
import type { UseFormRegisterReturn } from "react-hook-form";

import { Input, Label } from "@/components/ui";
import { IconeLixeira } from "@/components/icones";
import { Combobox } from "@/components/combobox";
import { FotoOtimizadaResumo } from "@/components/foto-otimizada-resumo";
import { useFotosOtimizadas } from "@/components/use-fotos-otimizadas";
import { formatCurrency } from "@/lib/formatters";
import { calcularSubtotalItem, type ServicoDoItem } from "@/lib/ordens-servico-itens";

export type ServicoCatalogo = { id: string; nome: string; precoBase: unknown };

export type EstadoFotoItem = {
  fotos: Array<{ chaveIdempotencia: string; arquivo: File }>;
  processando: boolean;
};

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
  const fotos = useFotosOtimizadas();
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galeriaInputRef = useRef<HTMLInputElement>(null);
  const fotoProcessando = fotos.processando;
  const subtotal = calcularSubtotalItem({ servicos });
  // Ids do DOM vêm de useId, estável entre SSR e hidratação. A clientKey é
  // gerada no navegador e mudaria entre os dois renders quando o drawer já
  // abre na primeira carga (?nova=1), o que causaria erro de hidratação.
  const idBase = `item-${useId()}`;

  useEffect(() => {
    onFotoChange(clientKey, {
      fotos: fotos.fotos.map((foto) => ({ chaveIdempotencia: foto.chaveIdempotencia, arquivo: foto.arquivo })),
      processando: fotoProcessando,
    });
  }, [clientKey, fotos.fotos, fotoProcessando, onFotoChange]);

  const selecionarFotos = (arquivos: File[], input: HTMLInputElement | null) => {
    void fotos.selecionar(arquivos).then(() => {
      if (input) input.value = "";
    });
  };

  return (
    <div
      data-testid={`item-recebido-${indice}`}
      className="grid gap-4 rounded-2xl border border-[color:var(--border)] bg-white p-4"
    >
      <div className="flex items-center justify-between gap-3">
        <h4 className="text-sm font-extrabold text-[color:var(--text)]">Item {indice + 1}</h4>
        {podeRemover ? (
          <button
            type="button"
            onClick={onRemoverItem}
            disabled={bloqueado}
            aria-label={`Remover item ${indice + 1}`}
            className="min-h-[44px] rounded-full px-3 text-xs font-bold text-[color:var(--danger)] hover:bg-[color:var(--danger-soft)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            Remover item
          </button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="grid content-start gap-2">
          <Label htmlFor={`${idBase}-descricao`} obrigatorio>
            Descrição do item
          </Label>
          <Input
            id={`${idBase}-descricao`}
            {...descricaoField}
            placeholder="Ex.: tênis branco Nike Air"
            disabled={bloqueado}
            aria-invalid={Boolean(erroDescricao)}
            aria-describedby={erroDescricao ? `${idBase}-erro-descricao` : undefined}
          />
          {erroDescricao ? <p id={`${idBase}-erro-descricao`} role="alert" className="text-xs font-semibold text-[color:var(--danger)]">{erroDescricao}</p> : null}
          <p className="text-xs text-[color:var(--text-soft)]">Marca, cor e detalhes que identifiquem o par no balcão.</p>
        </div>

        <div className="grid content-start gap-2">
          <input
            id={`${idBase}-camera`}
            ref={cameraInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            capture="environment"
            disabled={bloqueado || fotoProcessando || fotos.fotos.length >= fotos.limite}
            onChange={(event) => selecionarFotos(Array.from(event.target.files ?? []), event.currentTarget)}
            className="sr-only"
          />
          <input
            id={`${idBase}-galeria`}
            ref={galeriaInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={bloqueado || fotoProcessando || fotos.fotos.length >= fotos.limite}
            onChange={(event) => selecionarFotos(Array.from(event.target.files ?? []), event.currentTarget)}
            className="sr-only"
          />
          <p className="text-xs font-bold text-[color:var(--text-body)]">Foto do item</p>
          <div className="flex flex-wrap gap-2">
            <label htmlFor={`${idBase}-camera`} className="inline-flex min-h-[44px] cursor-pointer items-center rounded-xl border border-dashed border-[rgba(74,53,35,0.35)] bg-[color:var(--background)] px-3 text-[13px] font-semibold text-[color:var(--accent-strong)] hover:bg-[color:var(--accent-tint)]">
              Tirar foto
            </label>
            <label htmlFor={`${idBase}-galeria`} className="inline-flex min-h-[44px] cursor-pointer items-center rounded-xl border border-dashed border-[rgba(74,53,35,0.35)] bg-[color:var(--background)] px-3 text-[13px] font-semibold text-[color:var(--accent-strong)] hover:bg-[color:var(--accent-tint)]">
              Escolher da galeria
            </label>
            <span className="self-center text-xs text-slate-500">{fotos.fotos.length} de {fotos.limite} fotos</span>
          </div>
          {fotos.fotos.length > 0 ? (
            <ul className="grid grid-cols-2 gap-2 sm:grid-cols-3" aria-label={`Fotos selecionadas do item ${indice + 1}`}>
              {fotos.fotos.map((foto, fotoIndice) => (
                <li key={foto.chaveIdempotencia} className="rounded-xl border border-black/10 bg-white p-2">
                  <div className="relative aspect-square overflow-hidden rounded-lg bg-slate-50">
                    <Image src={foto.preview} alt={`Prévia ${fotoIndice + 1} do item ${indice + 1}`} fill unoptimized className="object-cover" />
                  </div>
                  <button type="button" onClick={() => fotos.remover(foto.chaveIdempotencia)} disabled={bloqueado} className="mt-2 text-xs font-semibold text-rose-700 disabled:opacity-60">
                    Remover
                  </button>
                  <FotoOtimizadaResumo resultado={foto.resultado} />
                </li>
              ))}
            </ul>
          ) : <p className="text-xs text-slate-500">Nenhuma foto selecionada.</p>}
          {fotoProcessando ? <p role="status" className="text-sm text-slate-600">Otimizando foto…</p> : null}
          {fotos.erro ? <p role="alert" className="text-sm text-red-600">{fotos.erro}</p> : null}
          {statusUpload === "enviada" ? (
            <p role="status" className="text-sm text-emerald-700">Fotos salvas na OS.</p>
          ) : null}
          {statusUpload === "erro" ? (
            <p role="alert" className="text-sm text-red-600">{erroUpload ?? "Não foi possível salvar a foto deste item."}</p>
          ) : null}
        </div>
      </div>

      <div className="grid gap-3">
        <Label htmlFor={`${idBase}-servico`}>Serviços</Label>
        {bloqueado ? null : (
          <Combobox
            id={`${idBase}-servico`}
            options={catalogo.map((servico) => ({ value: servico.id, label: servico.nome }))}
            value=""
            onChange={onAdicionarServico}
            placeholder="Adicionar serviço..."
            emptyText="Serviço não encontrado"
            aria-invalid={Boolean(erroServicos)}
            aria-describedby={erroServicos ? `${idBase}-erro-servicos` : undefined}
          />
        )}
        {erroServicos ? <p id={`${idBase}-erro-servicos`} role="alert" className="text-sm text-red-600">{erroServicos}</p> : null}
        {servicos.length > 0 ? (
          <div className="space-y-2">
            {servicos.map((item) => {
              const servico = catalogo.find((option) => option.id === item.servicoId);
              return (
                <div
                  key={item.servicoId}
                  className="grid grid-cols-[1fr_auto] gap-2 rounded-xl border border-[color:var(--border)] px-3.5 py-2.5 sm:grid-cols-[1fr_140px_40px] sm:items-center"
                >
                  <div className="col-span-2 min-w-0 sm:col-span-1">
                    <p className="truncate text-sm font-bold text-[color:var(--text)]">{servico?.nome || "Serviço"}</p>
                    {servico ? (
                      <p className="text-xs text-[color:var(--text-soft)]">Preço base {formatCurrency(Number(servico.precoBase))}</p>
                    ) : null}
                  </div>
                  <Input
                    aria-label={`Valor de ${servico?.nome || "serviço"} no item ${indice + 1}`}
                    type="number"
                    min="0"
                    step="0.01"
                    value={item.valor}
                    disabled={bloqueado}
                    onChange={(event) => onAtualizarValorServico(item.servicoId, event.target.value)}
                    className="bg-[color:var(--background)] text-right"
                  />
                  <button
                    type="button"
                    disabled={bloqueado}
                    onClick={() => onRemoverServico(item.servicoId)}
                    aria-label={`Remover ${servico?.nome || "serviço"} do item ${indice + 1}`}
                    title="Remover serviço"
                    className="inline-flex h-11 w-10 items-center justify-center rounded-[10px] text-[color:var(--muted)] transition hover:bg-[color:var(--danger-soft)] hover:text-[color:var(--danger)] disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    <IconeLixeira />
                  </button>
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
        <span className="text-[color:var(--text-soft)]">Subtotal do item</span>
        <span className="font-bold text-[color:var(--accent-strong)]">{formatCurrency(subtotal)}</span>
      </div>
    </div>
  );
}
