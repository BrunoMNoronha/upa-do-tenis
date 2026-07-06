"use client";

import { useEffect, useState } from "react";
import { Badge, Card, SectionTitle, LoadingState, ErrorState } from "@/components/ui";

type FormaPagamento = { id: string; nome: string };

type Movimentacao = {
  id: string;
  tipo: "ENTRADA" | "SAIDA" | "SANGRIA" | "REFORCO";
  origem: string;
  valor: number;
  descricao: string;
  formaPagamento?: FormaPagamento | null;
  criadoEm: string;
  ordemServicoId?: string | null;
};

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
  id: string;
  dataAbertura: string;
  dataFechamento?: string | null;
  saldoInicial: number;
  saldoFinalInformado?: number | null;
  saldoFinalCalculado?: number | null;
  divergencia?: number | null;
  observacao?: string | null;
  status: string;
  movimentacoes: Movimentacao[];
  totais: TotaisCaixa;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

function LinhaResumo({ label, valor, highlight }: { label: string; valor: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/5 py-2 text-sm last:border-b-0">
      <span className="text-slate-600">{label}</span>
      <strong className={highlight ? "text-rose-600" : "text-[color:var(--text)]"}>{currencyFormatter.format(Number(valor || 0))}</strong>
    </div>
  );
}

export function CaixaDetalheClient({ caixaId }: { caixaId: string }) {
  const [estado, setEstado] = useState<"carregando" | "erro" | "sucesso">("carregando");
  const [erro, setErro] = useState<string | null>(null);
  const [caixa, setCaixa] = useState<Caixa | null>(null);

  useEffect(() => {
    async function fetchCaixa() {
      try {
        const response = await fetch(`/api/caixa/${caixaId}`);
        if (!response.ok) {
          if (response.status === 404) throw new Error("Caixa não encontrado.");
          throw new Error("Falha ao carregar detalhes.");
        }
        const data = await response.json();
        setCaixa(data);
        setEstado("sucesso");
      } catch (e: any) {
        setErro(e.message);
        setEstado("erro");
      }
    }
    void fetchCaixa();
  }, [caixaId]);

  if (estado === "carregando") return <LoadingState text="Carregando detalhes..." />;
  if (estado === "erro") return <ErrorState title="Erro" description={erro || ""} />;
  if (!caixa) return null;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <SectionTitle>Informações do Caixa</SectionTitle>
            <Badge tone={caixa.status === "ABERTO" ? "success" : "neutral"}>{caixa.status}</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Abertura</p>
              <p className="font-semibold">{dateFormatter.format(new Date(caixa.dataAbertura))}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Fechamento</p>
              <p className="font-semibold">{caixa.dataFechamento ? dateFormatter.format(new Date(caixa.dataFechamento)) : "-"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Observações do dia</p>
              <p className="font-semibold">{caixa.observacao || "-"}</p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle className="mb-4">Movimentações</SectionTitle>
          {caixa.movimentacoes.length === 0 ? (
            <p className="text-sm text-slate-600">Nenhuma movimentação registrada.</p>
          ) : (
            <div className="space-y-3">
              {caixa.movimentacoes.map(mov => (
                <div key={mov.id} className="flex justify-between items-center p-3 border rounded-lg hover:bg-slate-50">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge tone={mov.tipo === "ENTRADA" || mov.tipo === "REFORCO" ? "success" : "danger"}>{mov.tipo}</Badge>
                      <span className="font-medium text-sm">{mov.descricao}</span>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      {dateFormatter.format(new Date(mov.criadoEm))} • {mov.origem}
                      {mov.formaPagamento ? ` • ${mov.formaPagamento.nome}` : ""}
                      {mov.ordemServicoId ? ` • OS Vínculada` : ""}
                    </p>
                  </div>
                  <div className={`font-semibold ${mov.tipo === "ENTRADA" || mov.tipo === "REFORCO" ? "text-emerald-600" : "text-rose-600"}`}>
                    {mov.tipo === "ENTRADA" || mov.tipo === "REFORCO" ? "+" : "-"}{currencyFormatter.format(mov.valor)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <aside className="space-y-6">
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
            <div className="flex justify-between font-bold text-lg mb-2">
              <span>Dinheiro Esperado (Saldo Físico Calculado)</span>
              <span className="text-[color:var(--text)]">{currencyFormatter.format(caixa.totais.saldoFisicoCalculado)}</span>
            </div>
            {caixa.status === "FECHADO" && (
              <>
                <div className="flex justify-between font-bold text-lg mb-2 text-slate-600">
                  <span>Dinheiro Informado no Fechamento</span>
                  <span>{currencyFormatter.format(caixa.saldoFinalInformado || 0)}</span>
                </div>
                <div className={`flex justify-between font-bold text-lg p-2 rounded-lg ${Number(caixa.divergencia) < 0 ? "bg-rose-100 text-rose-800" : Number(caixa.divergencia) > 0 ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-800"}`}>
                  <span>Divergência</span>
                  <span>{currencyFormatter.format(caixa.divergencia || 0)}</span>
                </div>
              </>
            )}
          </div>
          <p className="mt-3 text-xs text-slate-500">
            Divergência calculada apenas sobre dinheiro físico.
          </p>
        </Card>

        <Card className="p-6 bg-slate-50 border-l-4 border-l-[color:var(--accent)]">
          <SectionTitle className="mb-4 text-[color:var(--accent)]">Total Recebido no Dia</SectionTitle>
          <div className="space-y-2 mb-4">
            {Object.keys(caixa.totais.totaisPorFormaPagamento).length === 0 ? (
              <p className="text-sm text-slate-500">Nenhum recebimento registrado neste caixa.</p>
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
      </aside>
    </div>
  );
}
