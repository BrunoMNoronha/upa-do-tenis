import Link from "next/link";

type DashboardPanelProps = {
  title: string;
  description?: string;
  /** Link contextual no canto superior direito (ex.: "Ver todas"). */
  action?: { href: string; label: string };
  className?: string;
  children: React.ReactNode;
};

export const linkContextual =
  "inline-flex min-h-[44px] items-center whitespace-nowrap rounded-full px-2 text-[13px] font-bold text-[color:var(--accent)] transition hover:text-[color:var(--accent-strong)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)]";

/** Card base dos blocos analíticos do Dashboard: título, descrição e ação. */
export function DashboardPanel({ title, description, action, className = "", children }: DashboardPanelProps) {
  return (
    <section
      aria-label={title}
      className={`flex flex-col gap-4 rounded-[var(--r-card)] border border-[color:var(--border)] bg-white p-5 sm:p-6 ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-base font-extrabold text-[color:var(--text)]">{title}</h2>
          {description ? <p className="text-[13px] text-[color:var(--text-soft)]">{description}</p> : null}
        </div>
        {action ? (
          <Link href={action.href} className={`${linkContextual} -my-2 shrink-0`}>
            {action.label}
            <span aria-hidden="true" className="ml-1">→</span>
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}
