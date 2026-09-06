"use client";

import { useState } from "react";
import { Button, Card, Input, Label, PanelHeader, Textarea } from "@/components/ui";
import { FormaPagamento, PagamentoFormValues } from "../types";

const pagamentoFormDefaultValues: PagamentoFormValues = {
  formaPagamentoId: "",
  valor: "",
  dataPagamento: "",
  observacoes: "",
};

export function ReceberPagamentoForm({
  ordemServicoId,
  formasPagamento,
  onPagamentoRegistrado,
}: {
  ordemServicoId: string;
  formasPagamento: FormaPagamento[];
  onPagamentoRegistrado: () => Promise<void>;
}) {
  const [pagamentoForm, setPagamentoForm] = useState<PagamentoFormValues>(pagamentoFormDefaultValues);
  const [pagamentoErro, setPagamentoErro] = useState<string | null>(null);
  const [pagamentoSucesso, setPagamentoSucesso] = useState<string | null>(null);
  const [enviandoPagamento, setEnviandoPagamento] = useState(false);

  const handlePagamentoInput = (field: keyof PagamentoFormValues, value: string) => {
    setPagamentoErro(null);
    setPagamentoSucesso(null);
    setPagamentoForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegistrarPagamento = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPagamentoErro(null);
    setPagamentoSucesso(null);

    if (!pagamentoForm.formaPagamentoId) {
      setPagamentoErro("Selecione uma forma de pagamento.");
      return;
    }

    if (!pagamentoForm.valor) {
      setPagamentoErro("Informe o valor do pagamento.");
      return;
    }

    const valorNumerico = Number(pagamentoForm.valor.replace(",", "."));
    if (!Number.isFinite(valorNumerico) || valorNumerico <= 0) {
      setPagamentoErro("Informe um valor maior que zero.");
      return;
    }

    if (!pagamentoForm.dataPagamento) {
      setPagamentoErro("Informe a data do pagamento.");
      return;
    }

    setEnviandoPagamento(true);

    try {
      const response = await fetch(`/api/ordens-servico/${ordemServicoId}/pagamentos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          formaPagamentoId: pagamentoForm.formaPagamentoId,
          valor: valorNumerico,
          dataPagamento: pagamentoForm.dataPagamento,
          observacoes: pagamentoForm.observacoes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setPagamentoErro(payload?.message || "Não foi possível registrar o pagamento.");
        return;
      }

      await onPagamentoRegistrado();
      setPagamentoForm(pagamentoFormDefaultValues);
      setPagamentoSucesso("Pagamento registrado com sucesso.");
    } catch {
      setPagamentoErro("Falha de comunicação ao registrar o pagamento.");
    } finally {
      setEnviandoPagamento(false);
    }
  };

  return (
    <Card className="p-6">
      <PanelHeader title="Receber pagamento" description="O lançamento será registrado no caixa aberto." />

      {formasPagamento.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          Nenhuma forma de pagamento ativa está disponível. Cadastre uma forma em Financeiro para registrar pagamentos.
        </p>
      ) : (
        <form className="mt-4 grid gap-3" onSubmit={handleRegistrarPagamento}>
          <div className="grid gap-2">
            <Label htmlFor="formaPagamentoId">Forma de pagamento</Label>
            <select
              id="formaPagamentoId"
              value={pagamentoForm.formaPagamentoId}
              onChange={(event) => handlePagamentoInput("formaPagamentoId", event.target.value)}
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[color:var(--accent-strong)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent-strong)]"
              required
            >
              <option value="">Selecione...</option>
              {formasPagamento.map((forma) => (
                <option key={forma.id} value={forma.id}>
                  {forma.nome}
                  {forma.tipo ? ` - ${forma.tipo}` : ""}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="valorPagamento">Valor</Label>
            <Input
              id="valorPagamento"
              type="number"
              min="0.01"
              step="0.01"
              value={pagamentoForm.valor}
              onChange={(event) => handlePagamentoInput("valor", event.target.value)}
              placeholder="0,00"
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="dataPagamento">Data de pagamento</Label>
            <Input
              id="dataPagamento"
              type="date"
              value={pagamentoForm.dataPagamento}
              onChange={(event) => handlePagamentoInput("dataPagamento", event.target.value)}
              required
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="observacoesPagamento">Observações (opcional)</Label>
            <Textarea
              id="observacoesPagamento"
              rows={3}
              value={pagamentoForm.observacoes}
              onChange={(event) => handlePagamentoInput("observacoes", event.target.value)}
              placeholder="Detalhes adicionais sobre o pagamento"
            />
          </div>

          {pagamentoErro ? (
            <div className="text-sm text-red-600">
              <p>{pagamentoErro}</p>
              {typeof pagamentoErro === "string" && pagamentoErro.includes("caixa") && (
                <div className="mt-2">
                  <Button href="/caixa" type="button" variant="secondary">
                    Abrir o Caixa
                  </Button>
                </div>
              )}
            </div>
          ) : null}
          {pagamentoSucesso ? <p className="text-sm text-emerald-700">{pagamentoSucesso}</p> : null}

          <div>
            <Button type="submit" disabled={enviandoPagamento}>
              {enviandoPagamento ? "Registrando..." : "Registrar pagamento"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
