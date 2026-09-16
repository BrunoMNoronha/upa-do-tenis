import Link from "next/link";

import { formatarDataCabecalho, montarSaudacao } from "./dashboard-header";

type DashboardHeaderProps = {
  /** Nome completo do usuário da sessão; apenas o primeiro nome é exibido. */
  nomeUsuario?: string | null;
  /** Instante de referência (padrão: agora). Usado para saudação e data. */
  agora?: Date;
  nomeEmpresa?: string;
};

const acaoBase =
  "inline-flex min-h-[44px] items-center justify-center gap-2 rounded-full px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] focus-visible:ring-offset-2 focus-visible:ring-offset-[color:var(--background)]";

function IconeVenda() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 7h16l-1.5 9h-13z" />
      <path d="M8 20h.01M16 20h.01" />
    </svg>
  );
}

function IconeMais() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

/**
 * Cabeçalho plano do Dashboard: saudação por horário, primeiro nome da
 * sessão (quando houver), data por extenso e as duas ações principais.
 * Componente sem estado, renderizável no servidor.
 */
export function DashboardHeader({ nomeUsuario, agora = new Date(), nomeEmpresa = "a sapataria" }: DashboardHeaderProps) {
  const saudacao = montarSaudacao(nomeUsuario, agora);
  const data = formatarDataCabecalho(agora);

  return (
    <header className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between lg:gap-6">
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-[color:var(--accent)]">Relatórios e métricas</p>
        <h1 className="text-3xl font-extrabold leading-tight tracking-[-0.01em] text-[color:var(--text)]">{saudacao}</h1>
        <p className="text-sm text-[color:var(--text-soft)]">
          <span>{data}</span>
          <span aria-hidden="true"> · </span>
          <span>Visão geral financeira e operacional de {nomeEmpresa}</span>
        </p>
      </div>

      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center">
        <Link
          href="/vendas-balcao"
          className={`${acaoBase} border border-[color:var(--border)] bg-white text-[color:var(--text)] hover:bg-[color:var(--surface-muted)]`}
        >
          <IconeVenda />
          Venda de balcão
        </Link>
        <Link
          href="/ordens-servico?nova=1"
          className={`${acaoBase} bg-[color:var(--accent)] font-bold text-white hover:bg-[color:var(--accent-strong)]`}
        >
          <IconeMais />
          Nova ordem de serviço
        </Link>
      </div>
    </header>
  );
}
