import { AppShell } from "@/components/app-shell";
import { listarFormasPagamento } from "@/lib/formas-pagamento";
import { listarInsumos } from "@/lib/insumos";
import { listarServicos } from "@/lib/servicos";

import { OrdemServicoDetalheClient } from "./ordem-servico-detalhe-client";

type OrdemServicoDetalhePageProps = {
  params: {
    id: string;
  };
};

export const metadata = {
  title: "Detalhe da Ordem de Serviço | UPA do Tênis",
  description: "Visualização consolidada de dados operacionais e financeiros da OS.",
};

export default async function OrdemServicoDetalhePage({ params }: OrdemServicoDetalhePageProps) {
  const formasPagamento = await listarFormasPagamento();
  // listarInsumos() traz também os inativos (a tela de cadastro precisa deles
  // para reativar); aqui, no consumo, só os ativos podem ser oferecidos.
  const insumosDisponiveis = (await listarInsumos())
    .filter((insumo) => insumo.ativo)
    .map((insumo) => ({
      id: insumo.id,
      nome: insumo.nome,
      unidadeMedida: insumo.unidadeMedida,
    }));
  const servicosDisponiveis = (await listarServicos()).map((servico) => ({
    id: servico.id,
    nome: servico.nome,
    precoBase: Number(servico.precoBase),
  }));

  return (
    <AppShell
      eyebrow="Operação e financeiro"
      title="Detalhe da Ordem de Serviço"
      description="Consulte dados completos da OS, histórico operacional, pagamentos registrados e resumo financeiro consolidado pelo backend."
      action={{ href: "/ordens-servico", label: "Voltar para Ordens" }}
    >
      <OrdemServicoDetalheClient
        ordemServicoId={params.id}
        formasPagamento={formasPagamento}
        insumosDisponiveis={insumosDisponiveis}
        servicosDisponiveis={servicosDisponiveis}
      />
    </AppShell>
  );
}