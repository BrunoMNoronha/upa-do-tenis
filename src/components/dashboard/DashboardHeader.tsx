import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui";

import { formatarDataCabecalho, montarSaudacao } from "./dashboard-header";

type DashboardHeaderProps = {
  /** Nome completo do usuário da sessão; apenas o primeiro nome é exibido. */
  nomeUsuario?: string | null;
  /** Instante de referência (padrão: agora). Usado para saudação e data. */
  agora?: Date;
  nomeEmpresa?: string;
};

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
    <PageHeader
      eyebrow="Relatórios e métricas"
      title={saudacao}
      description={
        <>
          <span>{data}</span>
          <span aria-hidden="true"> · </span>
          <span>Visão geral financeira e operacional de {nomeEmpresa}</span>
        </>
      }
      actions={
        <>
          <Button href="/vendas-balcao" variant="secondary" icon={<IconeVenda />}>
            Venda de balcão
          </Button>
          <Button href="/ordens-servico?nova=1" icon={<IconeMais />}>
            Nova ordem de serviço
          </Button>
        </>
      }
    />
  );
}
