import React from "react";
import Link from "next/link";
import { InsumoCritico } from "@/lib/relatorio-estoque-service";
import { EmptyState } from "@/components/ui";

interface TabelaCriticosProps {
  criticos: InsumoCritico[];
}

export function TabelaCriticos({ criticos }: TabelaCriticosProps) {
  return (
    <div className="lg:col-span-1 rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
      <div className="border-b border-gray-200 bg-gray-50/50 px-4 py-4 sm:px-6">
        <h3 className="text-base font-semibold leading-6 text-gray-900">Insumos Críticos</h3>
        <p className="mt-1 text-sm text-gray-500">Insumos zerados ou abaixo do mínimo exigem reposição.</p>
      </div>

      {criticos.length === 0 ? (
        <EmptyState
          title="Nenhum insumo crítico"
          description="Todos os insumos estão acima do estoque mínimo."
          className="border-none"
        />
      ) : (
        <ul className="divide-y divide-gray-200">
          {criticos.map((insumo) => (
            <li key={insumo.id} className="p-4 sm:px-6 hover:bg-gray-50 transition-colors">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{insumo.nome}</p>
                  <p className="text-sm text-gray-500">
                    Estoque Atual: <span className="font-semibold text-gray-900">{insumo.quantidadeEstoque}</span> / Mínimo: {insumo.estoqueMinimo}
                  </p>
                </div>
                <div>
                  {insumo.status === 'ZERADO' ? (
                    <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 ring-1 ring-inset ring-rose-600/20">
                      Zerado
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-700 ring-1 ring-inset ring-amber-600/20">
                      Baixo
                    </span>
                  )}
                </div>
              </div>
              <div className="mt-2 text-right">
                <Link href={`/insumos/${insumo.id}/movimentacoes`} className="text-xs font-medium text-primary hover:underline">
                  Ver extrato
                </Link>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
