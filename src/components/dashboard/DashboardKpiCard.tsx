import Link from "next/link";

export type DashboardKpiCardProps = {
  label: string;
  value: string;
  description: string;
  badge?: string;
  /** Cor da badge nos cards claros (o card de destaque usa sempre tom claro sobre escuro). */
  badgeTone?: "warning" | "success" | "accent";
  tone?: "default" | "highlight";
  href?: string;
  loading?: boolean;
};

const alturaCard = "min-h-[132px]";

const TONS_BADGE = {
  warning: "bg-[color:var(--warning-soft)] text-[color:var(--warning-badge-text)]",
  success: "bg-[color:var(--success-soft)] text-[color:var(--success)]",
  accent: "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]",
} as const;

/**
 * Card de KPI do Dashboard: rótulo, valor grande, descrição curta e badge
 * opcional. A variante `highlight` destaca o KPI principal em fundo escuro.
 */
export function DashboardKpiCard({
  label,
  value,
  description,
  badge,
  badgeTone = "warning",
  tone = "default",
  href,
  loading = false,
}: DashboardKpiCardProps) {
  const destaque = tone === "highlight";

  if (loading) {
    return (
      <div
        className={`${alturaCard} animate-pulse rounded-[var(--r-card)] border border-[color:var(--border)] bg-white p-5`}
        aria-busy="true"
        aria-label={`Carregando ${label}`}
      >
        <div className="h-3 w-24 rounded bg-[color:var(--surface-muted)]" />
        <div className="mt-8 h-7 w-32 rounded bg-[color:var(--surface-muted)]" />
        <div className="mt-4 h-3 w-40 rounded bg-[color:var(--surface-muted)]" />
      </div>
    );
  }

  const conteudo = (
    <div
      className={`${alturaCard} flex h-full flex-col justify-between gap-3 rounded-[var(--r-card)] px-[22px] py-5 transition ${
        destaque
          ? "bg-[color:var(--ink)] text-white"
          : "border border-[color:var(--border)] bg-white text-[color:var(--text)]"
      } ${href && !destaque ? "hover:border-[rgba(140,90,50,0.4)]" : ""} ${href && destaque ? "hover:bg-[#2b3646]" : ""}`}
    >
      <div className="flex items-center justify-between gap-3">
        <p className={`text-[13px] font-semibold ${destaque ? "text-[color:var(--on-dark-soft)]" : "text-[color:var(--text-soft)]"}`}>{label}</p>
        {badge ? (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
              destaque ? "bg-white/[0.12] text-[#bbf7d0]" : TONS_BADGE[badgeTone]
            }`}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <p className="break-words text-[1.75rem] font-extrabold leading-none tracking-[-0.02em] sm:text-3xl">{value}</p>
      <p className={`text-xs ${destaque ? "text-[color:var(--on-dark-soft)]" : "text-[color:var(--text-soft)]"}`}>{description}</p>
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-[var(--r-card)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]"
        aria-label={`${label}: ${value}`}
      >
        {conteudo}
      </Link>
    );
  }

  return conteudo;
}
