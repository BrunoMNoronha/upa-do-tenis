"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";

import { Badge } from "@/components/ui";

type NavItem = {
  href: string;
  label: string;
  icon?: string;
};

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/ordens-servico", label: "Ordens de Serviço" },
  { href: "/clientes", label: "Clientes" },
  { href: "/servicos", label: "Serviços" },
  { href: "/insumos", label: "Estoque / Insumos" },
  { href: "/relatorios/financeiro-os", label: "Relatórios" },
  { href: "/caixa", label: "Caixa" },
  { href: "/formas-pagamento", label: "Financeiro" },
  { href: "/usuarios", label: "Usuários" },
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
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogout = async () => {
    setIsLoggingOut(true);

    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {
      // Mesmo com falha de rede, redireciona para a tela de login.
    }

    router.replace("/login");
    router.refresh();
  };

  return (
    <div className="flex min-h-screen bg-[color:var(--background)]">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-[color:var(--border)] bg-[color:var(--surface)] transition-transform duration-200 ease-in-out lg:static lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="flex h-16 items-center border-b border-[color:var(--border)] px-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-strong)]">UPA do Tênis</p>
              <p className="mt-0.5 text-xs text-slate-500">Sapataria Alves</p>
            </div>
          </div>

          <nav className="flex-1 space-y-1 overflow-y-auto px-4 py-6">
            {navItems.map((item) => {
              const isActive = item.href === "/"
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsMobileMenuOpen(false)}
                  className={`block rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-[color:var(--accent)] text-white shadow-sm"
                      : "text-slate-700 hover:bg-slate-100 hover:text-[color:var(--accent-strong)]"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center justify-between gap-3 border-t border-[color:var(--border)] p-4">
            <Badge tone="accent">MVP v1</Badge>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              className="rounded-full border border-[color:var(--border)] px-4 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-[color:var(--accent-strong)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoggingOut ? "Saindo..." : "Sair"}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--surface)] px-4 lg:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-semibold text-slate-800">UPA do Tênis</span>
          </div>
          {action ? (
            <Link className="inline-flex items-center rounded-full bg-[color:var(--accent)] px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-[color:var(--accent-strong)]" href={action.href}>
              {action.label}
            </Link>
          ) : null}
        </header>

        {/* Main Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8">
            <section className="mb-8 flex flex-wrap items-start justify-between gap-4 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_18px_44px_rgba(31,41,55,0.08)] sm:p-8">
              <div>
                {eyebrow ? <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[color:var(--accent-strong)]">{eyebrow}</p> : null}
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--text)] md:text-4xl">{title}</h1>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700 md:text-base">{description}</p>
              </div>
              
              <div className="hidden lg:block">
                {action ? (
                  <Link className="inline-flex items-center rounded-full bg-[color:var(--accent)] px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-[color:var(--accent-strong)] hover:shadow" href={action.href}>
                    {action.label}
                  </Link>
                ) : null}
              </div>
            </section>

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}