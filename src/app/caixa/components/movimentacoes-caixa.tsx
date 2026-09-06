"use client";

import { Badge, Button, Card, Input, Label, SectionTitle } from "@/components/ui";
import { formatCurrency, maskCurrency } from "@/lib/formatters";

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

type MovimentacoesCaixaProps = {
  movimentacoes: Movimentacao[];
  movFormVisible: boolean;
  setMovFormVisible: (val: boolean) => void;
  handleMovimentacao: (e: React.FormEvent) => void;
  movimentacaoForm: {
    tipo: string;
    valor: string;
    descricao: string;
    formaPagamentoId: string;
  };
  setMovimentacaoForm: (val: { tipo: string; valor: string; descricao: string; formaPagamentoId: string }) => void;
  movLoading: boolean;
  formasPagamento: FormaPagamento[];
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export function MovimentacoesCaixa({
  movimentacoes,
  movFormVisible,
  setMovFormVisible,
  handleMovimentacao,
  movimentacaoForm,
  setMovimentacaoForm,
  movLoading,
  formasPagamento,
}: MovimentacoesCaixaProps) {
  return (
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
                type="text"
                value={movimentacaoForm.valor}
                onChange={(e) => setMovimentacaoForm({ ...movimentacaoForm, valor: maskCurrency(e.target.value) })}
                onBlur={(e) => {
                  if (e.target.value) setMovimentacaoForm({ ...movimentacaoForm, valor: formatCurrency(e.target.value) });
                }}
                placeholder="R$ 0,00"
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

      {movimentacoes.length === 0 ? (
        <p className="text-sm text-slate-600">Nenhuma movimentação registrada.</p>
      ) : (
        <div className="rounded-xl border overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 border-b text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-semibold">Data/Hora</th>
                <th className="px-4 py-3 font-semibold">Tipo</th>
                <th className="px-4 py-3 font-semibold">Descrição</th>
                <th className="px-4 py-3 font-semibold">Origem</th>
                <th className="px-4 py-3 font-semibold">Forma Pgto</th>
                <th className="px-4 py-3 font-semibold text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 bg-white">
              {movimentacoes.map(mov => (
                <tr key={mov.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {dateFormatter.format(new Date(mov.criadoEm))}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={mov.tipo === "ENTRADA" || mov.tipo === "REFORCO" ? "success" : "danger"}>{mov.tipo}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium">
                    {mov.descricao}
                    {mov.ordemServicoId && <span className="ml-2 text-xs text-slate-400 font-normal">(OS Vinculada)</span>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{mov.origem}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {mov.formaPagamento?.nome || "-"}
                  </td>
                  <td className={`px-4 py-3 text-right font-semibold whitespace-nowrap ${mov.tipo === "ENTRADA" || mov.tipo === "REFORCO" ? "text-emerald-600" : "text-rose-600"}`}>
                    {mov.tipo === "ENTRADA" || mov.tipo === "REFORCO" ? "+" : "-"}{currencyFormatter.format(mov.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}
