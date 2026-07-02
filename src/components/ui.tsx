import Link from "next/link";

type ButtonVariant = "primary" | "secondary" | "ghost";
type BadgeTone = "neutral" | "success" | "warning" | "danger" | "accent";

type ButtonProps = {
  href?: string;
  variant?: ButtonVariant;
  className?: string;
  children: React.ReactNode;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

type CardProps = {
  className?: string;
  children: React.ReactNode;
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

export function Button({ href, variant = "primary", className, children, ...props }: ButtonProps) {
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
    <button className={baseClasses} {...props}>
      {children}
    </button>
  );
}

export function Card({ className, children }: CardProps) {
  return <section className={composeClasses("rounded-[1.75rem] border border-[color:var(--border)] bg-[color:var(--surface)] shadow-[0_20px_40px_rgba(31,41,55,0.07)]", className)}>{children}</section>;
}

export function Label({ className, children, ...props }: LabelProps) {
  return (
    <label className={composeClasses("text-sm font-medium text-slate-700", className)} {...props}>
      {children}
    </label>
  );
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const { className, ...rest } = props;

  return (
    <input
      className={composeClasses(
        "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[color:var(--text)] outline-none transition placeholder:text-slate-400 focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]",
        className,
      )}
      {...rest}
    />
  );
}

export function Textarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const { className, ...rest } = props;

  return (
    <textarea
      className={composeClasses(
        "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[color:var(--text)] outline-none transition placeholder:text-slate-400 focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]",
        className,
      )}
      {...rest}
    />
  );
}

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