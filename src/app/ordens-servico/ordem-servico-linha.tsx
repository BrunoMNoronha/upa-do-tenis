"use client";

import { useState } from "react";

import { TabelaCelula, TabelaLinha } from "@/components/data-table";
import { IconeEstrela } from "@/components/icones";
import { Badge, Button } from "@/components/ui";
import type { DadosSugestaoAvaliacao } from "@/lib/os-avaliacao-whatsapp";
import type { DadosSugestaoConclusao } from "@/lib/os-conclusao-whatsapp";
import { formatCurrency, formatPhone, whatsappLink } from "@/lib/formatters";
import { resumirItensOrdem } from "@/lib/ordens-servico-itens";
import { ordemServicoEstaAtrasada } from "@/lib/ordens-servico-listagem";
import { descreverPrazo } from "@/lib/ordens-servico-prazo";
import {
  proximaAcaoStatus,
  rotuloStatusFinanceiro,
  rotuloStatusOperacional,
  tomStatusFinanceiro,
  tomStatusOperacional,
} from "@/lib/ordens-servico-status-apresentacao";
import type { OrdemServicoResumo } from "@/lib/ordens-servico";
import { useAcoesOrdemServico } from "./use-acoes-ordem-servico";

export const COLUNAS_ORDENS = "44px 1.6fr 1.7fr 0.8fr 1.2fr 1.2fr 1.5fr";

const TOM_PRAZO = {
  danger: "text-[color:var(--danger)]",
  warning: "text-[color:var(--warning)]",
  success: "text-[color:var(--success)]",
  neutral: "text-[color:var(--text-soft)]",
} as const;

const dataHoraFormatter = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" });

function corSaldo(ordem: OrdemServicoResumo) {
  if (Number(ordem.saldo) <= 0) return "text-[color:var(--success)]";
  if (ordem.statusFinanceiro === "PENDENTE") return "text-[color:var(--danger)]";
  return "text-[color:var(--warning)]";
}

type OrdemServicoLinhaProps = {
  ordem: OrdemServicoResumo;
  nomeExibicaoEmpresa: string;
  onConcluida: (dados: DadosSugestaoConclusao) => void;
  onEntregue: (dados: DadosSugestaoAvaliacao) => void;
};

