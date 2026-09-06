import { Button, Input, Label } from '@/components/ui';

interface FiltrosProps {
  inicio: string;
  fim: string;
  statusFinanceiro: string;
  statusOperacional: string;
  cliente: string;
  saldoAberto: boolean;
  onFilterChange: (key: string, value: any) => void;
  onFiltrar: () => void;
  loading: boolean;
}

export function RelatorioFinanceiroOSFiltros({
  inicio,
  fim,
  statusFinanceiro,
  statusOperacional,
  cliente,
  saldoAberto,
  onFilterChange,
  onFiltrar,
  loading,
}: FiltrosProps) {
  return (
    <div className="bg-card p-6 rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_20px_40px_rgba(31,41,55,0.07)]">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 items-end">
        
        <div className="flex flex-col gap-2">
          <Label htmlFor="inicio">Data Inicial</Label>
          <Input
            id="inicio"
            type="date"
            value={inicio}
            onChange={(e) => onFilterChange('inicio', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="fim">Data Final</Label>
          <Input
            id="fim"
            type="date"
            value={fim}
            onChange={(e) => onFilterChange('fim', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="cliente">Cliente (Busca)</Label>
          <Input
            id="cliente"
            type="text"
            placeholder="Nome do cliente"
            value={cliente}
            onChange={(e) => onFilterChange('cliente', e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="statusFinanceiro">Status Financeiro</Label>
          <select
            id="statusFinanceiro"
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]"
            value={statusFinanceiro}
            onChange={(e) => onFilterChange('statusFinanceiro', e.target.value)}
          >
            <option value="TODOS">Todos</option>
            <option value="PENDENTE">Pendente</option>
            <option value="PARCIAL">Parcial</option>
            <option value="PAGO">Pago</option>
            <option value="CANCELADO">Cancelado</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="statusOperacional">Status Operacional</Label>
          <select
            id="statusOperacional"
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]"
            value={statusOperacional}
            onChange={(e) => onFilterChange('statusOperacional', e.target.value)}
          >
            <option value="TODOS">Todos</option>
            <option value="ABERTA">Aberta</option>
            <option value="EM_ANDAMENTO">Em Andamento</option>
            <option value="CONCLUIDA">Concluída</option>
            <option value="ENTREGUE">Entregue</option>
            <option value="CANCELADA">Cancelada</option>
          </select>
        </div>

        <div className="flex items-center gap-2 h-full pb-3">
          <input
            id="saldoAberto"
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 text-[color:var(--accent)] focus:ring-[color:var(--accent-soft)]"
            checked={saldoAberto}
            onChange={(e) => onFilterChange('saldoAberto', e.target.checked)}
          />
          <Label htmlFor="saldoAberto" className="cursor-pointer">Apenas com saldo em aberto</Label>
        </div>

        <div className="col-span-full xl:col-span-1 xl:col-start-4 flex justify-end">
          <Button 
            onClick={onFiltrar} 
            disabled={loading}
            className="w-full md:w-auto"
          >
            {loading ? 'Aplicando...' : 'Aplicar Filtros'}
          </Button>
        </div>
      </div>
    </div>
  );
}
