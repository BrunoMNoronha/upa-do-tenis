/**
 * Classes compartilhadas da landing. A identidade é própria do produto
 * (tokens `--lp-*` definidos no root em `src/app/page.tsx`), separada dos
 * tokens da interface interna em `globals.css`.
 */

export const CONTAINER = "mx-auto w-full max-w-6xl px-4 sm:px-8";

export const BOTAO_PRIMARIO =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[color:var(--lp-accent)] px-6 text-base font-semibold text-white transition-colors hover:bg-[color:var(--lp-accent-strong)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--lp-accent)]";

export const BOTAO_SECUNDARIO =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-lg border border-[color:var(--lp-border-strong)] bg-white px-5 text-base font-semibold text-[color:var(--lp-ink)] transition-colors hover:bg-[color:var(--lp-surface-muted)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--lp-accent)]";

export const EYEBROW =
  "text-[13px] font-semibold uppercase tracking-[0.08em] text-[color:var(--lp-accent)]";

export const TITULO_SECAO =
  "text-balance text-[2rem] font-bold leading-[1.1] tracking-[-0.02em] text-[color:var(--lp-ink)] [font-family:var(--lp-display)] sm:text-[2.6rem]";

export const TEXTO_SECAO = "text-pretty text-lg leading-relaxed text-[color:var(--lp-muted)]";

export const CARD = "rounded-xl border border-[color:var(--lp-border)] bg-white";
