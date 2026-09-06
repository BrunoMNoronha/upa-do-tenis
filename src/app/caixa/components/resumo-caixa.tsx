"use client";

import { Card, SectionTitle } from "@/components/ui";
import { LinhaResumo } from "./linha-resumo";

type TotaisCaixa = {
  entradasFisicas: number;
  saidasFisicas: number;
  sangrias: number;
  reforcos: number;
  saldoFisicoCalculado: number;
  totalGeralRecebido: number;
  totaisPorFormaPagamento: Record<string, number>;
};

type Caixa = {
  saldoInicial: number;
  totais: TotaisCaixa;
};

type ResumoCaixaProps = {
  caixa: Caixa;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function ResumoCaixa({ caixa }: ResumoCaixaProps) {
  return (
    <>
      <Card className="p-6">
        <SectionTitle className="mb-4">Resumo Físico (Gaveta)</SectionTitle>
        <div className="space-y-1">
          <LinhaResumo label="Saldo Inicial" valor={caixa.saldoInicial} />
          <LinhaResumo label="Entradas (Dinheiro)" valor={caixa.totais.entradasFisicas} />
          <LinhaResumo label="Saídas (Dinheiro)" valor={caixa.totais.saidasFisicas} />
          <LinhaResumo label="Reforços" valor={caixa.totais.reforcos} />
          <LinhaResumo label="Sangrias" valor={caixa.totais.sangrias} />
        </div>
        <div className="mt-4 pt-4 border-t">
          <div className="flex justify-between font-bold text-lg">
            <span>Saldo Físico</span>
            <span className="text-emerald-700">{currencyFormatter.format(caixa.totais.saldoFisicoCalculado)}</span>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          Divergência calculada apenas sobre dinheiro físico.
        </p>
      </Card>

      <Card className="p-6 bg-slate-50 border-l-4 border-l-[color:var(--accent)]">
        <SectionTitle className="mb-4 text-[color:var(--accent)]">Total Recebido no Dia</SectionTitle>
        <div className="space-y-2 mb-4">
          {Object.keys(caixa.totais.totaisPorFormaPagamento).length === 0 ? (
            <p className="text-sm text-slate-500">Nenhum recebimento registrado ainda.</p>
          ) : (
            Object.entries(caixa.totais.totaisPorFormaPagamento).map(([forma, total]) => (
              <LinhaResumo key={forma} label={forma} valor={total as number} />
            ))
          )}
        </div>
        <div className="pt-2 border-t font-bold flex justify-between">
          <span>Total Geral Recebido</span>
          <span>{currencyFormatter.format(caixa.totais.totalGeralRecebido)}</span>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          PIX, cartão e outras formas são exibidos aqui apenas para conferência operacional. Total geral recebido não representa dinheiro em gaveta.
        </p>
      </Card>
    </>
  );
}
