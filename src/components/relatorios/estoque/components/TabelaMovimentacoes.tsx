import { formatDate, formatCurrency } from "./utils";
import React from "react";
import { MovimentacaoResumo } from "@/lib/relatorio-estoque-service";
import { EmptyState } from "@/components/ui";

interface TabelaMovimentacoesProps {
  movimentacoes: MovimentacaoResumo[];
}

const getTipoLabel = (tipo: string) => {
  const map: Record<string, string> = {
    ENTRADA_MANUAL: "Entrada Manual",
    SAIDA_MANUAL: "Saída Manual",
    AJUSTE: "Ajuste",
    BAIXA_OS: "Baixa em OS",
    ESTORNO_OS: "Estorno de OS",
  };
  return map[tipo] || tipo;
};

const getTipoIcon = (tipo: string) => {
  switch (tipo) {
    case "ENTRADA_MANUAL":
    case "ESTORNO_OS":
      return <span className="mr-1 text-emerald-600">↗️</span>;
    case "SAIDA_MANUAL":
    case "BAIXA_OS":
      return <span className="mr-1 text-rose-600">↘️</span>;
    case "AJUSTE":
      return <span className="mr-1 text-amber-600">🔄</span>;
    default:
      return <span className="mr-1 text-gray-500">📄</span>;
  }
};

const formatTipoColor = (tipo: string) => {
  switch (tipo) {
    case "ENTRADA_MANUAL":
    case "ESTORNO_OS":
      return "text-emerald-700 bg-emerald-50 ring-emerald-600/20";
    case "SAIDA_MANUAL":
    case "BAIXA_OS":
      return "text-rose-700 bg-rose-50 ring-rose-600/20";
    case "AJUSTE":
      return "text-amber-700 bg-amber-50 ring-amber-600/20";
    default:
      return "text-gray-700 bg-gray-50 ring-gray-600/20";
  }
};

export function TabelaMovimentacoes({ movimentacoes }: TabelaMovimentacoesProps) {
  return (
    <div className="lg:col-span-2 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden flex flex-col">
      <div className="border-b border-gray-200 bg-gray-50/50 px-4 py-4 sm:px-6 flex justify-between items-center">
        <div>
          <h3 className="text-base font-semibold leading-6 text-gray-900">Últimas Movimentações</h3>
          <p className="mt-1 text-sm text-gray-500">Movimentações consolidadas no período.</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-300">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Data</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Tipo</th>
              <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Insumo</th>
              <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900">Qtd</th>
              <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 sm:pr-6">Custo Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {movimentacoes.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-8">
                  <EmptyState
                    title="Sem movimentações"
                    description="Nenhuma movimentação de estoque encontrada neste período."
                    className="border-none bg-transparent"
                  />
                </td>
              </tr>
            ) : (
              movimentacoes.map((mov) => (
                <tr key={mov.id} className="hover:bg-gray-50 transition-colors">
                  <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">
                    {formatDate(mov.dataMovimentacao)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm">
                    <span className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${formatTipoColor(mov.tipo)}`}>
                      {getTipoIcon(mov.tipo)}
                      {getTipoLabel(mov.tipo)}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900">
                    {mov.insumo.nome} <span className="text-gray-500 text-xs">({mov.insumo.unidadeMedida})</span>
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-900 text-right font-medium">
                    {['SAIDA_MANUAL', 'BAIXA_OS'].includes(mov.tipo) ? '-' : '+'}{mov.quantidade}
                  </td>
                  <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 text-right sm:pr-6">
                    {formatCurrency(mov.custoTotal)}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
