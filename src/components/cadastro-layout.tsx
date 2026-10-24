import type { ReactNode } from "react";

import { Card } from "@/components/ui";

function composeClasses(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Padrão único das telas de cadastro: linha de contadores, painel de lista
 * (busca, chips, tabela e paginação) e painel lateral de cadastro rápido.
 * Abaixo de `xl` o painel lateral vai para baixo da lista.
 */
export function CadastroLayout({ kpis, lista, aside, className }: { kpis?: ReactNode; lista: ReactNode; aside: ReactNode; className?: string }) {
  return (
    <div className={composeClasses("flex flex-col gap-5", className)}>
      {kpis ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{kpis}</div> : null}
      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_400px]">
        {lista}
        {aside}
      </div>
    </div>
  );
}

type PainelListaProps = {
  /** Barra de busca, chips e contagem exibida acima da tabela. */
  filtros?: ReactNode;
  /** Normalmente a paginação. */
  rodape?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function PainelLista({ filtros, rodape, children, className }: PainelListaProps) {
  return (
    <Card className={composeClasses("flex min-w-0 flex-col overflow-hidden", className)}>
      {filtros ? <div className="flex flex-col gap-3 border-b border-[color:var(--border)] px-[22px] py-4">{filtros}</div> : null}
      {children}
      {rodape ? <div className="mt-auto border-t border-[color:var(--border)] px-[22px] py-3">{rodape}</div> : null}
    </Card>
  );
}

type PainelCadastroRapidoProps = {
  /** Âncora usada pelo botão "Novo X" do cabeçalho. */
  id?: string;
  eyebrow?: string;
  titulo: string;
  dica?: string;
  /** Botões do rodapé (Cancelar / Cadastrar). */
  rodape?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function PainelCadastroRapido({ id = "cadastro-rapido", eyebrow = "Cadastro rápido", titulo, dica, rodape, children, className }: PainelCadastroRapidoProps) {
  return (
    <aside id={id} aria-labelledby={`${id}-titulo`} className={composeClasses("flex flex-col overflow-hidden rounded-[var(--r-card)] border border-[color:var(--border)] bg-white scroll-mt-6", className)}>
      <div className="flex flex-col gap-0.5 border-b border-[color:var(--border)] px-[22px] py-[18px]">
        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[color:var(--accent-strong)]">{eyebrow}</p>
        <h2 id={`${id}-titulo`} className="text-lg font-extrabold text-[color:var(--text)]">{titulo}</h2>
        {dica ? <p className="text-xs text-[color:var(--text-soft)]">{dica}</p> : null}
      </div>
      <div className="flex flex-1 flex-col gap-3.5 px-[22px] py-5">{children}</div>
      {rodape ? (
        <div className="flex flex-wrap items-center justify-between gap-2.5 border-t border-[color:var(--border)] bg-[color:var(--surface)] px-[22px] py-3.5">{rodape}</div>
      ) : null}
    </aside>
  );
}

/** Linha "chips à esquerda · contagem à direita" da barra de filtros. */
export function LinhaFiltros({ children, resumo }: { children: ReactNode; resumo?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {children}
      {resumo ? <p className="text-[13px] text-[color:var(--text-soft)]">{resumo}</p> : null}
    </div>
  );
}
