import type { CSSProperties, ReactNode } from "react";

type ColunasProps = {
  /** Valor de `grid-template-columns` (ex.: "1.5fr 1.3fr 1fr"). */
  colunas: string;
};

function estiloColunas(colunas: string): CSSProperties {
  return { "--colunas": colunas } as CSSProperties;
}

function composeClasses(...classes: Array<string | undefined | false | null>) {
  return classes.filter(Boolean).join(" ");
}

/**
 * Tabela em grid, no padrão do design: cabeçalho em caixa alta sobre o fundo
 * creme, linhas com divisória e hover. Abaixo de `lg` o cabeçalho some e cada
 * célula mostra o próprio rótulo, empilhando o conteúdo.
 */
export function Tabela({ children, className, ...props }: { children: ReactNode; className?: string; "aria-label"?: string }) {
  return (
    <div role="table" aria-label={props["aria-label"]} className={composeClasses("flex flex-col", className)}>
      {children}
    </div>
  );
}

export function TabelaCabecalho({ colunas, children }: ColunasProps & { children: ReactNode }) {
  return (
    <div
      role="row"
      style={estiloColunas(colunas)}
      className="hidden items-center gap-4 bg-[color:var(--background)] px-[22px] py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-soft)] lg:grid lg:grid-cols-[var(--colunas)]"
    >
      {children}
    </div>
  );
}

export function TabelaColuna({ children, alinharDireita = false }: { children: ReactNode; alinharDireita?: boolean }) {
  return (
    <div role="columnheader" className={alinharDireita ? "text-right" : undefined}>
      {children}
    </div>
  );
}

type TabelaLinhaProps = ColunasProps & {
  children: ReactNode;
  /** Registros inativos/cancelados ficam esmaecidos. */
  inativa?: boolean;
  /** Fundo levemente destacado (ex.: OS favorita). */
  destaque?: boolean;
  className?: string;
};

export function TabelaLinha({ colunas, children, inativa = false, destaque = false, className }: TabelaLinhaProps) {
  return (
    <div
      role="row"
      style={estiloColunas(colunas)}
      className={composeClasses(
        "grid gap-2 border-b border-[rgba(74,53,35,0.1)] px-[22px] py-3.5 transition last:border-b-0 hover:bg-[color:var(--background)] lg:grid-cols-[var(--colunas)] lg:items-center lg:gap-4",
        inativa && "opacity-70",
        destaque && "bg-[color:var(--surface)]",
        className,
      )}
    >
      {children}
    </div>
  );
}

type TabelaCelulaProps = {
  children: ReactNode;
  /** Rótulo exibido só no empilhamento mobile. */
  rotulo?: string;
  alinharDireita?: boolean;
  className?: string;
};

export function TabelaCelula({ children, rotulo, alinharDireita = false, className }: TabelaCelulaProps) {
  return (
    <div role="cell" className={composeClasses("min-w-0", alinharDireita && "lg:text-right", className)}>
      {rotulo ? (
        <span className="mb-0.5 block text-[11px] font-bold uppercase tracking-[0.08em] text-[color:var(--text-soft)] lg:hidden">{rotulo}</span>
      ) : null}
      {children}
    </div>
  );
}

export function TabelaVazia({ mensagem, acao }: { mensagem: string; acao?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-4 px-[22px] py-10 text-center text-sm text-[color:var(--text-soft)]">
      <p>{mensagem}</p>
      {acao}
    </div>
  );
}

/** Texto principal de uma célula (14px, negrito). */
export function CelulaTitulo({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={composeClasses("truncate text-sm font-bold text-[color:var(--text)]", className)}>{children}</div>;
}

/** Texto secundário de uma célula (12px, cinza). */
export function CelulaSubtitulo({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={composeClasses("truncate text-xs text-[color:var(--text-soft)]", className)}>{children}</div>;
}
