"use client";

import { useState } from "react";
import { Button, Card, Input, Label, PanelHeader } from "@/components/ui";
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
    <Card className="p-[22px]">
      <PanelHeader title="Aplicar insumo" description="Baixa no estoque e custo vinculado ao item" />

      {itensOrdem.length === 0 || insumosDisponiveis.length === 0 ? (
        <p className="mt-4 text-sm text-[color:var(--text-soft)]">
          Para registrar insumo, a OS precisa ter item e deve existir insumo cadastrado ativo.
        </p>
      ) : (
        <form className="mt-4 grid gap-3" onSubmit={handleRegistrarInsumo}>
          <div className="grid gap-1">
            <Label htmlFor="itemOrdemServicoId">Item da OS</Label>
            <select
              id="itemOrdemServicoId"
              value={insumoForm.itemOrdemServicoId}
              onChange={(event) => handleInsumoInput("itemOrdemServicoId", event.target.value)}
              className="h-11 w-full rounded-[10px] border border-[color:var(--border-strong)] bg-white px-3 text-sm text-[color:var(--text)] outline-none focus:border-[color:var(--accent)] focus:ring-[3px] focus:ring-[color:var(--focus-ring)]"
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

          <div className="grid gap-1">
            <Label htmlFor="insumoId">Insumo</Label>
            <select
              id="insumoId"
              value={insumoForm.insumoId}
              onChange={(event) => handleInsumoInput("insumoId", event.target.value)}
              className="h-11 w-full rounded-[10px] border border-[color:var(--border-strong)] bg-white px-3 text-sm text-[color:var(--text)] outline-none focus:border-[color:var(--accent)] focus:ring-[3px] focus:ring-[color:var(--focus-ring)]"
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

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1">
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

            <div className="grid gap-1">
              <Label htmlFor="custoUnitarioAplicado">Custo unitário</Label>
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

          <div className="grid gap-1">
            <Label htmlFor="observacoesInsumo">Observações</Label>
            <Input
              id="observacoesInsumo"
              value={insumoForm.observacoes}
              onChange={(event) => handleInsumoInput("observacoes", event.target.value)}
              placeholder="Opcional"
            />
          </div>

          {insumoErro ? <p role="alert" className="text-sm text-[color:var(--danger)]">{insumoErro}</p> : null}
          {insumoSucesso ? <p role="status" className="text-sm text-[color:var(--success)]">{insumoSucesso}</p> : null}

          <Button type="submit" variant="secondary" isLoading={enviandoInsumo} className="w-full">
            Aplicar insumo
          </Button>
        </form>
      )}
    </Card>
  );
}
