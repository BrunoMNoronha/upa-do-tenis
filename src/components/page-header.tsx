import Link from "next/link";
import type { ReactNode } from "react";

export type ItemBreadcrumb = {
  label: string;
  /** Sem `href`, o item é a página atual. */
  href?: string;
};

type PageHeaderProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  breadcrumb?: ItemBreadcrumb[];
  /** Badges exibidas na mesma linha do título. */
  badges?: ReactNode;
  /** Botões à direita (no mobile ficam abaixo do texto). */
  actions?: ReactNode;
  className?: string;
};

/**
 * Cabeçalho plano das páginas internas: eyebrow em caixa alta, título em
 * destaque, descrição curta e ações alinhadas à direita. Sem estado;
 * renderizável no servidor.
 */
export function PageHeader({ eyebrow, title, description, breadcrumb, badges, actions, className }: PageHeaderProps) {
  return (
    <header className={["flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-6", className].filter(Boolean).join(" ")}>
      <div className="flex min-w-0 flex-col gap-1.5">
        {breadcrumb && breadcrumb.length > 0 ? (
          <nav aria-label="Navegação estrutural" className="text-[13px] font-semibold text-[color:var(--text-soft)]">
            <ol className="flex flex-wrap items-center gap-1.5">
              {breadcrumb.map((item, indice) => {
                const ultimo = indice === breadcrumb.length - 1;
                return (
                  <li key={`${item.label}-${indice}`} className="flex items-center gap-1.5">
                    {item.href && !ultimo ? (
                      <Link href={item.href} className="text-[color:var(--accent)] transition hover:text-[color:var(--accent-strong)]">
                        {item.label}
                      </Link>
                    ) : (
                      <span aria-current={ultimo ? "page" : undefined} className="text-[color:var(--text)]">
                        {item.label}
                      </span>
                    )}
                    {!ultimo ? <span aria-hidden="true">/</span> : null}
                  </li>
                );
              })}
            </ol>
          </nav>
        ) : null}

        {eyebrow ? <p className="text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--accent)]">{eyebrow}</p> : null}

        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-extrabold leading-[1.1] tracking-[-0.01em] text-[color:var(--text)]">{title}</h1>
          {badges ? <div className="flex flex-wrap items-center gap-1.5">{badges}</div> : null}
        </div>

        {description ? <p className="max-w-3xl text-sm text-[color:var(--text-soft)]">{description}</p> : null}
      </div>

      {actions ? <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">{actions}</div> : null}
    </header>
  );
}
