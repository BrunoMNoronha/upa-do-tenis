import Link from "next/link";

import type { AlertaCaixa } from "@/lib/caixa-alerta";

const ESTILOS = {
  ABERTO_HOJE: "bg-[color:var(--success-soft)] text-[color:var(--success)]",
  FECHAMENTO_PENDENTE: "bg-[color:var(--warning-soft)] text-[color:var(--warning-badge-text)]",
  FECHADO: "bg-[color:var(--danger-badge-bg)] text-[color:var(--danger-badge-text)]",
} as const;

const PONTO = {
  ABERTO_HOJE: "bg-[color:var(--success)]",
  FECHAMENTO_PENDENTE: "bg-[color:var(--warning)]",
  FECHADO: "bg-[color:var(--danger)]",
} as const;

function texto(alerta: AlertaCaixa) {
  if (alerta.estado === "ABERTO_HOJE") return `Caixa aberto desde ${alerta.horaAbertura}`;
  if (alerta.estado === "FECHAMENTO_PENDENTE") return `Caixa de ${alerta.dataAbertura} pendente de fechamento`;
  return "Caixa fechado";
}

/**
 * Selo do estado do caixa no cabeçalho do atendimento. Apenas leitura:
 * usa a mesma classificação do alerta do dashboard e leva à tela do caixa.
 */
export function CaixaStatusPill({ alerta }: { alerta: AlertaCaixa }) {
  return (
    <Link
      href="/caixa"
      className={`inline-flex min-h-10 items-center gap-2 rounded-full px-3.5 text-[13px] font-bold transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] ${ESTILOS[alerta.estado]}`}
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${PONTO[alerta.estado]}`} />
      {texto(alerta)}
    </Link>
  );
}
