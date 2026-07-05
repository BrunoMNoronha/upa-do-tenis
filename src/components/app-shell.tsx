"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui";
import { navGroups } from "@/config/navigation";

const SIDEBAR_COLLAPSED_KEY = "upa:sidebar-collapsed";

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
  // Inicia expandido no servidor e no primeiro render do cliente para evitar
  // divergência de hidratação; a preferência salva é aplicada após montar.
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      setIsCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      // localStorage indisponível (ex.: modo privado restrito): mantém expandido.
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((current) => {
      const next = !current;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        // Sem persistência disponível, o estado vale só para a sessão atual.
      }
      return next;
    });
  };

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

  // No mobile o menu abre como drawer sempre expandido; o recolhimento vale
  // apenas para desktop (lg+), por isso as classes condicionais usam lg:.
  const collapsedOnDesktop = isCollapsed;

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
        aria-label="Menu principal"
        className={`fixed inset-y-0 left-0 z-50 w-64 transform border-r border-[color:var(--border)] bg-[color:var(--surface)] transition-[transform,width] duration-200 ease-in-out lg:static lg:translate-x-0 print:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsedOnDesktop ? "lg:w-[4.5rem]" : "lg:w-64"}`}
      >
        <div className="flex h-full flex-col">
          <div
            className={`flex h-16 items-center border-b border-[color:var(--border)] ${
              collapsedOnDesktop ? "px-6 lg:justify-center lg:px-2" : "justify-between px-6 lg:pr-3"
            }`}
          >
            <div className={collapsedOnDesktop ? "lg:hidden" : ""}>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-strong)]">UPA do Tênis</p>
              <p className="mt-0.5 text-xs text-slate-500">Sapataria Alves</p>
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
              className="hidden rounded-md p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-[color:var(--accent-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] lg:inline-flex"
            >
              <svg
                className={`h-5 w-5 transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 space-y-4 overflow-y-auto overflow-x-hidden px-3 py-5">
            {navGroups.map((group) => (
              <div key={group.label}>
                <p
                  className={`px-3 pb-1.5 text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-slate-400 ${
                    collapsedOnDesktop ? "lg:hidden" : ""
                  }`}
                >
                  {group.label}
                </p>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const isActive = item.href === "/"
                      ? pathname === item.href
                      : pathname === item.href || pathname.startsWith(`${item.href}/`);
                    const Icon = item.icon;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setIsMobileMenuOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        aria-label={item.label}
                        title={collapsedOnDesktop ? item.label : undefined}
                        className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] ${
                          collapsedOnDesktop ? "lg:justify-center lg:px-0" : ""
                        } ${
                          isActive
                            ? "bg-[color:var(--accent)] text-white shadow-sm"
                            : "text-slate-700 hover:bg-slate-100 hover:text-[color:var(--accent-strong)]"
                        }`}
                      >
                        <Icon className="h-5 w-5 shrink-0" />
                        <span className={`truncate ${collapsedOnDesktop ? "lg:hidden" : ""}`}>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>

          <div
            className={`flex items-center gap-3 border-t border-[color:var(--border)] p-4 ${
              collapsedOnDesktop ? "justify-between lg:justify-center lg:p-2" : "justify-between"
            }`}
          >
            <span className={collapsedOnDesktop ? "lg:hidden" : ""}>
              <Badge tone="accent">MVP v1</Badge>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label={isLoggingOut ? "Saindo..." : "Sair"}
              title="Sair"
              className={`rounded-full border border-[color:var(--border)] text-xs font-semibold text-slate-600 transition hover:bg-slate-100 hover:text-[color:var(--accent-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60 ${
                collapsedOnDesktop ? "px-4 py-1.5 lg:border-0 lg:p-2" : "px-4 py-1.5"
              }`}
            >
              <span className={collapsedOnDesktop ? "lg:hidden" : ""}>
                {isLoggingOut ? "Saindo..." : "Sair"}
              </span>
              {collapsedOnDesktop ? (
                <svg
                  className="hidden h-5 w-5 lg:block"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.8}
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                  />
                </svg>
              ) : null}
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--surface)] px-4 lg:hidden print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir menu"
              className="rounded-md p-2 text-slate-500 hover:bg-slate-100"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
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
          <div className="mx-auto max-w-7xl p-4 sm:p-6 lg:p-8 print:p-0">
            <section className="mb-8 flex flex-wrap items-start justify-between gap-4 rounded-[2rem] border border-[color:var(--border)] bg-[color:var(--surface)] p-6 shadow-[0_18px_44px_rgba(31,41,55,0.08)] sm:p-8 print:hidden">
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
