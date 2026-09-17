import { notFound } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { obterVendaPorId } from "@/lib/vendas";
import { formatCurrency } from "@/lib/formatters";
import { BotaoImprimir } from "./botao-imprimir";
import { CancelarVendaBotao } from "../components/CancelarVenda";

import { exigirSessao } from "@/lib/auth-server";
import { obterDadosEmpresa } from "@/lib/configuracoes";

export const metadata = {
  title: "Detalhes da Venda",
};

export const dynamic = "force-dynamic";

export default async function VendaDetalhePage(props: {
  params: Promise<{ id: string }>;
}) {
  await exigirSessao();
  const { id } = await props.params;

  const [venda, dadosEmpresa] = await Promise.all([obterVendaPorId(id), obterDadosEmpresa()]);

  if (!venda) {
    notFound();
  }

  const date = new Date(venda.dataVenda).toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
  const cancelada = venda.status === "CANCELADA";
  const dataCancelamento = venda.dataCancelamento
    ? new Date(venda.dataCancelamento).toLocaleString("pt-BR", {
        dateStyle: "short",
        timeStyle: "short",
        timeZone: "America/Sao_Paulo",
      })
    : null;

  return (
    <AppShell
      eyebrow="Operação e Atendimento / Vendas"
      title={`Venda ${venda.numero}`}
      description={`Detalhes da venda registrada em ${date}.`}
      action={{ href: "/vendas", label: "Voltar para o histórico" }}
    >
      {/* Print-only receipt header */}
      <div className="hidden print:block mb-8 text-center border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-900 uppercase">{dadosEmpresa.nomeComplementar ?? dadosEmpresa.nomeFantasia}</h1>
        <p className="text-sm text-slate-600">{dadosEmpresa.nomeFantasia}</p>
        <p className="mt-4 text-lg font-semibold">Recibo de Venda de Balcão</p>
        <p className="text-sm text-slate-500">
          Venda {venda.numero} - {date}
        </p>
        {cancelada ? <p className="mt-2 text-lg font-bold uppercase text-rose-700">Venda cancelada</p> : null}
      </div>

      <div className="mb-6 flex flex-wrap items-start justify-end gap-3 print:hidden">
        {cancelada ? null : (
          <CancelarVendaBotao
            venda={{
              id: venda.id,
              numero: venda.numero,
              valorTotal: Number(venda.valorTotal),
              formaPagamento: venda.formaPagamento.nome,
              quantidadeItens: venda.itens.length,
            }}
          />
        )}
        <BotaoImprimir />
      </div>

      {cancelada ? (
        <Card className="mb-6 border-rose-200 bg-rose-50 p-6 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-rose-800">Venda cancelada</h3>
            <Badge tone="danger">Cancelada</Badge>
          </div>
          <p className="mt-3 text-sm text-rose-900">
            Cancelada em {dataCancelamento}
            {venda.canceladoPor?.nome ? ` por ${venda.canceladoPor.nome}` : ""} — {venda.motivoCancelamento}
          </p>
          <p className="mt-2 text-sm text-rose-800">
            Os produtos voltaram ao estoque e o total saiu do caixa na mesma forma de pagamento.
          </p>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-[1fr_300px] print:block">
        <section className="space-y-6">
          <Card className="p-6 print:p-0 print:shadow-none print:border-none">
            <SectionTitle className="mb-6 print:hidden">Itens Vendidos</SectionTitle>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-slate-700">
                <thead className="border-b text-xs uppercase bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3">Produto</th>
                    <th className="px-4 py-3 text-right">Qtd</th>
                    <th className="px-4 py-3 text-right">Valor Unitário</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {venda.itens.map((item: any) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {item.produto.nome}
                      </td>
                      <td className="px-4 py-3 text-right">{item.quantidade}</td>
                      <td className="px-4 py-3 text-right">
                        {formatCurrency(Number(item.precoUnitario))}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold">
                        {formatCurrency(Number(item.precoTotal))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>

          {venda.observacoes && (
            <Card className="p-6 print:p-0 print:shadow-none print:border-none print:mt-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-2">
                Observações
              </h3>
              <p className="text-slate-700 whitespace-pre-wrap">
                {venda.observacoes}
              </p>
            </Card>
          )}

          <div className="hidden print:block mt-12 text-center text-sm text-slate-500">
            <p>Obrigado pela preferência!</p>
            <p>Este documento é um recibo simples e não possui valor fiscal.</p>
          </div>
        </section>

        <section className="space-y-6 print:mt-8">
          <Card className="p-6 bg-slate-50 border-dashed print:p-0 print:shadow-none print:border-none print:bg-transparent">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-500 mb-4 print:hidden">
              Resumo Financeiro
            </h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Forma de Pagamento</span>
                <span className="font-semibold">{venda.formaPagamento.nome}</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">Total de Itens</span>
                <span className="font-semibold">{venda.itens.length}</span>
              </div>
              <div className="border-t pt-3 mt-3 flex justify-between items-center">
                <span className="font-medium text-slate-800">Total da Venda</span>
                <span className={`text-xl font-bold ${cancelada ? "text-slate-500 line-through" : "text-[color:var(--accent-strong)]"}`}>
                  {formatCurrency(Number(venda.valorTotal))}
                </span>
              </div>
            </div>
            
            <div className="mt-6">
              {cancelada ? (
                <Badge tone="danger" className="w-full justify-center py-2 text-sm">
                  Venda Cancelada
                </Badge>
              ) : (
                <Badge tone="success" className="w-full justify-center py-2 text-sm">
                  Pagamento Concluído
                </Badge>
              )}
            </div>
          </Card>
        </section>
      </div>
    </AppShell>
  );
}
