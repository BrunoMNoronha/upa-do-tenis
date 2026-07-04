"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  registrarMovimentacaoManualSchema, 
  RegistrarMovimentacaoManualValues 
} from "@/lib/insumos-movimentacoes-schema";
import { TipoMovimentacao } from "@/lib/movimentacao-estoque-service";

import { 
  Button, 
  Card, 
  Input, 
  Label, 
  SectionTitle, 
  Badge 
} from "@/components/ui";

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default function MovimentacoesClient({ insumoId, initialData }: { insumoId: string, initialData: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const insumo = initialData.insumo;
  const movimentacoes = initialData.movimentacoes;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<RegistrarMovimentacaoManualValues>({
    resolver: zodResolver(registrarMovimentacaoManualSchema),
    defaultValues: {
      tipo: TipoMovimentacao.ENTRADA_MANUAL,
    },
  });

  const tipoSelecionado = watch("tipo");

  const onSubmit = async (data: RegistrarMovimentacaoManualValues) => {
    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch(`/api/insumos/${insumoId}/movimentacoes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Erro ao registrar movimentação.");
      }

      reset();
      router.refresh();
    } catch (error: any) {
      setErrorMsg(error.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_2fr]">
      <div className="space-y-6">
        <Card className="p-6">
          <SectionTitle className="text-xl">Saldo Atual</SectionTitle>
          <div className="mt-4 text-4xl font-bold text-white">
            {insumo.quantidadeEstoque} <span className="text-lg font-normal text-slate-400">{insumo.unidadeMedida}</span>
          </div>
          <div className="mt-2 text-sm text-slate-400">
            Estoque mínimo: {insumo.estoqueMinimo} {insumo.unidadeMedida}
          </div>
        </Card>

        <Card className="p-6">
          <SectionTitle className="mb-4 text-lg">Nova Movimentação</SectionTitle>
          
          {errorMsg && (
            <div className="mb-4 rounded-md bg-red-500/10 p-3 text-sm text-red-500">
              {errorMsg}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Tipo</Label>
              <select 
                {...register("tipo")}
                className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]"
              >
                <option value={TipoMovimentacao.ENTRADA_MANUAL}>Entrada (Adicionar)</option>
                <option value={TipoMovimentacao.SAIDA_MANUAL}>Saída (Remover)</option>
                <option value={TipoMovimentacao.AJUSTE}>Ajuste de Saldo</option>
              </select>
              {errors.tipo && <span className="text-xs text-red-500">{errors.tipo.message}</span>}
            </div>

            {tipoSelecionado === TipoMovimentacao.AJUSTE ? (
              <div>
                <Label>Novo Saldo</Label>
                <Input type="number" step="0.01" {...register("novoSaldo", { valueAsNumber: true })} />
                {errors.novoSaldo && <span className="text-xs text-red-500">{errors.novoSaldo.message}</span>}
              </div>
            ) : (
              <div>
                <Label>Quantidade</Label>
                <Input type="number" step="0.01" {...register("quantidade", { valueAsNumber: true })} />
                {errors.quantidade && <span className="text-xs text-red-500">{errors.quantidade.message}</span>}
              </div>
            )}

            <div>
              <Label>Custo Unitário Referência (Opcional)</Label>
              <Input type="number" step="0.01" {...register("custoUnitario", { valueAsNumber: true })} placeholder={String(insumo.custoUnitario)} />
              {errors.custoUnitario && <span className="text-xs text-red-500">{errors.custoUnitario.message}</span>}
            </div>

            <div>
              <Label>{tipoSelecionado === TipoMovimentacao.AJUSTE ? "Motivo (Obrigatório)" : "Observação"}</Label>
              <Input type="text" {...register(tipoSelecionado === TipoMovimentacao.AJUSTE ? "motivo" : "observacao")} />
              {errors.motivo && <span className="text-xs text-red-500">{errors.motivo.message}</span>}
            </div>

            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Registrando..." : "Registrar"}
            </Button>
          </form>
        </Card>
      </div>

      <Card className="bg-[color:var(--text)] p-6 text-white">
        <SectionTitle className="mb-4 text-xl">Extrato de Movimentações</SectionTitle>
        
        {movimentacoes.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 text-sm text-slate-400">
            Nenhuma movimentação registrada.
          </div>
        ) : (
          <div className="space-y-3">
            {movimentacoes.map((mov: any) => {
              const isEntrada = mov.tipo.includes("ENTRADA") || mov.tipo.includes("ESTORNO");
              const isSaida = mov.tipo.includes("SAIDA") || mov.tipo.includes("BAIXA");
              const isAjuste = mov.tipo === "AJUSTE";
              
              let corBadge = "neutral";
              if (isEntrada) corBadge = "success";
              if (isSaida) corBadge = "danger";
              if (isAjuste) corBadge = "warning";

              return (
                <div key={mov.id} className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3">
                    <div className="flex items-center gap-3">
                      <Badge tone={corBadge as any}>{mov.tipo}</Badge>
                      <span className="text-slate-400">{dateFormatter.format(new Date(mov.criadoEm))}</span>
                    </div>
                    <div className="text-right font-medium text-slate-200">
                      Saldo: {mov.saldoAnterior} → {mov.saldoPosterior}
                    </div>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 gap-4 text-slate-300">
                    <div>
                      <span className="block text-xs uppercase tracking-wider text-slate-500">Qtd / Origem</span>
                      <span className="mt-1 block font-medium">
                        {isSaida ? "-" : (isEntrada ? "+" : "")}{mov.quantidade} ({mov.origem})
                      </span>
                    </div>
                    <div>
                      <span className="block text-xs uppercase tracking-wider text-slate-500">Custo Total</span>
                      <span className="mt-1 block font-medium">{currencyFormatter.format(mov.custoTotal)}</span>
                    </div>
                  </div>

                  {(mov.observacao || mov.motivo || mov.ordemServico?.numero) && (
                    <div className="mt-3 rounded-lg bg-black/20 p-3 text-xs text-slate-400">
                      {mov.ordemServico?.numero && <p><strong>OS Ref:</strong> {mov.ordemServico.numero}</p>}
                      {mov.motivo && <p><strong>Motivo:</strong> {mov.motivo}</p>}
                      {mov.observacao && <p><strong>Obs:</strong> {mov.observacao}</p>}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </Card>
    </section>
  );
}
