import { DateRangePicker } from "@/components/date-range-picker";
import { formatarDataLocal } from "@/lib/date-range";

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
  const currentRange = {
    from: inicio ? new Date(`${inicio}T00:00:00`) : undefined,
    to: fim ? new Date(`${fim}T23:59:59`) : undefined,
  };

  return (
    <DateRangePicker
      value={currentRange}
      onChange={(range) => {
        onInicioChange(range.from ? formatarDataLocal(range.from) : "");
        onFimChange(range.to ? formatarDataLocal(range.to) : "");
      }}
      onApply={onFiltrar}
      applying={loading}
      className="w-full"
    />
  );
}
