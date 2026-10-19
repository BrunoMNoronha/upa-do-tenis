import type { CSSProperties } from "react";
import type { Metadata } from "next";

import { LandingDestaques } from "@/components/landing/landing-destaques";
import { LandingFaq } from "@/components/landing/landing-faq";
import { LandingFluxo } from "@/components/landing/landing-fluxo";
import { LandingFuncionalidades } from "@/components/landing/landing-funcionalidades";
import { LandingHero } from "@/components/landing/landing-hero";
import { LandingNav } from "@/components/landing/landing-nav";
import { LandingPreco } from "@/components/landing/landing-preco";
import { LandingRodape } from "@/components/landing/landing-rodape";
import { LandingSeguranca } from "@/components/landing/landing-seguranca";
import { PRODUTO } from "@/config/landing";
import { calcularPrecos } from "@/lib/landing-precos";

/**
 * Landing PÚBLICA do produto TechLab+ Sapataria, na raiz do site. Não usa
 * sessão, não lê o banco nem os dados da loja: todo o conteúdo vem de
 * `src/config/landing.ts` e de `src/lib/landing-precos.ts`. Por ser pública,
 * a trava de caixa pendente não se aplica; quem já tem sessão também a vê
 * (o acesso ao sistema é pelo botão "Entrar").
 */

export const metadata: Metadata = {
  // `absolute` evita o template "%s | <nome da loja>" do layout raiz: a
  // landing é do produto, não da loja que hospeda esta instância.
  title: { absolute: `${PRODUTO.nome} — sistema de gestão para sapatarias` },
  description: PRODUTO.descricaoCurta,
  openGraph: {
    title: PRODUTO.nome,
    description: PRODUTO.descricaoCurta,
    type: "website",
    locale: "pt_BR",
  },
};

// Mesmo regime das demais páginas: o layout raiz lê dados em tempo de
// requisição, então a rota não é pré-renderizada no build.
export const dynamic = "force-dynamic";

const GOOGLE_FONTS_HREF =
  "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@500&display=swap";

// Identidade própria do produto (ver docs/01-planejamento/planos-implementacao/LANDING_PAGE.md).
const TOKENS = {
  "--lp-bg": "#F4F4F1",
  "--lp-surface-muted": "#ECECEA",
  "--lp-ink": "#17191C",
  "--lp-muted": "#4B5057",
  "--lp-accent": "#1E6B4E",
  "--lp-accent-strong": "#154D38",
  "--lp-accent-2": "#C9731B",
  "--lp-border": "rgba(23,25,28,0.10)",
  "--lp-border-strong": "rgba(23,25,28,0.18)",
  "--lp-display": "'Bricolage Grotesque', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  "--lp-sans": "'IBM Plex Sans', 'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
  "--lp-mono": "'IBM Plex Mono', ui-monospace, 'SFMono-Regular', Menlo, monospace",
} as CSSProperties;

export default function LandingPage() {
  const precos = calcularPrecos();
  const ctaHref = PRODUTO.whatsappUrl || null;
  const emailHref = PRODUTO.email ? `mailto:${PRODUTO.email}` : null;

  return (
    <>
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      {/* eslint-disable-next-line @next/next/no-page-custom-font -- fonte só desta página; `next/font/google` foi removido do projeto por quebrar o build (#259). */}
      <link rel="stylesheet" href={GOOGLE_FONTS_HREF} />
      <main
        style={TOKENS}
        className="min-h-screen bg-[color:var(--lp-bg)] text-[17px] leading-[1.55] text-[color:var(--lp-ink)] antialiased [font-family:var(--lp-sans)] [font-size-adjust:from-font]"
      >
        <LandingNav ctaHref={ctaHref} />
        <LandingHero ctaHref={ctaHref} />
        <LandingFluxo />
        <LandingFuncionalidades />
        <LandingDestaques />
        <LandingSeguranca />
        <LandingPreco precos={precos} ctaHref={ctaHref} />
        <LandingFaq />
        <LandingRodape ctaHref={ctaHref} emailHref={emailHref} />
      </main>
    </>
  );
}
