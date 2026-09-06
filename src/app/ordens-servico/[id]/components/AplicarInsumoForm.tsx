"use client";

import { useState } from "react";
import { Button, Card, Input, Label, PanelHeader, Textarea } from "@/components/ui";
import { ItemOS, InsumoDisponivel, InsumoFormValues } from "../types";

const insumoFormDefaultValues: InsumoFormValues = {
  itemOrdemServicoId: "",
  insumoId: "",
  quantidade: "",
  custoUnitarioAplicado: "",
  observacoes: "",
};

export function AplicarInsumoForm({
  ordemServicoId,
  itensOrdem,
  insumosDisponiveis,
  onInsumoRegistrado,
}: {
  ordemServicoId: string;
  itensOrdem: ItemOS[];
  insumosDisponiveis: InsumoDisponivel[];
  onInsumoRegistrado: () => Promise<void>;
}) {
  const [insumoForm, setInsumoForm] = useState<InsumoFormValues>(insumoFormDefaultValues);
  const [insumoErro, setInsumoErro] = useState<string | null>(null);
  const [insumoSucesso, setInsumoSucesso] = useState<string | null>(null);
  const [enviandoInsumo, setEnviandoInsumo] = useState(false);

  const handleInsumoInput = (field: keyof InsumoFormValues, value: string) => {
    setInsumoErro(null);
    setInsumoSucesso(null);
    setInsumoForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleRegistrarInsumo = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setInsumoErro(null);
    setInsumoSucesso(null);

    if (!insumoForm.itemOrdemServicoId) {
      setInsumoErro("Selecione o item da OS.");
      return;
    }

    if (!insumoForm.insumoId) {
      setInsumoErro("Selecione o insumo utilizado.");
      return;
    }

    const quantidade = Number(insumoForm.quantidade.replace(",", "."));
    if (!Number.isFinite(quantidade) || quantidade <= 0) {
      setInsumoErro("Informe uma quantidade maior que zero.");
      return;
    }

    const custoUnitarioAplicado = Number(insumoForm.custoUnitarioAplicado.replace(",", "."));
    if (!Number.isFinite(custoUnitarioAplicado) || custoUnitarioAplicado < 0) {
      setInsumoErro("Informe um custo unitário maior ou igual a zero.");
      return;
    }

    setEnviandoInsumo(true);

    try {
      const response = await fetch(`/api/ordens-servico/${ordemServicoId}/insumos`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          itemOrdemServicoId: insumoForm.itemOrdemServicoId,
          insumoId: insumoForm.insumoId,
          quantidade,
          custoUnitarioAplicado,
          observacoes: insumoForm.observacoes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        setInsumoErro(payload?.message || "Não foi possível registrar o insumo utilizado.");
        return;
      }

      await onInsumoRegistrado();
      setInsumoForm(insumoFormDefaultValues);
      setInsumoSucesso("Insumo vinculado ao item com sucesso.");
    } catch {
      setInsumoErro("Falha de comunicação ao registrar o insumo.");
    } finally {
      setEnviandoInsumo(false);
    }
  };

  return (
    <Card className="p-6">
      <PanelHeader title="Insumos aplicados" description="Vincule o consumo ao item da ordem." />

      {itensOrdem.length === 0 || insumosDisponiveis.length === 0 ? (
        <p className="mt-4 text-sm text-slate-600">
          Para registrar insumo, a OS precisa ter item e deve existir insumo cadastrado ativo.
        </p>
      ) : (
        <form className="mt-4 grid gap-3" onSubmit={handleRegistrarInsumo}>
          <div className="grid gap-2">
            <Label htmlFor="itemOrdemServicoId">Item da OS</Label>
            <select
              id="itemOrdemServicoId"
              value={insumoForm.itemOrdemServicoId}
              onChange={(event) => handleInsumoInput("itemOrdemServicoId", event.target.value)}
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[color:var(--accent-strong)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent-strong)]"
              required
            >
              <option value="">Selecione...</option>
              {itensOrdem.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.descricao}
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="insumoId">Insumo</Label>
            <select
              id="insumoId"
              value={insumoForm.insumoId}
              onChange={(event) => handleInsumoInput("insumoId", event.target.value)}
              className="flex h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-[color:var(--accent-strong)] focus:outline-none focus:ring-1 focus:ring-[color:var(--accent-strong)]"
              required
            >
              <option value="">Selecione...</option>
              {insumosDisponiveis.map((insumo) => (
                <option key={insumo.id} value={insumo.id}>
                  {insumo.nome} ({insumo.unidadeMedida})
                </option>
              ))}
            </select>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="quantidadeInsumo">Quantidade</Label>
              <Input
                id="quantidadeInsumo"
                type="number"
                min="0.01"
                step="0.01"
                value={insumoForm.quantidade}
                onChange={(event) => handleInsumoInput("quantidade", event.target.value)}
                placeholder="0,00"
                required
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="custoUnitarioAplicado">Custo unitário aplicado</Label>
              <Input
                id="custoUnitarioAplicado"
                type="number"
                min="0"
                step="0.01"
                value={insumoForm.custoUnitarioAplicado}
                onChange={(event) => handleInsumoInput("custoUnitarioAplicado", event.target.value)}
                placeholder="0,00"
                required
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="observacoesInsumo">Observações (opcional)</Label>
            <Textarea
              id="observacoesInsumo"
              rows={3}
              value={insumoForm.observacoes}
              onChange={(event) => handleInsumoInput("observacoes", event.target.value)}
              placeholder="Informações adicionais do insumo aplicado"
            />
          </div>

          {insumoErro ? <p className="text-sm text-red-600">{insumoErro}</p> : null}
          {insumoSucesso ? <p className="text-sm text-emerald-700">{insumoSucesso}</p> : null}

          <div>
            <Button type="submit" disabled={enviandoInsumo}>
              {enviandoInsumo ? "Registrando..." : "Registrar insumo"}
            </Button>
          </div>
        </form>
      )}
    </Card>
  );
}
