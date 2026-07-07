import { AppShell } from "@/components/app-shell";
import { Badge, Card, SectionTitle } from "@/components/ui";
import { ServicosForm } from "./servicos-form";

import { listarServicos } from "@/lib/servicos";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Serviços | UPA do Tênis",
  description: "Cadastro e consulta de serviços da sapataria.",
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

export default async function ServicosPage() {
  const servicos = await listarServicos();

  return (
    <AppShell
      eyebrow="Catálogo"
      title="Serviços"
      description="Gerencie os serviços prestados pela sapataria."
      action={{ href: "/ordens-servico", label: "Ir para OS" }}
    >
      <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">Novo Cadastro</p>
            <SectionTitle className="mt-2 text-2xl">Dados do serviço</SectionTitle>
          </div>

          <ServicosForm />
        </Card>

        <Card className="bg-[color:var(--text)] p-6 text-white">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-soft)]">Lista</p>
              <h2 className="mt-2 text-2xl font-semibold">Serviços Cadastrados</h2>
            </div>
            <Badge tone="accent">Total: {servicos.length}</Badge>
          </div>

          {servicos.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-200">
              Nenhum serviço cadastrado ainda.
            </div>
          ) : (
            <div className="space-y-4">
              {servicos.map((item) => (
                <article key={item.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{item.nome}</h3>
                      <p className="mt-1 text-sm text-slate-300">{item.descricao}</p>
                    </div>
                    <Badge tone="neutral">{currencyFormatter.format(Number(item.precoBase))}</Badge>
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
