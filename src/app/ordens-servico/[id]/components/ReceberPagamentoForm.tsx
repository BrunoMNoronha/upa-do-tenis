"use client";

import { useState } from "react";
import { Button, Card, Input, Label, PanelHeader } from "@/components/ui";
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
    <Card className="p-[22px]">
      <PanelHeader title="Receber pagamento" description="Registra no caixa aberto e atualiza o saldo" />

      {formasPagamento.length === 0 ? (
        <p className="mt-4 text-sm text-[color:var(--text-soft)]">
          Nenhuma forma de pagamento ativa está disponível. Cadastre uma forma em Financeiro para registrar pagamentos.
        </p>
      ) : (
        <form className="mt-4 grid gap-3" onSubmit={handleRegistrarPagamento}>
          <div className="grid gap-1">
            <Label htmlFor="formaPagamentoId">Forma de pagamento</Label>
            <select
              id="formaPagamentoId"
              value={pagamentoForm.formaPagamentoId}
              onChange={(event) => handlePagamentoInput("formaPagamentoId", event.target.value)}
              className="h-11 w-full rounded-[10px] border border-[color:var(--border-strong)] bg-white px-3 text-sm text-[color:var(--text)] outline-none focus:border-[color:var(--accent)] focus:ring-[3px] focus:ring-[color:var(--focus-ring)]"
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

          <div className="grid gap-3 sm:grid-cols-2">
          <div className="grid gap-1">
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

          <div className="grid gap-1">
            <Label htmlFor="dataPagamento">Data</Label>
            <Input
              id="dataPagamento"
              type="date"
              value={pagamentoForm.dataPagamento}
              onChange={(event) => handlePagamentoInput("dataPagamento", event.target.value)}
              required
            />
          </div>
          </div>

          <div className="grid gap-1">
            <Label htmlFor="observacoesPagamento">Observações</Label>
            <Input
              id="observacoesPagamento"
              value={pagamentoForm.observacoes}
              onChange={(event) => handlePagamentoInput("observacoes", event.target.value)}
              placeholder="Opcional"
            />
          </div>

          {pagamentoErro ? (
            <div className="text-sm text-[color:var(--danger)]">
              <p role="alert">{pagamentoErro}</p>
              {typeof pagamentoErro === "string" && pagamentoErro.includes("caixa") && (
                <div className="mt-2">
                  <Button href="/caixa" type="button" variant="secondary">
                    Abrir o Caixa
                  </Button>
                </div>
              )}
            </div>
          ) : null}
          {pagamentoSucesso ? <p role="status" className="text-sm text-[color:var(--success)]">{pagamentoSucesso}</p> : null}

          <Button type="submit" isLoading={enviandoPagamento} className="w-full">
            Registrar pagamento
          </Button>
        </form>
      )}
    </Card>
  );
}
