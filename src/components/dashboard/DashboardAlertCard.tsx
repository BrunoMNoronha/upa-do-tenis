import Link from "next/link";

export type DashboardAlertTone = "success" | "warning" | "danger" | "neutral";

type DashboardAlertCardProps = {
  tone: DashboardAlertTone;
  /** Ícone SVG decorativo (deve vir com aria-hidden). */
  icon: React.ReactNode;
  title: string;
  description: string;
  link: { href: string; label: string };
  /** "alert" para situações que exigem ação; "status" para informativos. */
  role?: "alert" | "status";
};

const tons: Record<DashboardAlertTone, { borda: string; caixa: string }> = {
  success: { borda: "border-[color:var(--success)]/25", caixa: "bg-[color:var(--success-soft)] text-[color:var(--success)]" },
  warning: { borda: "border-[color:var(--warning)]/35", caixa: "bg-[color:var(--warning-soft)] text-[color:var(--warning)]" },
  danger: { borda: "border-[color:var(--danger)]/30", caixa: "bg-[color:var(--danger-soft)] text-[color:var(--danger)]" },
  neutral: { borda: "border-[color:var(--border)]", caixa: "bg-[color:var(--surface-muted)] text-[color:var(--text-soft)]" },
};

/**
 * Alerta compacto do Dashboard: ícone em caixa de 36px, título, descrição e
 * link contextual. Mesma altura em linha no desktop; no mobile o link desce
 * para baixo da descrição.
 */
export function DashboardAlertCard({ tone, icon, title, description, link, role = "status" }: DashboardAlertCardProps) {
  const estilo = tons[tone];

  return (
    <div
      role={role}
      className={`flex h-full min-h-[68px] flex-col gap-3 rounded-2xl border bg-white px-4 py-3.5 sm:flex-row sm:items-center ${estilo.borda}`}
    >
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] ${estilo.caixa}`}>{icon}</div>
        <div className="flex min-w-0 flex-col gap-0.5">
          <p className="text-sm font-bold text-[color:var(--text)]">{title}</p>
          <p className="text-[13px] text-[color:var(--text-soft)]">{description}</p>
        </div>
      </div>
      <Link
        href={link.href}
        className="inline-flex min-h-[44px] items-center self-start whitespace-nowrap rounded-full px-2 text-[13px] font-bold text-[color:var(--accent)] transition hover:text-[color:var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] sm:-my-2 sm:self-center"
      >
        {link.label}
        <span aria-hidden="true" className="ml-1">→</span>
      </Link>
    </div>
  );
}

export function DashboardAlertCardSkeleton({ label }: { label: string }) {
  return (
    <div
      className="flex min-h-[68px] animate-pulse items-center gap-3.5 rounded-2xl border border-[color:var(--border)] bg-white px-4 py-3.5"
      aria-busy="true"
      aria-label={label}
    >
      <div className="h-9 w-9 shrink-0 rounded-[10px] bg-[color:var(--surface-muted)]" />
      <div className="flex flex-1 flex-col gap-2">
        <div className="h-3 w-40 rounded bg-[color:var(--surface-muted)]" />
        <div className="h-3 w-56 max-w-full rounded bg-[color:var(--surface-muted)]" />
      </div>
    </div>
  );
}

/* Ícones SVG consistentes (traço 2px, 18px), decorativos. */

export function IconeCaixa() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="6" width="18" height="12" rx="2" />
      <circle cx="12" cy="12" r="2.5" />
    </svg>
  );
}

export function IconeCadeado() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 018 0v4" />
    </svg>
  );
}

export function IconeAlerta() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 3l10 18H2z" />
      <path d="M12 10v4M12 17.5h.01" />
    </svg>
  );
}

export function IconeEstoque() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M3 10h18M9 10v10" />
    </svg>
  );
}

export function IconeInfo() {
  return (
    <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8h.01M11 12h1v4h1" />
    </svg>
  );
}
