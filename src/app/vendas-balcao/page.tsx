import { AppShell } from "@/components/app-shell";
import { listarProdutos } from "@/lib/produtos";
import { listarFormasPagamento } from "@/lib/formas-pagamento";
import { VendaBalcaoClient } from "./venda-balcao-client";

export const metadata = {
  title: "Venda de Balcão | UPA do Tênis",
  description: "Registre vendas diretas de produtos no balcão de atendimento da sapataria.",
};

export const dynamic = "force-dynamic";

export default async function VendaBalcaoPage() {
  const [produtos, formasPagamento] = await Promise.all([
    listarProdutos(),
    listarFormasPagamento(),
  ]);

  return (
    <AppShell
      eyebrow="Atendimento"
      title="Venda de Balcão"
      description="Selecione produtos, ajuste as quantidades, escolha a forma de pagamento e finalize a venda. O estoque e o caixa são atualizados automaticamente."
    >
      <VendaBalcaoClient
        produtos={produtos.map((p) => ({
          id: p.id,
          nome: p.nome,
          descricao: p.descricao,
          precoVenda: Number(p.precoVenda),
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