/** Uma OS na tabela da listagem; empilha os campos abaixo de `lg`. */
export function OrdemServicoLinha({ ordem, nomeExibicaoEmpresa, onConcluida, onEntregue }: OrdemServicoLinhaProps) {
  const [mostrarHistorico, setMostrarHistorico] = useState(false);
  const acoes = useAcoesOrdemServico(ordem, { nomeExibicaoEmpresa, onConcluida, onEntregue });
  const resumoItens = resumirItensOrdem(ordem.itens);
  const prazo = descreverPrazo(ordem);
  const atrasada = ordemServicoEstaAtrasada(ordem);
  const cancelada = ordem.status === "CANCELADA";
  const proxima = proximaAcaoStatus(ordem.status);
  const telefone = ordem.cliente?.telefone;
  const linkWhatsapp = telefone ? whatsappLink(telefone) : "";
  const historico = ordem.historicosStatus ?? [];
  const idHistorico = `historico-${ordem.id}`;

  return (
    <TabelaLinha colunas={COLUNAS_ORDENS} destaque={acoes.isFavorita} inativa={cancelada}>
      <TabelaCelula>
        <button
          type="button"
          onClick={acoes.alternarFavorita}
          disabled={acoes.favoritaPending || acoes.isPending}
          aria-pressed={acoes.isFavorita}
          aria-busy={acoes.favoritaPending}
          aria-label={acoes.isFavorita ? `Remover OS ${ordem.numero} dos favoritos` : `Favoritar OS ${ordem.numero}`}
          title={acoes.isFavorita ? "Remover dos favoritos" : "Favoritar ordem de serviço"}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-[10px] transition hover:bg-[color:var(--surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60 ${
            acoes.isFavorita ? "text-[color:var(--warning)]" : "text-[color:var(--muted)] hover:text-[color:var(--warning)]"
          }`}
        >
          <IconeEstrela className="h-[18px] w-[18px]" preenchida={acoes.isFavorita} />
        </button>
      </TabelaCelula>

      <TabelaCelula rotulo="OS / Cliente">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.12em] text-[color:var(--accent-strong)]">{ordem.numero}</p>
        <p className="truncate text-sm font-bold text-[color:var(--text)]">{ordem.cliente?.nome}</p>
        {telefone ? (
          linkWhatsapp ? (
            <a
              href={linkWhatsapp}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-semibold text-[color:var(--success)] hover:underline"
            >
              {formatPhone(telefone)} · WhatsApp
            </a>
          ) : (
            <p className="text-xs text-[color:var(--text-soft)]">{formatPhone(telefone)}</p>
          )
        ) : (
          <p className="text-xs text-[color:var(--muted)]">Sem telefone</p>
        )}
      </TabelaCelula>

      <TabelaCelula rotulo="Item e serviços">
        <p className="truncate text-[13px] font-semibold text-[color:var(--text)]" title={resumoItens.itens}>{resumoItens.itens}</p>
        <p className="truncate text-xs text-[color:var(--text-soft)]" title={ordem.observacoes ?? resumoItens.servicos}>
          {resumoItens.servicos}
        </p>
      </TabelaCelula>

      <TabelaCelula rotulo="Prazo">
        <p className="text-[13px] font-bold text-[color:var(--text)]">{prazo.dataCurta}</p>
        <p className={`text-xs font-semibold ${TOM_PRAZO[prazo.tom]}`}>{prazo.texto}</p>
      </TabelaCelula>

      <TabelaCelula rotulo="Total · Pago · Saldo">
        <p className="text-[13px] text-[color:var(--text)]">
          <span className="font-semibold">{formatCurrency(Number(ordem.valorTotal))}</span>
          <span className="text-[color:var(--text-soft)]"> · {formatCurrency(Number(ordem.valorPago || 0))}</span>
        </p>
        {cancelada ? (
          <p className="text-[13px] font-extrabold text-[color:var(--text-soft)]">—</p>
        ) : (
          <p className={`text-[13px] font-extrabold ${corSaldo(ordem)}`}>Saldo {formatCurrency(Number(ordem.saldo || 0))}</p>
        )}
      </TabelaCelula>

      <TabelaCelula rotulo="Status">
        <div className="flex flex-wrap gap-1">
          <Badge tone={tomStatusOperacional(ordem.status)}>{rotuloStatusOperacional(ordem.status)}</Badge>
          {cancelada ? null : <Badge tone={tomStatusFinanceiro(ordem.statusFinanceiro)}>{rotuloStatusFinanceiro(ordem.statusFinanceiro)}</Badge>}
          {atrasada ? <Badge tone="danger">Atrasada</Badge> : null}
        </div>
      </TabelaCelula>

      <TabelaCelula rotulo="Ações" alinharDireita>
        <div className="flex flex-wrap items-center gap-1.5 lg:justify-end">
          <Button href={`/ordens-servico/${ordem.id}`} variant="secondary" size="sm">
            Ver detalhe
          </Button>
          {proxima ? (
            <Button type="button" size="sm" onClick={() => acoes.avancarStatus(proxima.statusNovo)} isLoading={acoes.statusPending}>
              {proxima.rotulo}
            </Button>
          ) : null}
          {historico.length > 0 ? (
            <Button
              type="button"
              variant="text"
              size="sm"
              onClick={() => setMostrarHistorico((atual) => !atual)}
              aria-expanded={mostrarHistorico}
              aria-controls={idHistorico}
            >
              {mostrarHistorico ? "Ocultar histórico" : "Histórico"}
            </Button>
          ) : null}
        </div>
      </TabelaCelula>

      {acoes.error ? (
        <p role="alert" className="col-span-full text-sm font-semibold text-[color:var(--danger)]">
          {acoes.error}
        </p>
      ) : null}

      {mostrarHistorico ? (
        <div id={idHistorico} className="col-span-full rounded-[var(--r-field)] bg-[color:var(--background)] px-4 py-3">
          <p className="text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-soft)]">Histórico de status</p>
          <ol className="mt-2 grid gap-1.5">
            {historico.map((h) => (
              <li key={h.id} className="flex flex-wrap items-baseline gap-x-3 text-[13px]">
                <span className="whitespace-nowrap text-[color:var(--text-soft)]">{dataHoraFormatter.format(new Date(h.criadoEm))}</span>
                <span className="text-[color:var(--text-body)]">
                  {h.statusAnterior ? `${rotuloStatusOperacional(h.statusAnterior)} → ` : ""}
                  <span className="font-semibold text-[color:var(--text)]">{rotuloStatusOperacional(h.statusNovo)}</span>
                  {h.observacao ? ` · ${h.observacao}` : ""}
                </span>
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </TabelaLinha>
  );
}
