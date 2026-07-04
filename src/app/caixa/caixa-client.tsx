"use client";

import { useCallback, useEffect, useState } from "react";
import { Badge, Button, Card, Input, Label, SectionTitle, Textarea, LoadingState, ErrorState, EmptyState } from "@/components/ui";

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

function LinhaResumo({ label, valor }: { label: string; valor: number }) {
  return (
    <div className="flex items-center justify-between gap-4 border-b border-black/5 py-2 text-sm last:border-b-0">
      <span className="text-slate-600">{label}</span>
      <strong className="text-[color:var(--text)]">{currencyFormatter.format(Number(valor || 0))}</strong>
    </div>
  );
}

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
      const valor = Number(saldoInicial.replace(",", "."));
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
      const valor = Number(movimentacaoForm.valor.replace(",", "."));
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
      const valor = Number(fecharForm.saldoFinalInformado.replace(",", "."));
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
      <Card className="max-w-md mx-auto p-6">
        <SectionTitle>Nenhum caixa aberto</SectionTitle>
        <p className="mt-2 text-sm text-slate-600 mb-6">Você precisa abrir o caixa para iniciar as operações do dia e receber pagamentos.</p>
        <form onSubmit={handleAbrirCaixa} className="grid gap-4">
          <div className="grid gap-2">
            <Label htmlFor="saldoInicial">Saldo Inicial Físico (Dinheiro em gaveta)</Label>
            <Input
              id="saldoInicial"
              type="number"
              min="0"
              step="0.01"
              value={saldoInicial}
              onChange={(e) => setSaldoInicial(e.target.value)}
              placeholder="0,00"
              required
            />
          </div>
          <Button type="submit" disabled={abrirLoading}>
            {abrirLoading ? "Abrindo..." : "Abrir Caixa"}
          </Button>
        </form>
      </Card>
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

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <SectionTitle>Movimentações</SectionTitle>
            <Button onClick={() => setMovFormVisible(!movFormVisible)} variant="secondary" type="button">
              {movFormVisible ? "Cancelar" : "Nova Movimentação"}
            </Button>
          </div>

          {movFormVisible && (
            <div className="mb-6 p-4 border rounded-xl bg-slate-50">
              <h4 className="font-semibold mb-4">Registrar Movimentação</h4>
              <form onSubmit={handleMovimentacao} className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="tipoMov">Tipo</Label>
                  <select
                    id="tipoMov"
                    value={movimentacaoForm.tipo}
                    onChange={(e) => setMovimentacaoForm({ ...movimentacaoForm, tipo: e.target.value })}
                    className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[color:var(--accent-strong)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent-strong)]"
                    required
                  >
                    <option value="ENTRADA">Entrada</option>
                    <option value="SAIDA">Saída</option>
                    <option value="SANGRIA">Sangria (Retirada)</option>
                    <option value="REFORCO">Reforço (Troco)</option>
                  </select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="valorMov">Valor</Label>
                  <Input
                    id="valorMov"
                    type="number"
                    min="0.01"
                    step="0.01"
                    value={movimentacaoForm.valor}
                    onChange={(e) => setMovimentacaoForm({ ...movimentacaoForm, valor: e.target.value })}
                    placeholder="0,00"
                    required
                  />
                </div>
                {(movimentacaoForm.tipo === "ENTRADA" || movimentacaoForm.tipo === "SAIDA") && (
                  <div className="grid gap-2 sm:col-span-2">
                    <Label htmlFor="formaPgtoMov">Forma de Pagamento (Opcional)</Label>
                    <select
                      id="formaPgtoMov"
                      value={movimentacaoForm.formaPagamentoId}
                      onChange={(e) => setMovimentacaoForm({ ...movimentacaoForm, formaPagamentoId: e.target.value })}
                      className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm focus:border-[color:var(--accent-strong)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent-strong)]"
                    >
                      <option value="">Nenhuma (Físico/Dinheiro implícito)</option>
                      {formasPagamento.map((f) => (
                        <option key={f.id} value={f.id}>{f.nome}</option>
                      ))}
                    </select>
                  </div>
                )}
                <div className="grid gap-2 sm:col-span-2">
                  <Label htmlFor="descMov">Descrição</Label>
                  <Input
                    id="descMov"
                    value={movimentacaoForm.descricao}
                    onChange={(e) => setMovimentacaoForm({ ...movimentacaoForm, descricao: e.target.value })}
                    placeholder="Ex: Compra de material, Lanche, etc."
                    required
                  />
                </div>
                <div className="sm:col-span-2">
                  <Button type="submit" disabled={movLoading}>{movLoading ? "Salvando..." : "Salvar"}</Button>
                </div>
              </form>
            </div>
          )}

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
            <div className="flex justify-between font-bold text-lg">
              <span>Saldo Físico</span>
              <span className="text-emerald-700">{currencyFormatter.format(caixa.totais.saldoFisicoCalculado)}</span>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-slate-50 border-l-4 border-l-[color:var(--accent)]">
          <SectionTitle className="mb-4 text-[color:var(--accent)]">Total Recebido no Dia</SectionTitle>
          <div className="space-y-2 mb-4">
            {Object.entries(caixa.totais.totaisPorFormaPagamento).map(([forma, total]) => (
              <LinhaResumo key={forma} label={forma} valor={total as number} />
            ))}
          </div>
          <div className="pt-2 border-t font-bold flex justify-between">
            <span>Total Geral</span>
            <span>{currencyFormatter.format(caixa.totais.totalGeralRecebido)}</span>
          </div>
        </Card>

        <Card className="p-6 border-rose-200 bg-rose-50/50">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-rose-800">Fechar Caixa</h3>
          </div>
          {!fecharFormVisible ? (
            <Button variant="secondary" onClick={() => setFecharFormVisible(true)} className="w-full text-rose-700 border-rose-300 hover:bg-rose-100" type="button">
              Iniciar Fechamento
            </Button>
          ) : (
            <form onSubmit={handleFecharCaixa} className="grid gap-3 mt-4">
              <div className="grid gap-2">
                <Label htmlFor="saldoInformado">Dinheiro Físico na Gaveta</Label>
                <Input
                  id="saldoInformado"
                  type="number"
                  min="0"
                  step="0.01"
                  value={fecharForm.saldoFinalInformado}
                  onChange={(e) => setFecharForm({ ...fecharForm, saldoFinalInformado: e.target.value })}
                  placeholder="0,00"
                  required
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="obsFechamento">Observação (Opcional)</Label>
                <Textarea
                  id="obsFechamento"
                  value={fecharForm.observacao}
                  onChange={(e) => setFecharForm({ ...fecharForm, observacao: e.target.value })}
                  placeholder="Divergências, observações do dia..."
                />
              </div>
              <div className="flex gap-2 mt-2">
                <Button type="submit" disabled={fecharLoading} className="flex-1 bg-rose-600 hover:bg-rose-700">
                  {fecharLoading ? "Fechando..." : "Confirmar Fechamento"}
                </Button>
                <Button type="button" variant="secondary" onClick={() => setFecharFormVisible(false)}>Cancelar</Button>
              </div>
            </form>
          )}
        </Card>
      </aside>
    </div>
  );
}
