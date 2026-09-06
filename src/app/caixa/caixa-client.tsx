"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, SectionTitle, LoadingState, ErrorState } from "@/components/ui";
import { sanitizeCurrency } from "@/lib/sanitizers";

import { NenhumCaixaAberto } from "./components/nenhum-caixa-aberto";
import { MovimentacoesCaixa } from "./components/movimentacoes-caixa";
import { ResumoCaixa } from "./components/resumo-caixa";
import { FecharCaixa } from "./components/fechar-caixa";

type FormaPagamento = {
  id: string;
  nome: string;
  tipo?: string | null;
};

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
  saldoInicial: number;
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

export function CaixaClient({ formasPagamento }: { formasPagamento: FormaPagamento[] }) {
  const [estado, setEstado] = useState<"carregando" | "erro" | "sucesso">("carregando");
  const [erro, setErro] = useState<string | null>(null);
  const [caixa, setCaixa] = useState<Caixa | null>(null);

  // Forms state
  const [saldoInicial, setSaldoInicial] = useState("");
  const [abrirLoading, setAbrirLoading] = useState(false);

  const [movimentacaoForm, setMovimentacaoForm] = useState({
    tipo: "SAIDA",
    valor: "",
    descricao: "",
    formaPagamentoId: "",
  });
  const [movLoading, setMovLoading] = useState(false);
  const [movFormVisible, setMovFormVisible] = useState(false);

  const [fecharForm, setFecharForm] = useState({
    saldoFinalInformado: "",
    observacao: "",
  });
  const [fecharLoading, setFecharLoading] = useState(false);
  const [fecharFormVisible, setFecharFormVisible] = useState(false);

  const carregarCaixa = useCallback(async () => {
    try {
      const response = await fetch("/api/caixa/atual");
      if (!response.ok) {
        throw new Error("Falha ao carregar caixa atual.");
      }
      const data = await response.json();
      setCaixa(data.caixa);
      setEstado("sucesso");
    } catch (e: any) {
      setErro(e.message);
      setEstado("erro");
    }
  }, []);

  useEffect(() => {
    void carregarCaixa();
  }, [carregarCaixa]);

  const handleAbrirCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    setAbrirLoading(true);
    try {
      const valor = sanitizeCurrency(saldoInicial);
      const res = await fetch("/api/caixa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saldoInicial: valor }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao abrir caixa");
      }
      setSaldoInicial("");
      await carregarCaixa();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setAbrirLoading(false);
    }
  };

  const handleMovimentacao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caixa) return;
    setMovLoading(true);
    try {
      const valor = sanitizeCurrency(movimentacaoForm.valor);
      const res = await fetch(`/api/caixa/${caixa.id}/movimentacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tipo: movimentacaoForm.tipo,
          valor,
          descricao: movimentacaoForm.descricao,
          formaPagamentoId: movimentacaoForm.formaPagamentoId || undefined,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao registrar movimentação");
      }
      setMovimentacaoForm({ tipo: "SAIDA", valor: "", descricao: "", formaPagamentoId: "" });
      setMovFormVisible(false);
      await carregarCaixa();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setMovLoading(false);
    }
  };

  const handleFecharCaixa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!caixa) return;
    setFecharLoading(true);
    try {
      const valor = sanitizeCurrency(fecharForm.saldoFinalInformado);
      const res = await fetch(`/api/caixa/${caixa.id}/fechar`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          saldoFinalInformado: valor,
          observacao: fecharForm.observacao,
        }),
      });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Erro ao fechar caixa");
      }
      setFecharForm({ saldoFinalInformado: "", observacao: "" });
      setFecharFormVisible(false);
      await carregarCaixa();
    } catch (e: any) {
      alert(e.message);
    } finally {
      setFecharLoading(false);
    }
  };

  if (estado === "carregando") return <LoadingState text="Carregando caixa..." />;
  if (estado === "erro") return <ErrorState title="Erro" description={erro || ""} action={<Button onClick={() => void carregarCaixa()}>Tentar novamente</Button>} />;

  if (!caixa) {
    return (
      <NenhumCaixaAberto
        saldoInicial={saldoInicial}
        setSaldoInicial={setSaldoInicial}
        abrirLoading={abrirLoading}
        handleAbrirCaixa={handleAbrirCaixa}
      />
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_350px]">
      <div className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <SectionTitle>Caixa Aberto</SectionTitle>
            <Badge tone="success">Aberto</Badge>
          </div>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Abertura</p>
              <p className="font-semibold">{dateFormatter.format(new Date(caixa.dataAbertura))}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Saldo Inicial Físico</p>
              <p className="font-semibold">{currencyFormatter.format(caixa.saldoInicial)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-wider">Saldo Físico Atual</p>
              <p className="font-semibold text-emerald-700 text-xl">{currencyFormatter.format(caixa.totais.saldoFisicoCalculado)}</p>
            </div>
          </div>
        </Card>

        <MovimentacoesCaixa
          movimentacoes={caixa.movimentacoes}
          movFormVisible={movFormVisible}
          setMovFormVisible={setMovFormVisible}
          handleMovimentacao={handleMovimentacao}
          movimentacaoForm={movimentacaoForm}
          setMovimentacaoForm={setMovimentacaoForm}
          movLoading={movLoading}
          formasPagamento={formasPagamento}
        />
      </div>

      <aside className="space-y-6">
        <ResumoCaixa caixa={caixa} />

        <FecharCaixa
          caixa={caixa}
          fecharFormVisible={fecharFormVisible}
          setFecharFormVisible={setFecharFormVisible}
          handleFecharCaixa={handleFecharCaixa}
          fecharForm={fecharForm}
          setFecharForm={setFecharForm}
          fecharLoading={fecharLoading}
        />
      </aside>
    </div>
  );
}
