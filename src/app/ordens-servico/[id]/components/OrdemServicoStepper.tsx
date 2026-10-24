import { Card } from "@/components/ui";
import type { EtapaProgresso } from "@/lib/ordens-servico-progresso";

const dataCurta = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone: "America/Sao_Paulo" });
const horaCurta = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: "America/Sao_Paulo" });

const COR_BARRA = {
  concluida: "bg-[color:var(--success)]",
  atual: "bg-[color:var(--accent)]",
  pendente: "bg-[color:var(--track)]",
} as const;

/** Progresso da OS nas quatro etapas do fluxo operacional. */
export function OrdemServicoStepper({ etapas }: { etapas: EtapaProgresso[] }) {
  return (
    <Card className="px-[22px] py-[18px]">
      <ol aria-label="Progresso da ordem de serviço" className="grid grid-cols-2 gap-x-4 gap-y-4 md:grid-cols-4">
        {etapas.map((etapa) => (
          <li key={etapa.status} aria-current={etapa.estado === "atual" ? "step" : undefined} className="flex flex-col gap-2">
            <span aria-hidden="true" className={`h-1.5 rounded-full ${COR_BARRA[etapa.estado]}`} />
            <span className={`text-xs font-bold ${etapa.estado === "pendente" ? "text-[color:var(--muted)]" : "text-[color:var(--text)]"}`}>
              {etapa.rotulo}
              {etapa.estado === "atual" ? <span className="text-[color:var(--accent-strong)]"> · atual</span> : null}
              {etapa.estado === "concluida" ? <span className="sr-only"> (concluída)</span> : null}
              {etapa.estado === "pendente" ? <span className="sr-only"> (pendente)</span> : null}
            </span>
            <span className={`text-xs ${etapa.estado === "pendente" ? "text-[color:var(--muted)]" : "text-[color:var(--text-soft)]"}`}>
              {etapa.data ? `${dataCurta.format(new Date(etapa.data))} · ${horaCurta.format(new Date(etapa.data))}` : "—"}
            </span>
          </li>
        ))}
      </ol>
    </Card>
  );
}
