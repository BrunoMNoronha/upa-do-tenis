import React from "react";
import { RelatorioEstoqueEstatisticas } from "@/lib/relatorio-estoque-service";
import { formatCurrency } from "@/lib/formatters";

interface CardsResumoProps {
  estatisticas: RelatorioEstoqueEstatisticas;
}

export function CardsResumo({ estatisticas }: CardsResumoProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
        <div className="flex items-center text-gray-500 mb-2">
          <span className="mr-2">📦</span>
          <h3 className="text-sm font-medium">Insumos Ativos</h3>
        </div>
        <p className="text-2xl font-bold text-gray-900">{estatisticas.totalInsumosAtivos}</p>
      </div>

      <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 shadow-sm">
        <div className="flex items-center text-rose-600 mb-2">
          <span className="mr-2">❌</span>
          <h3 className="text-sm font-medium">Insumos Zerados</h3>
        </div>
        <p className="text-2xl font-bold text-rose-700">{estatisticas.totalInsumosZerados}</p>
      </div>

      <div className="rounded-xl border border-amber-200 bg-amber-50 p-5 shadow-sm">
        <div className="flex items-center text-amber-600 mb-2">
          <span className="mr-2">📉</span>
          <h3 className="text-sm font-medium">Abaixo do Mínimo</h3>
        </div>
        <p className="text-2xl font-bold text-amber-700">{estatisticas.totalInsumosAbaixoMinimo}</p>
      </div>

      <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5 shadow-sm">
        <div className="flex items-center text-emerald-600 mb-2">
          <span className="mr-2">💰</span>
          <h3 className="text-sm font-medium">Valor Estimado</h3>
        </div>
        <p className="text-2xl font-bold text-emerald-700">{formatCurrency(estatisticas.valorTotalEstimado)}</p>
      </div>
    </div>
  );
}
