import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { obterAcompanhamentoPublico } from "@/lib/os-acompanhamento";

import { AcompanhamentoView } from "./acompanhamento-view";

/**
 * Página PÚBLICA (sem sessão) de acompanhamento da OS. A autorização é a
 * assinatura do token, validada no servidor; o DTO já chega restrito aos
 * campos públicos. Token inválido e OS inexistente caem no mesmo not-found.
 */

export const metadata: Metadata = {
  title: "Acompanhamento da OS | UPA do Tênis",
  description: "Acompanhe o andamento da sua ordem de serviço na Sapataria Alves.",
  robots: { index: false, follow: false },
  // O token está no caminho: não vazar a URL completa para outros sites.
  referrer: "no-referrer",
};

// Sempre consulta o status atual; nunca servir versão estática/cacheada.
export const dynamic = "force-dynamic";

type AcompanhamentoPageProps = {
  params: Promise<{ token: string }>;
};

export default async function AcompanhamentoPage(props: AcompanhamentoPageProps) {
  const { token } = await props.params;
  const acompanhamento = await obterAcompanhamentoPublico(token);

  if (!acompanhamento) {
    notFound();
  }

  return <AcompanhamentoView acompanhamento={acompanhamento} />;
}
