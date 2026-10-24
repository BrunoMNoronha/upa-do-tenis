"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { LinkAcaoNaPagina } from "@/components/link-acao-na-pagina";
import { PageHeader } from "@/components/page-header";
import { navGroups } from "@/config/navigation";
import { DADOS_EMPRESA_PADRAO, nomeExibicaoEmpresa, type DadosEmpresa } from "@/lib/dados-empresa";
import { iniciais } from "@/lib/iniciais";

const SIDEBAR_COLLAPSED_KEY = "upa:sidebar-collapsed";

type UsuarioShell = {
  nome: string;
  email?: string | null;
};

type AppShellProps = {
  dadosEmpresa?: DadosEmpresa;
  /** Usuário da sessão, exibido no rodapé do menu (iniciais, nome e e-mail). */
  usuario?: UsuarioShell | null;
  title: string;
  description: string;
  eyebrow?: string;
  /** Ação única em forma de link; quando só acrescenta parâmetros à URL, aplica com pushState. */
  action?: {
    href: string;
    label: string;
  };
  /** Botões do cabeçalho; quando informado, substitui `action`. */
  actions?: ReactNode;
  /**
   * Cabeçalho customizado. Quando informado, substitui o cabeçalho plano
   * padrão (eyebrow/título/descrição/ações).
   */
  header?: ReactNode;
  /** Não renderiza cabeçalho algum; a página desenha o próprio. */
  ocultarCabecalho?: boolean;
  children: ReactNode;
};

function IconeSair({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M10 4H5v16h5" />
      <path d="M14 8l4 4-4 4M18 12H9" />
    </svg>
  );
}

function IconeRecolher({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
    </svg>
  );
}

