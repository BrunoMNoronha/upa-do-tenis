'use client';

import React from 'react';
import { Card } from '@/components/ui';
import { formatCurrency } from '@/lib/formatters';
import type { ContagemPorStatus, RelatorioFinanceiroOSAgregados } from '@/lib/relatorio-financeiro-os-agregacoes';

/**
 * Gráficos do Relatório Financeiro de OS.
 *
 * Componentes puramente visuais: recebem agregados já calculados pelo backend
 * (mesma regra financeira do resumo e da tabela) e NÃO recalculam total, pago,
 * saldo ou status. Implementados em SVG/CSS, sem dependência externa.
 */

// Paleta categórica validada (scripts/validate_palette.js, surface #fffaf5).
const COR_STATUS_FINANCEIRO: Record<string, string> = {
  PENDENTE: '#eb6834',
  PARCIAL: '#eda100',
  PAGO: '#1baf7a',
  CANCELADO: '#4a3aa7',
};

const COR_STATUS_OPERACIONAL: Record<string, string> = {
  ABERTA: '#2a78d6',
  EM_ANDAMENTO: '#eda100',
  CONCLUIDA: '#1baf7a',
  ENTREGUE: '#4a3aa7',
  CANCELADA: '#eb6834',
};

const COR_PAGO = '#1baf7a';
const COR_SALDO = '#eb6834';
const COR_NEUTRA = '#94a3b8';

const ROTULO_STATUS: Record<string, string> = {
  PENDENTE: 'Pendente',
  PARCIAL: 'Parcial',
  PAGO: 'Pago',
  CANCELADO: 'Cancelado',
  ABERTA: 'Aberta',
  EM_ANDAMENTO: 'Em andamento',
  CONCLUIDA: 'Concluída',
  ENTREGUE: 'Entregue',
  CANCELADA: 'Cancelada',
};

function rotulo(status: string): string {
  return ROTULO_STATUS[status] ?? status;
}

function percentual(parte: number, total: number): string {
  if (total <= 0) return '0%';
  return `${Math.round((parte / total) * 1000) / 10}%`;
}

interface GraficoCardProps {
  titulo: string;
  descricao: string;
  children: React.ReactNode;
}

function GraficoCard({ titulo, descricao, children }: GraficoCardProps) {
  return (
    <Card className="flex h-full flex-col p-6">
      <div className="border-b border-black/10 pb-4">
        <h3 className="text-base font-semibold tracking-tight text-[color:var(--text)]">{titulo}</h3>
        <p className="mt-1 text-xs text-slate-500">{descricao}</p>
      </div>
      <div className="mt-4 flex-1">{children}</div>
    </Card>
  );
}

function SemDados() {
  return (
    <div className="flex h-full min-h-[160px] items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center text-sm text-slate-500">
      Nenhuma OS no conjunto filtrado. Ajuste os filtros para visualizar o gráfico.
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* 1. Valor Pago x Saldo em Aberto (rosca)                              */
/* ------------------------------------------------------------------ */

interface GraficoComposicaoProps {
  valorPago: number;
  saldoAberto: number;
  quantidadeOS: number;
}

export function GraficoComposicaoFinanceira({ valorPago, saldoAberto, quantidadeOS }: GraficoComposicaoProps) {
  const total = valorPago + saldoAberto;
  const semDados = quantidadeOS === 0;

  // Geometria da rosca (SVG viewBox 0 0 120 120, raio 45, traço 14).
  const raio = 45;
  const circunferencia = 2 * Math.PI * raio;
  const fracaoPago = total > 0 ? Math.max(0, valorPago) / total : 0;
  const compPago = circunferencia * fracaoPago;

  const descricaoTexto = `Valor pago ${formatCurrency(valorPago)} (${percentual(valorPago, total)}); saldo em aberto ${formatCurrency(saldoAberto)} (${percentual(saldoAberto, total)}).`;

  return (
    <GraficoCard
      titulo="Valor Pago x Saldo em Aberto"
      descricao="Composição do valor total das OS filtradas (pago + saldo)."
    >
      {semDados ? (
        <SemDados />
      ) : (
        <figure className="flex flex-col items-center gap-5" aria-label={descricaoTexto}>
          <svg viewBox="0 0 120 120" className="h-40 w-40 shrink-0" role="img" aria-hidden="true">
            <circle cx="60" cy="60" r={raio} fill="none" stroke={total > 0 ? COR_SALDO : COR_NEUTRA} strokeWidth="14" />
            {total > 0 && compPago > 0 && (
              <circle
                cx="60"
                cy="60"
                r={raio}
                fill="none"
                stroke={COR_PAGO}
                strokeWidth="14"
                strokeDasharray={`${compPago} ${circunferencia - compPago}`}
                strokeDashoffset={circunferencia / 4}
                strokeLinecap="butt"
              />
            )}
            <text x="60" y="56" textAnchor="middle" className="fill-slate-500" fontSize="9">
              Pago
            </text>
            <text x="60" y="70" textAnchor="middle" className="fill-slate-900" fontSize="12" fontWeight="600">
              {percentual(valorPago, total)}
            </text>
          </svg>
          <figcaption className="w-full">
            <ul className="space-y-3 text-sm">
              <li className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: COR_PAGO }} aria-hidden="true" />
                  Valor Pago
                </span>
                <span className="whitespace-nowrap font-semibold text-[color:var(--text)]">
                  {formatCurrency(valorPago)}
                  <span className="ml-1 text-xs font-normal text-slate-500">({percentual(valorPago, total)})</span>
                </span>
              </li>
              <li className="flex items-center justify-between gap-4">
                <span className="flex items-center gap-2 text-slate-700">
                  <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: COR_SALDO }} aria-hidden="true" />
                  Saldo em Aberto
                </span>
                <span className="whitespace-nowrap font-semibold text-[color:var(--text)]">
                  {formatCurrency(saldoAberto)}
                  <span className="ml-1 text-xs font-normal text-slate-500">({percentual(saldoAberto, total)})</span>
                </span>
              </li>
              <li className="flex items-center justify-between gap-4 border-t border-black/10 pt-2 text-xs text-slate-500">
                <span>Total representado</span>
                <span className="font-medium">{formatCurrency(total)}</span>
              </li>
            </ul>
          </figcaption>
        </figure>
      )}
    </GraficoCard>
  );
}

