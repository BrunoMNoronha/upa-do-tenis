import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { obterAcompanhamentoPublico } from "@/lib/os-acompanhamento";
import { obterDadosEmpresa } from "@/lib/configuracoes";
import { nomeExibicaoEmpresa } from "@/lib/dados-empresa";

import { AcompanhamentoView } from "./acompanhamento-view";

/**
 * Página PÚBLICA (sem sessão) de acompanhamento da OS. A autorização é a
 * assinatura do token, validada no servidor; o DTO já chega restrito aos
 * campos públicos. Token inválido e OS inexistente caem no mesmo not-found.
 */

export async function generateMetadata(): Promise<Metadata> {
  const dados = await obterDadosEmpresa();
  return {
    title: `Acompanhamento da OS | ${dados.nomeFantasia}`,
    description: `Acompanhe o andamento da sua ordem de serviço em ${nomeExibicaoEmpresa(dados)}.`,
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

// Sempre consulta o status atual; nunca servir versão estática/cacheada.
export const dynamic = "force-dynamic";

type AcompanhamentoPageProps = {
  params: Promise<{ token: string }>;
};

export default async function AcompanhamentoPage(props: AcompanhamentoPageProps) {
  const { token } = await props.params;
  const [acompanhamento, dadosEmpresa] = await Promise.all([
    obterAcompanhamentoPublico(token),
    obterDadosEmpresa(),
  ]);

  if (!acompanhamento) {
    notFound();
  }

  return <AcompanhamentoView acompanhamento={acompanhamento} dadosEmpresa={dadosEmpresa} />;
}
