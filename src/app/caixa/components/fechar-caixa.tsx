"use client";

import { Button, Card, Input, Label, Textarea } from "@/components/ui";
import { formatCurrency, maskCurrency } from "@/lib/formatters";
import { sanitizeCurrency } from "@/lib/sanitizers";
import { LinhaResumo } from "./linha-resumo";

type TotaisCaixa = {
  saldoFisicoCalculado: number;
  totalGeralRecebido: number;
  totaisPorFormaPagamento: Record<string, number>;
};

type Caixa = {
  totais: TotaisCaixa;
};

type FecharCaixaProps = {
  caixa: Caixa;
  fecharFormVisible: boolean;
  setFecharFormVisible: (val: boolean) => void;
  handleFecharCaixa: (e: React.FormEvent) => void;
  fecharForm: {
    saldoFinalInformado: string;
    observacao: string;
  };
  setFecharForm: (val: { saldoFinalInformado: string; observacao: string }) => void;
  fecharLoading: boolean;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export function FecharCaixa({
  caixa,
  fecharFormVisible,
  setFecharFormVisible,
  handleFecharCaixa,
  fecharForm,
  setFecharForm,
  fecharLoading,
}: FecharCaixaProps) {
  const divergenciaPrevista = caixa && fecharForm.saldoFinalInformado
    ? sanitizeCurrency(fecharForm.saldoFinalInformado) - caixa.totais.saldoFisicoCalculado
    : null;

  return (
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
              type="text"
              value={fecharForm.saldoFinalInformado}
              onChange={(e) => setFecharForm({ ...fecharForm, saldoFinalInformado: maskCurrency(e.target.value) })}
              onBlur={(e) => {
                if (e.target.value) setFecharForm({ ...fecharForm, saldoFinalInformado: formatCurrency(e.target.value) });
              }}
              placeholder="R$ 0,00"
              required
            />
          </div>

          <div className="rounded-lg border border-rose-200 bg-white p-3 space-y-1">
            <p className="text-xs font-semibold text-rose-800 uppercase tracking-wide mb-1">Resumo antes de fechar</p>
            <LinhaResumo label="Dinheiro Físico Esperado" valor={caixa.totais.saldoFisicoCalculado} />
            {fecharForm.saldoFinalInformado && (
              <div className="flex items-center justify-between gap-4 py-2 text-sm">
                <span className="text-slate-600">Divergência Prevista</span>
                <strong className={
                  divergenciaPrevista! < 0 ? "text-rose-600" : divergenciaPrevista! > 0 ? "text-emerald-600" : "text-[color:var(--text)]"
                }>
                  {currencyFormatter.format(divergenciaPrevista!)}
                </strong>
              </div>
            )}
            {Object.keys(caixa.totais.totaisPorFormaPagamento).length > 0 && (
              <div className="pt-2 mt-2 border-t space-y-1">
                <p className="text-xs text-slate-500 mb-1">Totais por forma (conferência operacional):</p>
                {Object.entries(caixa.totais.totaisPorFormaPagamento).map(([forma, total]) => (
                  <LinhaResumo key={forma} label={forma} valor={total as number} />
                ))}
              </div>
            )}
            <div className="pt-2 border-t flex justify-between font-semibold text-sm">
              <span>Total Geral Recebido</span>
              <span>{currencyFormatter.format(caixa.totais.totalGeralRecebido)}</span>
            </div>
            <p className="text-xs text-slate-500 pt-1">
              Divergência calculada apenas sobre dinheiro físico. PIX/cartão são exibidos para conferência operacional.
            </p>
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
  );
}
