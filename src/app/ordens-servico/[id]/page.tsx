import { AppShell } from "@/components/app-shell";
import {
  obterDadosEmpresaComCache as obterDadosEmpresa,
  listarFormasPagamentoComCache as listarFormasPagamento,
  listarServicosComCache as listarServicos,
} from "@/lib/dados-cache";
import { listarInsumos } from "@/lib/insumos";
import { obterDetalheOrdemServicoDto, OrdemServicoDetalheError } from "@/lib/ordens-servico";

import { OrdemServicoDetalheClient } from "./ordem-servico-detalhe-client";
import type { OrdemServicoDetalhe } from "./types";

import { exigirSessao } from "@/lib/auth-server";

type OrdemServicoDetalhePageProps = {
  params: Promise<{
    id: string;
  }>;
};

export const metadata = {
  title: "Detalhe da Ordem de Serviço",
  description: "Visualização consolidada de dados operacionais e financeiros da OS.",
};

export const dynamic = "force-dynamic";

export default async function OrdemServicoDetalhePage(props: OrdemServicoDetalhePageProps) {
  await exigirSessao();
  const { id } = await props.params;

  const [formasPagamento, todosInsumos, todosServicos, dadosEmpresa, ordemServico] = await Promise.all([
    listarFormasPagamento(),
    listarInsumos(),
    listarServicos(),
    obterDadosEmpresa(),
    obterDetalheOrdemServicoDto(id).catch((erro) => {
      if (erro instanceof OrdemServicoDetalheError && erro.status === 404) return null;
      throw erro;
    }),
  ]);
  // listarInsumos() traz também os inativos (a tela de cadastro precisa deles
  // para reativar); aqui, no consumo, só os ativos podem ser oferecidos.
  const insumosDisponiveis = todosInsumos
    .filter((insumo) => insumo.ativo)
    .map((insumo) => ({
      id: insumo.id,
      nome: insumo.nome,
      unidadeMedida: insumo.unidadeMedida,
    }));
  const servicosDisponiveis = todosServicos.map((servico) => ({
    id: servico.id,
    nome: servico.nome,
    precoBase: Number(servico.precoBase),
  }));

  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
      eyebrow="Operação e financeiro"
      title="Detalhe da Ordem de Serviço"
      description="Consulte dados completos da OS, histórico operacional, pagamentos registrados e resumo financeiro consolidado pelo backend."
      action={{ href: "/ordens-servico", label: "Voltar para Ordens" }}
    >
      <OrdemServicoDetalheClient
        ordemServicoId={id}
        initialOrdem={ordemServico ? JSON.parse(JSON.stringify(ordemServico)) as OrdemServicoDetalhe : null}
        formasPagamento={formasPagamento}
        insumosDisponiveis={insumosDisponiveis}
        servicosDisponiveis={servicosDisponiveis}
      />
    </AppShell>
  );
}
