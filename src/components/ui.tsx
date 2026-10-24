import { forwardRef } from "react";
import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost" | "text";
type ButtonSize = "md" | "sm";
type BadgeTone = "neutral" | "success" | "warning" | "danger" | "accent";
type BadgeSize = "sm" | "md";

type ButtonProps = {
  href?: string;
  variant?: ButtonVariant;
  /** `md` (44px, padrão) ou `sm` (36px, ações dentro de linhas de tabela). */
  size?: ButtonSize;
  /** Ícone à esquerda do rótulo (16px). */
  icon?: React.ReactNode;
  className?: string;
  isLoading?: boolean;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children" | "disabled"> & { disabled?: boolean };

type CardProps = {
  className?: string;
  children: React.ReactNode;
};

type PanelHeaderProps = {
  title: string;
  description?: string;
  eyebrow?: string;
  /** Pílula ao lado do título (ex.: "216 ordens"). */
  badge?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
};

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  className?: string;
  /** Acrescenta o marcador visual "*" e o texto "(obrigatório)" para leitores de tela. */
  obrigatorio?: boolean;
  children: React.ReactNode;
};

function composeClasses(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

const FOCO_VISIVEL =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]";

function variantClasses(variant: ButtonVariant) {
  switch (variant) {
    case "secondary":
      return "border border-[color:var(--border-strong)] bg-white text-[color:var(--text)] hover:bg-[color:var(--surface-muted)]";
    case "ghost":
      return "border border-transparent bg-transparent text-slate-700 hover:bg-white/70";
    case "text":
      return "border border-transparent bg-transparent text-[color:var(--accent)] hover:bg-[color:var(--surface-muted)]";
    default:
      return "border border-transparent bg-[color:var(--accent)] font-bold text-white hover:bg-[color:var(--accent-strong)]";
  }
}

function sizeClasses(size: ButtonSize) {
  return size === "sm" ? "min-h-9 px-3.5 py-1 text-[13px]" : "min-h-[44px] px-[18px] py-2 text-sm";
}

