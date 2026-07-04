import React from 'react';
import { Button } from '@/components/ui';
import { DateRangePicker, type DateRange } from '@/components/date-range-picker';

interface DashboardFiltrosProps {
  inicio: string;
  fim: string;
  onInicioChange: (val: string) => void;
  onFimChange: (val: string) => void;
  onFiltrar: () => void;
  loading: boolean;
}

export function DashboardFiltros({
  inicio,
  fim,
  onInicioChange,
  onFimChange,
  onFiltrar,
  loading,
}: DashboardFiltrosProps) {
  
  const handleRangeChange = (range: DateRange) => {
    onInicioChange(range.from ? range.from.toISOString().split("T")[0] : "");
    onFimChange(range.to ? range.to.toISOString().split("T")[0] : "");
  };

  const currentRange = {
    from: inicio ? new Date(`${inicio}T00:00:00`) : undefined,
    to: fim ? new Date(`${fim}T23:59:59`) : undefined,
  };

  return (
    <div className="flex flex-col xl:flex-row gap-4 items-end">
      <DateRangePicker 
        value={currentRange} 
        onChange={handleRangeChange} 
        className="w-full xl:w-auto"
      />
      <Button 
        onClick={onFiltrar} 
        disabled={loading}
        className="w-full xl:w-auto h-11 px-8"
      >
        {loading ? 'Carregando...' : 'Filtrar'}
      </Button>
    </div>
  );
}
