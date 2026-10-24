import { AppShell } from "@/components/app-shell";
import { CaixaStatusPill } from "@/components/caixa-status-pill";
import { IconeRelogio } from "@/components/icones";
import { Button } from "@/components/ui";
import { obterResumoCaixaAberto } from "@/lib/caixa";
import { classificarEstadoCaixa } from "@/lib/caixa-alerta";
import { listarProdutos } from "@/lib/produtos";
import {
  listarFormasPagamentoComCache as listarFormasPagamento,
  obterDadosEmpresaComCache as obterDadosEmpresa,
} from "@/lib/dados-cache";
import { VendaBalcaoClient } from "./venda-balcao-client";

import { exigirSessao } from "@/lib/auth-server";

export const metadata = {
  title: "Venda de Balcão",
  description: "Registre vendas diretas de produtos no balcão de atendimento da sapataria.",
};

export const dynamic = "force-dynamic";

export default async function VendaBalcaoPage() {
  const sessao = await exigirSessao();

  const [produtos, formasPagamento, dadosEmpresa, caixaAberto] = await Promise.all([
    listarProdutos(),
    listarFormasPagamento(),
    obterDadosEmpresa(),
    obterResumoCaixaAberto(),
  ]);
  const alertaCaixa = classificarEstadoCaixa(caixaAberto);

  return (
    <AppShell
      dadosEmpresa={dadosEmpresa}
      usuario={sessao}
      eyebrow="Atendimento"
      title="Venda de Balcão"
      description="Selecione produtos, ajuste quantidades e finalize. Estoque e caixa são atualizados automaticamente."
      actions={
        <>
          <CaixaStatusPill alerta={alertaCaixa} />
          <Button href="/vendas" variant="secondary" icon={<IconeRelogio />}>
            Histórico de vendas
          </Button>
        </>
      }
    >
      <VendaBalcaoClient
        produtos={produtos.map((p) => ({
          id: p.id,
          nome: p.nome,
          descricao: p.descricao,
          precoVenda: Number(p.precoVenda),
          quantidadeEstoque: Number(p.quantidadeEstoque),
          ativo: p.ativo,
        }))}
        formasPagamento={formasPagamento.map((fp) => ({
          id: fp.id,
          nome: fp.nome,
        }))}
      />
    </AppShell>
  );
}
