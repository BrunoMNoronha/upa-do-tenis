"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Badge } from "@/components/ui";

type NavItem = {
  href: string;
  label: string;
};

const navItems: NavItem[] = [
  { href: "/", label: "Início" },
  { href: "/clientes", label: "Clientes" },
  { href: "/ordens-servico", label: "Ordens de Serviço" },
];

type AppShellProps = {
  title: string;
  description: string;
  eyebrow?: string;
  action?: {
    href: string;
    label: string;
  };
  children: React.ReactNode;
};

export function AppShell({ title, description, eyebrow, action, children }: AppShellProps) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-[color:var(--border)] bg-[color:var(--background)]/90 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-strong)]">UPA do Tênis</p>
              <p className="mt-1 text-sm text-slate-600">Sapataria Alves</p>
            </div>

            <div className="flex items-center gap-3">
              <Badge tone="accent">MVP v1</Badge>
              {action ? (
                <Link className="inline-flex items-center rounded-full bg-[color:var(--accent)] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[color:var(--accent-strong)]" href={action.href}>
                  {action.label}
                </Link>
              ) : null}
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "bg-[color:var(--accent)] text-white shadow-sm"
                      : "bg-white/70 text-slate-700 hover:bg-white hover:text-[color:var(--accent-strong)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <section className="mb-8 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_18px_44px_rgba(31,41,55,0.08)] sm:p-8">
          {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-strong)]">{eyebrow}</p> : null}
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--text)] md:text-4xl">{title}</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 md:text-base">{description}</p>
        </section>

        {children}
      </main>
    </div>
  );
}