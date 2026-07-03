import React from 'react';
import { TopList, TopListItem } from './TopList';

interface DashboardInsumosMaisUtilizadosProps {
  insumos: TopListItem[];
}

export function DashboardInsumosMaisUtilizados({ insumos }: DashboardInsumosMaisUtilizadosProps) {
  return (
    <TopList
      title="Insumos Mais Utilizados"
      items={insumos}
      emptyMessage="Nenhum insumo registrado no período."
    />
  );
}
