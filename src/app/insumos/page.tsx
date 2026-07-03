import { AppShell } from "@/components/app-shell";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { InsumosForm } from "./insumos-form";

import { listarInsumos } from "@/lib/insumos";

export const metadata = {
  title: "Insumos e Produtos | UPA do Tênis",
  description: "Cadastro e consulta de insumos e produtos da sapataria.",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
});

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function InsumosPage() {
  const insumos = await listarInsumos();

  return (
    <AppShell
      eyebrow="Estoque"
      title="Insumos e Produtos"
      description="Gerencie os materiais utilizados nos serviços ou produtos para venda no balcão."
      action={{ href: "/servicos", label: "Ir para Serviços" }}
    >
      <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">Novo Cadastro</p>
            <SectionTitle className="mt-2 text-2xl">Preencha os dados básicos</SectionTitle>
          </div>

          <InsumosForm />
        </Card>

        <Card className="bg-[color:var(--text)] p-6 text-white">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-soft)]">Lista de Estoque</p>
              <h2 className="mt-2 text-2xl font-semibold">Itens Cadastrados</h2>
            </div>
            <Badge tone="accent">Total: {insumos.length}</Badge>
          </div>

          {insumos.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-200">
              Nenhum item cadastrado ainda. Use o formulário ao lado para criar o primeiro registro.
            </div>
          ) : (
            <div className="space-y-4">
              {insumos.map((item) => {
                const quantidadeEstoqueNum = Number(item.quantidadeEstoque);
                const estoqueMinimoNum = Number(item.estoqueMinimo);
                
                const isBaixoEstoque = quantidadeEstoqueNum <= estoqueMinimoNum;

                return (
                  <article key={item.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                    <div className="flex flex-wrap items-start justify-between gap-4">
                      <div>
                        <h3 className="text-lg font-semibold text-white">{item.nome}</h3>
                        <p className="mt-1 text-sm text-slate-300">{item.descricao}</p>
                      </div>
                      <Badge tone={isBaixoEstoque ? "danger" : "success"}>
                        {isBaixoEstoque ? "Estoque Baixo" : "Normal"}
                      </Badge>
                    </div>

                    <div className="mt-4 grid grid-cols-2 gap-4 text-sm text-slate-200 sm:grid-cols-4">
                      <div>
                        <p className="text-xs uppercase tracking-[0.1em] text-slate-400">Estoque</p>
                        <p className="mt-1 font-medium">{quantidadeEstoqueNum} {item.unidadeMedida}</p>
                      </div>
                      <div>
                        <p className="text-xs uppercase tracking-[0.1em] text-slate-400">Mínimo</p>
                        <p className="mt-1 font-medium">{estoqueMinimoNum} {item.unidadeMedida}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs uppercase tracking-[0.1em] text-slate-400">Custo Ref.</p>
                        <p className="mt-1 font-medium">{currencyFormatter.format(Number(item.custoUnitario))}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </Card>
      </section>
    </AppShell>
  );
}
