import { PRODUTO } from "@/config/landing";

import { BOTAO_SECUNDARIO, CONTAINER } from "./landing-estilos";

type Props = {
  ctaHref: string | null;
  /** Telefone formatado para exibição ao lado do link de WhatsApp. */
  whatsappExibicao: string | null;
  emailHref: string | null;
};

export function LandingRodape({ ctaHref, whatsappExibicao, emailHref }: Props) {
  const ano = new Date().getFullYear();
  const linhaLegal = [PRODUTO.razaoSocial, PRODUTO.cnpj].filter(Boolean).join(" · ");

  return (
    <>
      <section className={`${CONTAINER} py-24`}>
        <div className="flex flex-wrap items-center justify-between gap-8 rounded-2xl bg-[color:var(--lp-accent)] px-8 py-12 text-white sm:px-12 sm:py-16">
          <div className="flex min-w-0 flex-[1_1_26rem] flex-col gap-3">
            <h2 className="text-balance text-[2rem] font-bold leading-[1.1] tracking-[-0.02em] [font-family:var(--lp-display)] sm:text-[2.5rem]">
              Veja o sistema rodando com os serviços da sua loja
            </h2>
            <p className="text-pretty text-lg text-white/85">
              Uma conversa de 30 minutos pelo WhatsApp ou videochamada. Sem compromisso.
            </p>
          </div>
          {ctaHref || emailHref ? (
            <div className="flex flex-wrap gap-3">
              {ctaHref ? (
                <a href={ctaHref} className={`${BOTAO_SECUNDARIO} min-h-[52px] border-transparent`}>
                  Agendar demonstração
                </a>
              ) : null}
              {emailHref ? (
                <a
                  href={emailHref}
                  className="inline-flex min-h-[52px] items-center rounded-lg border border-white/50 px-5 text-base font-semibold text-white hover:bg-white/10"
                >
                  Enviar e-mail
                </a>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>

      <footer className="border-t border-[color:var(--lp-border)]">
        <div className={`${CONTAINER} flex flex-wrap items-center justify-between gap-6 py-10 text-sm text-[color:var(--lp-muted)]`}>
          <span className="inline-flex items-center gap-2.5 text-lg font-bold text-[color:var(--lp-ink)] [font-family:var(--lp-display)]">
            <span aria-hidden="true" className="h-6 w-6 rounded-md bg-[color:var(--lp-accent)]" />
            {PRODUTO.nome}
          </span>
          <ul className="flex flex-wrap gap-6">
            {ctaHref ? (
              <li>
                <a href={ctaHref} className="hover:text-[color:var(--lp-ink)]">
                  WhatsApp{whatsappExibicao ? ` ${whatsappExibicao}` : ""}
                </a>
              </li>
            ) : null}
            {emailHref ? (
              <li>
                <a href={emailHref} className="hover:text-[color:var(--lp-ink)]">
                  {PRODUTO.email}
                </a>
              </li>
            ) : null}
            <li>
              <a href={PRODUTO.urlLogin} className="hover:text-[color:var(--lp-ink)]">
                Entrar no sistema
              </a>
            </li>
          </ul>
          <span>
            © {ano} {PRODUTO.nome}
            {linhaLegal ? ` · ${linhaLegal}` : ""}
          </span>
        </div>
      </footer>
    </>
  );
}
