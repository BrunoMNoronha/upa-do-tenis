import { forwardRef } from "react";
import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost";
type BadgeTone = "neutral" | "success" | "warning" | "danger" | "accent";

type ButtonProps = {
  href?: string;
  variant?: ButtonVariant;
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
  action?: React.ReactNode;
  className?: string;
};

type LabelProps = React.LabelHTMLAttributes<HTMLLabelElement> & {
  className?: string;
  children: React.ReactNode;
};

function composeClasses(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function variantClasses(variant: ButtonVariant) {
  switch (variant) {
    case "secondary":
      return "border border-black/10 bg-white text-slate-700 hover:border-black/15 hover:bg-[color:var(--surface-muted)]";
    case "ghost":
      return "border border-transparent bg-transparent text-slate-700 hover:bg-white/70";
    default:
      return "border border-transparent bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent-strong)]";
  }
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ href, variant = "primary", className, isLoading, disabled, children, ...props }, ref) => {
    const baseClasses = composeClasses(
      "inline-flex items-center justify-center gap-2 rounded-full px-5 py-3 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)] disabled:cursor-not-allowed disabled:opacity-60",
      variantClasses(variant),
      className,
    );

    if (href) {
      return (
        <Link className={baseClasses} href={href}>
          {children}
        </Link>
      );
    }

    return (
      <button ref={ref} className={baseClasses} disabled={isLoading || disabled} {...props}>
        {isLoading && (
          <svg className="h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        )}
        {children}
      </button>
    );
  }
);
Button.displayName = "Button";

export function Card({ className, children }: CardProps) {
  return <section className={composeClasses("rounded-[var(--r-card)] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_16px_36px_rgba(31,41,55,0.06)]", className)}>{children}</section>;
}

export function PanelHeader({ title, description, eyebrow, action, className }: PanelHeaderProps) {
  return (
    <div className={composeClasses("flex flex-wrap items-start justify-between gap-3", className)}>
      <div>
        {eyebrow ? <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[color:var(--accent-strong)]">{eyebrow}</p> : null}
        <h2 className="mt-1 text-lg font-semibold tracking-tight text-[color:var(--text)]">{title}</h2>
        {description ? <p className="mt-1 text-sm leading-5 text-slate-600">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function FilterChip({
  active = false,
  children,
  onClick,
  tone = "accent",
}: {
  active?: boolean;
  children: React.ReactNode;
  onClick?: () => void;
  tone?: "accent" | "warning" | "danger";
}) {
  const activeClasses = {
    accent: "border-[color:var(--accent)] bg-[color:var(--accent-tint)] text-[color:var(--accent-strong)]",
    warning: "border-amber-300 bg-amber-50 text-amber-900",
    danger: "border-rose-300 bg-rose-50 text-rose-800",
  } as const;

  const content = (
    <span className={composeClasses(
      "inline-flex items-center rounded-full border px-3 py-1.5 text-xs font-semibold transition",
      active ? activeClasses[tone] : "border-black/10 bg-white text-slate-600 hover:border-[color:var(--accent-soft)] hover:bg-[color:var(--accent-tint)]",
    )}>
      {children}
    </span>
  );

  return onClick ? <button type="button" onClick={onClick}>{content}</button> : content;
}

export function StatCard({ label, value, hint, active = false, onClick }: {
  label: string;
  value: React.ReactNode;
  hint?: string;
  active?: boolean;
  onClick?: () => void;
}) {
  const content = (
    <div className={composeClasses(
      "rounded-[var(--r-card)] border bg-[color:var(--surface)] px-4 py-3 shadow-[0_8px_22px_rgba(31,41,55,0.04)]",
      active ? "border-[color:var(--accent)]" : "border-[color:var(--border)]",
    )}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight text-[color:var(--text)]">{value}</p>
      {hint ? <p className="mt-0.5 text-xs text-slate-500">{hint}</p> : null}
    </div>
  );

  return onClick ? <button type="button" onClick={onClick} className="text-left">{content}</button> : content;
}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label className={composeClasses("text-sm font-medium text-slate-700", className)} {...props}>
      {children}
    </label>
  );
}

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  (props, ref) => {
    const { className, ...rest } = props;

    return (
      <input
        ref={ref}
        className={composeClasses(
          "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[color:var(--text)] outline-none transition placeholder:text-slate-400 focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]",
          className,
        )}
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
        className={composeClasses(
          "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[color:var(--text)] outline-none transition placeholder:text-slate-400 focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]",
          className,
        )}
        {...rest}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export function Badge({ tone = "neutral", className, children }: CardProps & { tone?: BadgeTone }) {
  const toneClasses = {
    neutral: "bg-slate-100 text-slate-700",
    success: "bg-emerald-100 text-emerald-800",
    warning: "bg-amber-100 text-amber-800",
    danger: "bg-rose-100 text-rose-800",
    accent: "bg-[color:var(--accent-soft)] text-[color:var(--accent-strong)]",
  } as const;

  return <span className={composeClasses("inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold", toneClasses[tone], className)}>{children}</span>;
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
    <div className={composeClasses("flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center", className)}>
      <h3 className="mt-2 text-lg font-semibold text-[color:var(--text)]">{title}</h3>
      <p className="mt-2 text-sm text-slate-600 max-w-sm">{description}</p>
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
    <div className={composeClasses("flex flex-col items-center justify-center rounded-3xl border border-rose-200 bg-rose-50 p-8 text-center", className)}>
      <Badge tone="danger">Erro</Badge>
      <h3 className="mt-4 text-lg font-semibold text-rose-900">{title}</h3>
      <p className="mt-2 text-sm text-rose-700 max-w-sm">{description}</p>
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
      <p className="mt-4 text-sm font-medium text-slate-600">{text}</p>
    </div>
  );
}
