"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, SectionTitle, LoadingState, ErrorState } from "@/components/ui";
import { sanitizeCurrency } from "@/lib/sanitizers";
import type { AlertaCaixa } from "@/lib/caixa-alerta";
import { FUSO_OPERACIONAL } from "@/lib/date-range";
import { enviarFechamentoCaixa } from "@/lib/caixa-fechamento-client";

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
  atendimentoRapidoId?: string | null;
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
  timeZone: FUSO_OPERACIONAL,
  dateStyle: "short",
  timeStyle: "short",
});

export function CaixaClient({ formasPagamento }: { formasPagamento: FormaPagamento[] }) {
  const router = useRouter();
  const [estado, setEstado] = useState<"carregando" | "erro" | "sucesso">("carregando");
  const [erro, setErro] = useState<string | null>(null);
  const [caixa, setCaixa] = useState<Caixa | null>(null);
  const [alertaCaixa, setAlertaCaixa] = useState<AlertaCaixa | null>(null);
  const caixaExibidoId = useRef<string | null>(null);
  const leituraVersao = useRef(0);

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
    const versao = ++leituraVersao.current;
    setEstado("carregando");
    try {
      const response = await fetch("/api/caixa/atual", { cache: "no-store" });
      if (!response.ok) {
        throw new Error("Falha ao carregar caixa atual.");
      }
      const data = await response.json();
      if (versao !== leituraVersao.current) return;
      if (caixaExibidoId.current !== (data.caixa?.id ?? null)) {
        // Uma conferência pertence ao caixa exibido, não ao próximo aberto.
        setFecharForm({ saldoFinalInformado: "", observacao: "" });
        setFecharFormVisible(false);
        setMovimentacaoForm({ tipo: "SAIDA", valor: "", descricao: "", formaPagamentoId: "" });
        setMovFormVisible(false);
      }
      caixaExibidoId.current = data.caixa?.id ?? null;
      setCaixa(data.caixa);
      setAlertaCaixa(data.alerta);
      if (data.alerta.estado === "FECHAMENTO_PENDENTE") {
        setFecharFormVisible(true);
      }
      setErro(null);
      setEstado("sucesso");
    } catch (e: any) {
      if (versao !== leituraVersao.current) return;
      setErro(e.message);
      setEstado("erro");
    }
  }, []);

  useEffect(() => {
    void carregarCaixa();
    // Reconsulta ao retornar à aba, inclusive se outra sessão fechou o caixa.
    const aoRetornar = () => {
      if (document.visibilityState === "visible") void carregarCaixa();
    };
    document.addEventListener("visibilitychange", aoRetornar);
    return () => {
      leituraVersao.current += 1;
      document.removeEventListener("visibilitychange", aoRetornar);
    };
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
      await enviarFechamentoCaixa(caixa.id, {
        saldoFinalInformado: valor,
        observacao: fecharForm.observacao,
      });
      setFecharForm({ saldoFinalInformado: "", observacao: "" });
      setFecharFormVisible(false);
      await carregarCaixa();
      router.refresh();
    } catch (e: any) {
      alert(e.message);
      await carregarCaixa();
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

  const fechamentoPendente = alertaCaixa?.estado === "FECHAMENTO_PENDENTE";

  return (
    <div className="grid min-w-0 grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_350px]">
      {fechamentoPendente ? (
        <div role="alert" className="order-first rounded-xl border border-rose-200 bg-rose-50 p-4 text-rose-900 lg:col-span-2">
          <h2 className="font-semibold">Fechamento de caixa pendente</h2>
          <p className="mt-1 text-sm">
            Há um caixa aberto desde {alertaCaixa.dataAbertura} às {alertaCaixa.horaAbertura}.
            {" "}Confira os valores e confirme o fechamento para continuar.
          </p>
        </div>
      ) : null}
      <div className="min-w-0 space-y-6">
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

      <aside className={fechamentoPendente ? "order-first flex flex-col gap-6 lg:order-none" : "flex flex-col gap-6"}>
        <div className={fechamentoPendente ? "order-last" : ""}>
          <ResumoCaixa caixa={caixa} />
        </div>

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
