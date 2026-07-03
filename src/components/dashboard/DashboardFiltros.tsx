import React from 'react';
import { Button, Input, Label } from '@/components/ui';

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
  return (
    <div className="flex flex-col md:flex-row gap-4 items-end bg-card p-4 rounded-lg border shadow-sm">
      <div className="flex flex-col gap-2 w-full md:w-auto">
        <Label htmlFor="dataInicio">Data Inicial</Label>
        <Input
          id="dataInicio"
          type="date"
          value={inicio}
          onChange={(e) => onInicioChange(e.target.value)}
        />
      </div>
      <div className="flex flex-col gap-2 w-full md:w-auto">
        <Label htmlFor="dataFim">Data Final</Label>
        <Input
          id="dataFim"
          type="date"
          value={fim}
          onChange={(e) => onFimChange(e.target.value)}
        />
      </div>
      <Button 
        onClick={onFiltrar} 
        disabled={loading}
        className="w-full md:w-auto"
      >
        {loading ? 'Carregando...' : 'Filtrar'}
      </Button>
    </div>
  );
}
