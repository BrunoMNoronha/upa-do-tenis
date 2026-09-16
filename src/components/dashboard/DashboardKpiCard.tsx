import Link from "next/link";

export type DashboardKpiCardProps = {
  label: string;
  value: string;
  description: string;
  badge?: string;
  tone?: "default" | "highlight";
  href?: string;
  loading?: boolean;
};

const alturaCard = "min-h-[132px]";

/**
 * Card de KPI do Dashboard: rótulo, valor grande, descrição curta e badge
 * opcional. A variante `highlight` destaca o KPI principal em fundo escuro.
 */
export function DashboardKpiCard({
  label,
  value,
  description,
  badge,
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
      className={`${alturaCard} flex h-full flex-col justify-between rounded-[var(--r-card)] border p-5 transition ${
        destaque
          ? "border-transparent bg-[color:var(--ink)] text-white"
          : "border-[color:var(--border)] bg-white text-[color:var(--text)]"
      } ${href ? "hover:border-[color:var(--accent)]/40" : ""}`}
    >
      <div className="flex items-start justify-between gap-3">
        <p className={`text-[13px] font-semibold ${destaque ? "text-gray-300" : "text-[color:var(--text-soft)]"}`}>{label}</p>
        {badge ? (
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-bold ${
              destaque ? "bg-white/15 text-white" : "bg-[color:var(--warning-soft)] text-amber-800"
            }`}
          >
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mt-3 break-words text-[1.75rem] font-extrabold leading-none tracking-[-0.02em] sm:text-3xl">{value}</p>
      <p className={`mt-3 text-xs ${destaque ? "text-gray-300" : "text-[color:var(--text-soft)]"}`}>{description}</p>
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
