import React from 'react';
import Link from 'next/link';
import { RelatorioOSItem } from '@/lib/relatorio-financeiro-os-service';
import { Badge, EmptyState } from '@/components/ui';

interface TabelaProps {
  itens: RelatorioOSItem[];
}

const formatarMoeda = (valor: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(valor);
};

const formatarData = (dataStr: string) => {
  if (!dataStr) return '-';
  const data = new Date(dataStr);
  return new Intl.DateTimeFormat('pt-BR').format(data);
};

export function RelatorioFinanceiroOSTabela({ itens }: TabelaProps) {
  if (itens.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState 
          title="Nenhuma Ordem de Serviço encontrada" 
          description="Ajuste os filtros de período, cliente ou status para encontrar os registros desejados."
        />
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-[1.75rem] border border-black/10 bg-white shadow-sm">
      <table className="w-full text-left text-sm text-slate-700">
        <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-600 border-b border-black/10">
          <tr>
            <th className="px-6 py-4">OS</th>
            <th className="px-6 py-4">Cliente</th>
            <th className="px-6 py-4">Data Ent. / Prev.</th>
            <th className="px-6 py-4">Status Op.</th>
            <th className="px-6 py-4">Status Fin.</th>
            <th className="px-6 py-4 text-right">Valor Total</th>
            <th className="px-6 py-4 text-right">Valor Pago</th>
            <th className="px-6 py-4 text-right">Saldo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/5">
          {itens.map((item) => (
            <tr key={item.id} className="hover:bg-slate-50 transition">
              <td className="px-6 py-4 font-medium">
                <Link href={`/ordens-servico/${item.id}`} className="text-[color:var(--accent-strong)] hover:underline">
                  {item.numero}
                </Link>
                {item.atrasada && (
                  <span className="ml-2 inline-flex items-center rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-800">
                    Atrasada
                  </span>
                )}
              </td>
              <td className="px-6 py-4">{item.clienteNome}</td>
              <td className="px-6 py-4">
                <div className="flex flex-col">
                  <span>{formatarData(item.dataEntrada)}</span>
                  <span className="text-xs text-slate-400">P: {formatarData(item.dataPrevisao)}</span>
                </div>
              </td>
              <td className="px-6 py-4">
                <Badge tone={
                  item.statusOperacional === 'ENTREGUE' ? 'success' :
                  item.statusOperacional === 'CANCELADA' ? 'danger' :
                  item.statusOperacional === 'EM_ANDAMENTO' ? 'warning' : 'neutral'
                }>
                  {item.statusOperacional}
                </Badge>
              </td>
              <td className="px-6 py-4">
                <Badge tone={
                  item.statusFinanceiro === 'PAGO' ? 'success' :
                  item.statusFinanceiro === 'CANCELADO' ? 'danger' :
                  item.statusFinanceiro === 'PARCIAL' ? 'warning' : 'neutral'
                }>
                  {item.statusFinanceiro}
                </Badge>
              </td>
              <td className="px-6 py-4 text-right">{formatarMoeda(item.valorTotal)}</td>
              <td className="px-6 py-4 text-right">{formatarMoeda(item.valorPago)}</td>
              <td className="px-6 py-4 text-right">
                <span className={item.saldo > 0 ? "font-semibold text-rose-600" : "text-slate-500"}>
                  {formatarMoeda(item.saldo)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
