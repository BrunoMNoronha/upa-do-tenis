import { AppShell } from "@/components/app-shell";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { FormasPagamentoForm } from "./formas-pagamento-form";

import { listarFormasPagamento } from "@/lib/formas-pagamento";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Formas de Pagamento | UPA do Tênis",
  description: "Cadastro e consulta de formas de pagamento da sapataria.",
};

export default async function FormasPagamentoPage() {
  const formas = await listarFormasPagamento();

  return (
    <AppShell
      eyebrow="Financeiro"
      title="Formas de Pagamento"
      description="Gerencie os métodos de pagamento aceitos na loja."
      action={{ href: "/ordens-servico", label: "Ir para OS" }}
    >
      <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">Novo Cadastro</p>
            <SectionTitle className="mt-2 text-2xl">Adicionar forma</SectionTitle>
          </div>

          <FormasPagamentoForm />
        </Card>

        <Card className="bg-[color:var(--text)] p-6 text-white">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-soft)]">Lista</p>
              <h2 className="mt-2 text-2xl font-semibold">Formas Aceitas</h2>
            </div>
            <Badge tone="accent">Total: {formas.length}</Badge>
          </div>

          {formas.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-200">
              Nenhuma forma de pagamento cadastrada.
            </div>
          ) : (
            <div className="space-y-4">
              {formas.map((item) => (
                <article key={item.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.nome}</h3>
                      {item.tipo ? <p className="mt-1 text-sm text-slate-400">Tipo: {item.tipo}</p> : null}
                    </div>
                    <Badge tone="success">Ativo</Badge>
                  </div>
                </article>
              ))}
            </div>
          )}
        </Card>
      </section>
    </AppShell>
  );
}