/* ------------------------------------------------------------------ */
/* 2 e 3. Barras horizontais por status                                */
/* ------------------------------------------------------------------ */

interface GraficoBarrasStatusProps {
  titulo: string;
  descricao: string;
  dados: ContagemPorStatus[];
  cores: Record<string, string>;
  quantidadeOS: number;
}

export function GraficoBarrasStatus({ titulo, descricao, dados, cores, quantidadeOS }: GraficoBarrasStatusProps) {
  const semDados = quantidadeOS === 0;
  const maximo = dados.reduce((acc, d) => Math.max(acc, d.quantidade), 0);
  const totalQuantidade = dados.reduce((acc, d) => acc + d.quantidade, 0);

  const descricaoTexto = dados
    .map((d) => `${rotulo(d.status)}: ${d.quantidade} OS`)
    .join('; ');

  return (
    <GraficoCard titulo={titulo} descricao={descricao}>
      {semDados ? (
        <SemDados />
      ) : (
        <figure aria-label={`${titulo}. ${descricaoTexto}.`}>
          <ul className="space-y-3" role="list">
            {dados.map((d) => {
              const largura = maximo > 0 ? (d.quantidade / maximo) * 100 : 0;
              const cor = cores[d.status] ?? COR_NEUTRA;
              return (
                <li key={d.status} className="text-sm">
                  <div className="mb-1 flex items-center justify-between gap-3">
                    <span className="flex items-center gap-2 text-slate-700">
                      <span className="inline-block h-3 w-3 rounded-sm" style={{ backgroundColor: cor }} aria-hidden="true" />
                      {rotulo(d.status)}
                    </span>
                    <span className="whitespace-nowrap font-semibold text-[color:var(--text)]">
                      {d.quantidade}
                      <span className="ml-1 text-xs font-normal text-slate-500">
                        ({percentual(d.quantidade, totalQuantidade)})
                      </span>
                    </span>
                  </div>
                  <div
                    className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"
                    role="progressbar"
                    aria-label={`${rotulo(d.status)}: ${d.quantidade} de ${totalQuantidade} OS`}
                    aria-valuemin={0}
                    aria-valuemax={totalQuantidade}
                    aria-valuenow={d.quantidade}
                  >
                    <div
                      className="h-full rounded-full transition-[width] duration-300"
                      style={{ width: `${largura}%`, backgroundColor: cor }}
                      title={`${rotulo(d.status)}: ${d.quantidade} OS · ${formatCurrency(d.valorTotal)}`}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </figure>
      )}
    </GraficoCard>
  );
}

/* ------------------------------------------------------------------ */
/* Área de gráficos                                                    */
/* ------------------------------------------------------------------ */

interface RelatorioFinanceiroOSGraficosProps {
  agregados: RelatorioFinanceiroOSAgregados;
  quantidadeOS: number;
  /** true enquanto uma nova consulta está em andamento (dados exibidos são do filtro anterior). */
  atualizando?: boolean;
}

export function RelatorioFinanceiroOSGraficos({ agregados, quantidadeOS, atualizando = false }: RelatorioFinanceiroOSGraficosProps) {
  return (
    <section
      aria-label="Gráficos do relatório financeiro de OS"
      aria-busy={atualizando}
      className={`relative transition-opacity ${atualizando ? 'pointer-events-none opacity-50' : ''}`}
    >
      {atualizando && (
        <div className="absolute inset-x-0 top-0 z-10 flex justify-center">
          <span className="rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-slate-600 shadow">
            Atualizando gráficos...
          </span>
        </div>
      )}
      <div className="grid gap-4 lg:grid-cols-3">
        <GraficoComposicaoFinanceira
          valorPago={agregados.composicaoFinanceira.valorPago}
          saldoAberto={agregados.composicaoFinanceira.saldoAberto}
          quantidadeOS={quantidadeOS}
        />
        <GraficoBarrasStatus
          titulo="OS por Status Financeiro"
          descricao="Quantidade de OS filtradas por situação financeira."
          dados={agregados.porStatusFinanceiro}
          cores={COR_STATUS_FINANCEIRO}
          quantidadeOS={quantidadeOS}
        />
        <GraficoBarrasStatus
          titulo="OS por Status Operacional"
          descricao="Quantidade de OS filtradas por status operacional."
          dados={agregados.porStatusOperacional}
          cores={COR_STATUS_OPERACIONAL}
          quantidadeOS={quantidadeOS}
        />
      </div>
    </section>
  );
}
