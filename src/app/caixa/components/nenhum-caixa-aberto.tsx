"use client";

import { Button, Card, Input, Label, SectionTitle } from "@/components/ui";
import { formatCurrency, maskCurrency } from "@/lib/formatters";

type NenhumCaixaAbertoProps = {
  saldoInicial: string;
  setSaldoInicial: (val: string) => void;
  abrirLoading: boolean;
  handleAbrirCaixa: (e: React.FormEvent) => void;
};

export function NenhumCaixaAberto({
  saldoInicial,
  setSaldoInicial,
  abrirLoading,
  handleAbrirCaixa,
}: NenhumCaixaAbertoProps) {
  return (
    <Card className="max-w-md mx-auto p-6">
      <SectionTitle>Nenhum caixa aberto</SectionTitle>
      <p className="mt-2 text-sm text-slate-600 mb-6">
        Você precisa abrir o caixa para iniciar as operações do dia e receber pagamentos.
      </p>
      <form onSubmit={handleAbrirCaixa} className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="saldoInicial">Saldo Inicial Físico (Dinheiro em gaveta)</Label>
          <Input
            id="saldoInicial"
            type="text"
            value={saldoInicial}
            onChange={(e) => setSaldoInicial(maskCurrency(e.target.value))}
            onBlur={(e) => {
              if (e.target.value) setSaldoInicial(formatCurrency(e.target.value));
            }}
            placeholder="R$ 0,00"
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