export function AppShell({
  title,
  description,
  eyebrow,
  action,
  actions,
  header,
  ocultarCabecalho = false,
  children,
  dadosEmpresa,
  usuario,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  // Inicia expandido no servidor e no primeiro render do cliente para evitar
  // divergência de hidratação; a preferência salva é aplicada após montar.
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [identidade, setIdentidade] = useState(dadosEmpresa ?? DADOS_EMPRESA_PADRAO);

  useEffect(() => {
    try {
      setIsCollapsed(window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "1");
    } catch {
      // localStorage indisponível (ex.: modo privado restrito): mantém expandido.
    }
  }, []);

  useEffect(() => {
    if (dadosEmpresa) {
      setIdentidade(dadosEmpresa);
      return;
    }
    let ativo = true;
    fetch("/api/configuracoes/dados-empresa")
      .then((resposta) => (resposta.ok ? resposta.json() : null))
      .then((dados) => {
        if (ativo && dados?.nomeFantasia) setIdentidade(dados);
      })
      .catch(() => undefined);
    return () => { ativo = false; };
  }, [dadosEmpresa]);

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
  const somenteExpandido = collapsedOnDesktop ? "lg:hidden" : "";

  const acoesCabecalho = actions ?? (action ? (
    <LinkAcaoNaPagina href={action.href}>{action.label}</LinkAcaoNaPagina>
  ) : undefined);

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
        className={`fixed inset-y-0 left-0 z-50 flex w-[248px] transform flex-col border-r border-[color:var(--border)] bg-[color:var(--surface)] transition-[transform,width] duration-200 ease-in-out lg:static lg:translate-x-0 print:hidden ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        } ${collapsedOnDesktop ? "lg:w-[4.5rem]" : "lg:w-[248px]"}`}
      >
        <div className="flex h-full flex-col px-4 py-6">
          {/* Marca */}
          <div className={`flex items-center gap-3 px-2 pb-5 ${collapsedOnDesktop ? "lg:flex-col lg:px-0" : ""}`}>
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[color:var(--accent)] text-[15px] font-extrabold tracking-[0.02em] text-white"
              aria-hidden="true"
            >
              {iniciais(identidade.nomeFantasia)}
            </div>
            <div className={`flex min-w-0 flex-1 flex-col gap-0.5 ${somenteExpandido}`}>
              <p className="truncate text-[15px] font-extrabold leading-[1.1] text-[color:var(--text)]">{identidade.nomeFantasia}</p>
              {identidade.nomeComplementar ? (
                <p className="truncate text-xs font-semibold text-[color:var(--text-soft)]">{identidade.nomeComplementar}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={toggleCollapsed}
              aria-expanded={!isCollapsed}
              aria-label={isCollapsed ? "Expandir menu" : "Recolher menu"}
              title={isCollapsed ? "Expandir menu" : "Recolher menu"}
              className="hidden h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[color:var(--text-soft)] transition hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--accent-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] lg:inline-flex"
            >
              <IconeRecolher className={`h-[18px] w-[18px] transition-transform duration-200 ${isCollapsed ? "rotate-180" : ""}`} />
            </button>
          </div>

          <nav className="flex flex-1 flex-col gap-5 overflow-y-auto overflow-x-hidden">
            {navGroups.map((group) => (
              <div key={group.label} className="flex flex-col gap-1">
                <p className={`px-3.5 pb-1.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--accent)] ${somenteExpandido}`}>
                  {group.label}
                </p>
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
                      className={`flex h-11 items-center gap-3 rounded-xl px-3.5 text-sm font-semibold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] ${
                        collapsedOnDesktop ? "lg:justify-center lg:px-0" : ""
                      } ${
                        isActive
                          ? "bg-[color:var(--accent)] text-white hover:bg-[color:var(--accent-strong)]"
                          : "text-[color:var(--text-body)] hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--text)]"
                      }`}
                    >
                      <Icon className="h-[18px] w-[18px] shrink-0" />
                      <span className={`truncate ${somenteExpandido}`}>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            ))}
          </nav>

          {/* Usuário */}
          <div className={`flex items-center gap-2.5 border-t border-[color:var(--border)] px-2 pt-3.5 ${collapsedOnDesktop ? "lg:flex-col lg:px-0" : ""}`}>
            {usuario ? (
              <>
                <div
                  className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-full bg-[color:var(--accent-soft)] text-[13px] font-extrabold text-[color:var(--accent-strong)]"
                  aria-hidden="true"
                  title={collapsedOnDesktop ? usuario.nome : undefined}
                >
                  {iniciais(usuario.nome)}
                </div>
                <div className={`flex min-w-0 flex-1 flex-col ${somenteExpandido}`}>
                  <p className="truncate text-[13px] font-bold text-[color:var(--text)]">{usuario.nome}</p>
                  {usuario.email ? <p className="truncate text-xs text-[color:var(--text-soft)]">{usuario.email}</p> : null}
                </div>
              </>
            ) : (
              <span className={`flex-1 ${somenteExpandido}`} />
            )}
            <button
              type="button"
              onClick={handleLogout}
              disabled={isLoggingOut}
              aria-label={isLoggingOut ? "Saindo..." : "Sair"}
              title="Sair"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[color:var(--text-soft)] transition hover:bg-[color:var(--surface-muted)] hover:text-[color:var(--accent-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-[color:var(--accent)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              <IconeSair className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="flex h-16 items-center justify-between border-b border-[color:var(--border)] bg-[color:var(--surface)] px-4 lg:hidden print:hidden">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Abrir menu"
              className="rounded-md p-2 text-[color:var(--text-soft)] hover:bg-[color:var(--surface-muted)]"
            >
              <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <span className="font-semibold text-[color:var(--text)]">{nomeExibicaoEmpresa(identidade)}</span>
          </div>
        </header>

        {/* Main Area */}
        <main className="flex-1 overflow-y-auto">
          <div className="px-5 py-6 lg:px-9 lg:py-8 print:p-0">
            {header ? (
              <div className="mb-5 print:hidden">{header}</div>
            ) : ocultarCabecalho ? null : (
              <PageHeader
                className="mb-5 print:hidden"
                eyebrow={eyebrow}
                title={title}
                description={description}
                actions={acoesCabecalho}
              />
            )}

            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