/** Classes completas de um botão; úteis para links que precisam do mesmo visual. */
export function classesBotao(variant: ButtonVariant = "primary", size: ButtonSize = "md", className?: string) {
  return composeClasses(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:cursor-not-allowed disabled:opacity-60",
    FOCO_VISIVEL,
    sizeClasses(size),
    variantClasses(variant),
    className,
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ href, variant = "primary", size = "md", icon, className, isLoading, disabled, children, ...props }, ref) => {
    const baseClasses = classesBotao(variant, size, className);

    if (href) {
      return (
        <Link className={baseClasses} href={href}>
          {icon}
          {children}
        </Link>
      );
    }

    return (
      <button ref={ref} className={baseClasses} disabled={isLoading || disabled} {...props}>
        {isLoading ? (
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : (
          icon
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export function Card({ className, children }: CardProps) {
  return <section className={composeClasses("rounded-[var(--r-card)] border border-[color:var(--border)] bg-white", className)}>{children}</section>;
}

export function PanelHeader({ title, description, eyebrow, badge, action, className }: PanelHeaderProps) {
  return (
    <div className={composeClasses("flex flex-wrap items-start justify-between gap-3", className)}>
      <div className="min-w-0">
        {eyebrow ? <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[color:var(--accent-strong)]">{eyebrow}</p> : null}
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className={composeClasses("text-base font-extrabold tracking-tight text-[color:var(--text)]", eyebrow && "mt-0.5")}>{title}</h2>
          {badge}
        </div>
        {description ? <p className="mt-1 text-[13px] leading-5 text-[color:var(--text-soft)]">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

type FilterChipProps = {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  /** Quando informado, o chip navega como link (filtros mantidos na URL). */
  href?: string;
  tone?: "accent" | "warning" | "danger";
};

export function FilterChip({ active = false, children, onClick, href, tone = "accent" }: FilterChipProps) {
  const activeClasses = {
    accent: "border-[color:var(--ink)] bg-[color:var(--ink)] text-white",
    warning: "border-[color:var(--ink)] bg-[color:var(--ink)] text-white",
    danger: "border-[color:var(--danger)] bg-[color:var(--danger)] text-white",
  } as const;

  const content = (
    <span className={composeClasses(
      "inline-flex h-9 items-center whitespace-nowrap rounded-full border px-3.5 text-[13px] font-semibold transition",
      active
        ? activeClasses[tone]
        : "border-[color:var(--border-strong)] bg-white text-[color:var(--text-body)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]",
    )}>
      {children}
    </span>
  );

  // O alvo de toque fica em 44px mesmo com o chip visual de 36px.
  const wrapperClasses = "inline-flex min-h-[44px] items-center rounded-full focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]";

  if (href) {
    return (
      <Link href={href} scroll={false} aria-current={active ? "page" : undefined} className={wrapperClasses}>
        {content}
      </Link>
    );
  }

  return onClick ? (
    <button type="button" onClick={onClick} aria-pressed={active} className={wrapperClasses}>
      {content}
    </button>
  ) : (
    content
  );
}

type KpiDot = "accent" | "success" | "warning" | "danger" | "muted";

type KpiCardProps = {
  label: string;
  value: React.ReactNode;
  hint?: string;
  /** Cor do ponto ao lado do rótulo. */
  dot?: KpiDot;
  /** `danger` pinta o card de vermelho claro (ex.: OS atrasadas). */
  tone?: "default" | "danger";
  /** `md` (valor 28px, 104px de altura) ou `sm` (26px, 96px). */
  size?: "md" | "sm";
  href?: string;
  onClick?: () => void;
  active?: boolean;
  /** Texto de link exibido à direita do rótulo (ex.: "Ver atrasadas →"). */
  linkLabel?: string;
  className?: string;
};

const CORES_PONTO: Record<KpiDot, string> = {
  accent: "bg-[color:var(--accent)]",
  success: "bg-[color:var(--success)]",
  warning: "bg-[color:var(--warning)]",
  danger: "bg-[color:var(--danger)]",
  muted: "bg-[color:var(--muted)]",
};

/**
 * Cartão de indicador: ponto colorido + rótulo, valor em destaque e dica
 * na mesma linha. Vira link ou botão (com `aria-pressed`) quando clicável.
 */
export function KpiCard({
  label,
  value,
  hint,
  dot = "accent",
  tone = "default",
  size = "md",
  href,
  onClick,
  active = false,
  linkLabel,
  className,
}: KpiCardProps) {
  const clicavel = Boolean(href || onClick);
  const perigo = tone === "danger";

  const content = (
    <div
      className={composeClasses(
        "flex h-full flex-col justify-between gap-3 rounded-[18px] border",
        size === "sm" ? "min-h-24 px-5 py-4" : "min-h-[104px] px-5 py-[18px]",
        perigo ? "border-[rgba(185,28,28,0.25)] bg-[color:var(--danger-soft)]" : "bg-white",
        !perigo && (active ? "border-[color:var(--accent)]" : "border-[color:var(--border)]"),
        clicavel && "transition hover:border-[rgba(140,90,50,0.4)]",
        className,
      )}
    >
      <div
        className={composeClasses(
          "flex items-center justify-between gap-2 text-[13px] font-semibold",
          perigo ? "text-[color:var(--danger)]" : "text-[color:var(--text-soft)]",
        )}
      >
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className={composeClasses("h-2 w-2 shrink-0 rounded-full", CORES_PONTO[perigo ? "danger" : dot])} />
          {label}
        </span>
        {linkLabel ? <span className="whitespace-nowrap text-xs font-bold">{linkLabel}</span> : null}
      </div>
      <div className="flex flex-wrap items-baseline gap-2">
        <span
          className={composeClasses(
            "font-extrabold leading-none tracking-[-0.01em]",
            size === "sm" ? "text-[26px]" : "text-[28px]",
            perigo ? "text-[color:var(--danger)]" : "text-[color:var(--text)]",
          )}
        >
          {value}
        </span>
        {hint ? (
          <span className={composeClasses("text-xs", perigo ? "text-[color:var(--danger-badge-text)]" : "text-[color:var(--text-soft)]")}>{hint}</span>
        ) : null}
      </div>
    </div>
  );

  const focusClasses = "block h-full rounded-[18px] text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)]";

  if (href) {
    return (
      <Link href={href} scroll={false} aria-current={active ? "page" : undefined} className={focusClasses}>
        {content}
      </Link>
    );
  }

  if (onClick) {
    return (
      <button type="button" onClick={onClick} aria-pressed={active} className={composeClasses(focusClasses, "w-full")}>
        {content}
      </button>
    );
  }

  return content;
}

/** @deprecated Use `KpiCard`. Mantido para compatibilidade da listagem de OS. */
export function StatCard({ label, value, hint, active = false, onClick }: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return <KpiCard size="sm" label={label} value={value} hint={hint} active={active} onClick={onClick} />;
}

export function Label({ className, obrigatorio = false, children, ...props }: LabelProps) {
  return (
    <label className={composeClasses("text-xs font-bold text-[color:var(--text-body)]", className)} {...props}>
      {children}
      {obrigatorio ? (
        <>
          <span aria-hidden="true"> *</span>
          <span className="sr-only"> (obrigatório)</span>
        </>
      ) : null}
    </label>
  );
}

const CAMPO_CLASSES =
  "w-full rounded-[var(--r-field)] border border-[color:var(--border-strong)] bg-white text-sm text-[color:var(--text)] outline-none transition placeholder:text-slate-400 focus:border-[color:var(--accent)] focus:ring-[3px] focus:ring-[color:var(--focus-ring)] disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-500";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => {
    const { className, type, ...rest } = props;

    if (type === "checkbox" || type === "radio") {
      return (
        <input
          ref={ref}
          type={type}
          className={composeClasses("h-[18px] w-[18px] rounded border-[color:var(--border-strong)] accent-[color:var(--accent)]", className)}
          {...rest}
        />
      );
    }

    return (
      <input
        ref={ref}
        type={type}
        className={composeClasses("h-11 px-3.5", CAMPO_CLASSES, className)}
        {...rest}
      />
    );
  }
);
Input.displayName = "Input";

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  (props, ref) => {
    const { className, ...rest } = props;

    return (
      <textarea
        ref={ref}
        className={composeClasses("min-h-[84px] resize-none px-3.5 py-3", CAMPO_CLASSES, className)}
        {...rest}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export function Badge({ tone = "neutral", size = "sm", className, children }: CardProps & { tone?: BadgeTone; size?: BadgeSize }) {
  const toneClasses = {
    neutral: "bg-[color:var(--surface-muted)] text-[color:var(--text-body)]",
    success: "bg-[color:var(--success-soft)] text-[color:var(--success)]",
    warning: "bg-[color:var(--warning-soft)] text-[color:var(--warning-badge-text)]",
    danger: "bg-[color:var(--danger-badge-bg)] text-[color:var(--danger-badge-text)]",
    accent: "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]",
  } as const;

  return (
    <span
      className={composeClasses(
        "inline-flex items-center whitespace-nowrap rounded-full font-bold",
        size === "md" ? "px-2.5 py-1 text-xs" : "px-[9px] py-[3px] text-[11px]",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

type SearchInputProps = {
  id: string;
  /** Rótulo acessível do campo (não é exibido). */
  label: string;
  value: string;
  onChange: (valor: string) => void;
  /** Quando informado, exibe o botão "Limpar" enquanto houver texto. */
  onClear?: () => void;
  placeholder?: string;
  isPending?: boolean;
  className?: string;
};

/** Campo de busca com lupa, sobre o fundo creme, e botão "Limpar" opcional. */
export function SearchInput({ id, label, value, onChange, onClear, placeholder, isPending = false, className }: SearchInputProps) {
  return (
    <div className={composeClasses("flex items-center gap-2", className)}>
      <div className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-[var(--r-field)] border border-[color:var(--border-strong)] bg-[color:var(--background)] px-3.5 transition focus-within:border-[color:var(--accent)] focus-within:ring-[3px] focus-within:ring-[color:var(--focus-ring)]">
        <svg className="h-[18px] w-[18px] shrink-0 text-[color:var(--text-soft)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" />
        </svg>
        <input
          id={id}
          type="search"
          aria-label={label}
          aria-busy={isPending || undefined}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className="h-full min-w-0 flex-1 bg-transparent text-sm text-[color:var(--text)] outline-none placeholder:text-slate-400"
        />
      </div>
      {value && onClear ? (
        <Button type="button" variant="text" onClick={onClear} className="shrink-0">
          Limpar
        </Button>
      ) : null}
    </div>
  );
}

export function SectionTitle({ className, children }: CardProps) {
  return <h2 className={composeClasses("text-2xl font-semibold tracking-tight text-[color:var(--text)]", className)}>{children}</h2>;
}

type EmptyStateProps = {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

export function EmptyState({ title, description, action, className }: EmptyStateProps) {
  return (
    <div className={composeClasses("flex flex-col items-center justify-center rounded-[var(--r-card)] border border-dashed border-[color:var(--border-strong)] bg-[color:var(--background)] p-12 text-center", className)}>
      <h3 className="mt-2 text-lg font-semibold text-[color:var(--text)]">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-[color:var(--text-soft)]">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

type ErrorStateProps = {
  title?: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
};

export function ErrorState({ title = "Ocorreu um erro", description, action, className }: ErrorStateProps) {
  return (
    <div className={composeClasses("flex flex-col items-center justify-center rounded-[var(--r-card)] border border-rose-200 bg-rose-50 p-8 text-center", className)}>
      <Badge tone="danger">Erro</Badge>
      <h3 className="mt-4 text-lg font-semibold text-rose-900">{title}</h3>
      <p className="mt-2 max-w-sm text-sm text-rose-700">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

type LoadingStateProps = {
  text?: string;
  className?: string;
};

export function LoadingState({ text = "Carregando...", className }: LoadingStateProps) {
  return (
    <div className={composeClasses("flex flex-col items-center justify-center p-12 text-center", className)}>
      <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-t-2 border-[color:var(--accent-strong)]"></div>
      <p className="mt-4 text-sm font-medium text-[color:var(--text-soft)]">{text}</p>
    </div>
  );
}
