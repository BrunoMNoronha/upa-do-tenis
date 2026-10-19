import { PRODUTO } from "@/config/landing";

import { BOTAO_PRIMARIO, CONTAINER } from "./landing-estilos";
import { IconeCamadas, IconeMenu } from "./landing-icones";

const LINKS = [
  { href: "#funcionalidades", label: "Funcionalidades" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#preco", label: "Preço" },
  { href: "#faq", label: "Perguntas" },
] as const;

type Props = {
  /** Link do CTA principal; sem link, o botão não é renderizado. */
  ctaHref: string | null;
};

/**
 * Navegação da landing. No celular, os links ficam em um `<details>` nativo
 * (acessível por teclado e pesquisável, sem JavaScript); a partir de `md`
 * aparecem em linha.
 */
export function LandingNav({ ctaHref }: Props) {
  return (
    <header className="border-b border-[color:var(--lp-border)] bg-[color:var(--lp-bg)]">
      <nav aria-label="Principal" className={`${CONTAINER} flex min-h-[72px] flex-wrap items-center justify-between gap-x-6 gap-y-3 py-3`}>
        <a
          href="#topo"
          className="inline-flex items-center gap-2.5 text-xl font-bold tracking-[-0.01em] text-[color:var(--lp-ink)] [font-family:var(--lp-display)]"
        >
          <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-[color:var(--lp-accent)] text-white">
            <IconeCamadas className="h-4 w-4" />
          </span>
          {PRODUTO.nome}
        </a>

        <ul className="hidden items-center gap-7 text-[15px] font-medium md:flex">
          {LINKS.map((link) => (
            <li key={link.href}>
              <a href={link.href} className="text-[color:var(--lp-muted)] hover:text-[color:var(--lp-ink)]">
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        <div className="flex items-center gap-2">
          <a
            href={PRODUTO.urlLogin}
            className="inline-flex min-h-11 items-center rounded-lg border border-[color:var(--lp-border-strong)] px-4 text-[15px] font-medium text-[color:var(--lp-ink)] hover:bg-white"
          >
            Entrar
          </a>
          {ctaHref ? (
            <a href={ctaHref} className={`${BOTAO_PRIMARIO} hidden min-h-11 px-5 text-[15px] sm:inline-flex`}>
              Agendar demonstração
            </a>
          ) : null}

          <details className="relative md:hidden">
            <summary
              aria-label="Abrir menu"
              className="flex h-11 w-11 cursor-pointer list-none items-center justify-center rounded-lg border border-[color:var(--lp-border-strong)] bg-white [&::-webkit-details-marker]:hidden"
            >
              <IconeMenu className="h-5 w-5 text-[color:var(--lp-ink)]" />
            </summary>
            <ul className="absolute right-0 top-[calc(100%+8px)] z-10 flex w-56 flex-col rounded-xl border border-[color:var(--lp-border)] bg-white p-2 shadow-lg">
              {LINKS.map((link) => (
                <li key={link.href}>
                  <a
                    href={link.href}
                    className="block rounded-lg px-3 py-2.5 text-[15px] font-medium text-[color:var(--lp-ink)] hover:bg-[color:var(--lp-surface-muted)]"
                  >
                    {link.label}
                  </a>
                </li>
              ))}
              {ctaHref ? (
                <li className="mt-1 border-t border-[color:var(--lp-border)] pt-2 sm:hidden">
                  <a href={ctaHref} className={`${BOTAO_PRIMARIO} w-full min-h-11 text-[15px]`}>
                    Agendar demonstração
                  </a>
                </li>
              ) : null}
            </ul>
          </details>
        </div>
      </nav>
    </header>
  );
}
