"use client";

import Link from "next/link";
import type { MouseEvent, ReactNode } from "react";

import { classesBotao } from "@/components/ui";
import { acrescentarParametrosNaPaginaAtual } from "@/lib/filtros-url";

type LinkAcaoNaPaginaProps = {
  href: string;
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "text";
  size?: "md" | "sm";
  icon?: ReactNode;
  className?: string;
};

/**
 * Link de ação com visual de botão. Quando o destino só acrescenta parâmetros
 * à página atual (ex.: "Nova ordem" → `?nova=1`), aplica na URL vigente com
 * pushState, integrado ao App Router: os filtros ficam preservados e a página
 * não é consultada de novo no servidor. Outros destinos navegam normalmente.
 */
export function LinkAcaoNaPagina({ href, children, variant = "primary", size = "md", icon, className }: LinkAcaoNaPaginaProps) {
  const aoClicar = (event: MouseEvent<HTMLAnchorElement>) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const destino = acrescentarParametrosNaPaginaAtual(href, window.location.href);
    if (!destino) return;
    event.preventDefault();
    window.history.pushState(null, "", destino);
  };

  return (
    <Link href={href} onClick={aoClicar} className={classesBotao(variant, size, className)}>
      {icon}
      {children}
    </Link>
  );
}
