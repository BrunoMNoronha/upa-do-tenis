import { redirect } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { Badge, Card, SectionTitle, Input, Button } from "@/components/ui";
import { ClientesForm } from "./clientes-form";

import { listarClientes } from "@/lib/clientes";

export const metadata = {
  title: "Clientes | UPA do Tênis",
  description: "Cadastro e consulta de clientes da sapataria.",
};

const dateFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
});

export default async function ClientesPage({ searchParams }: { searchParams: { busca?: string } }) {
  const busca = searchParams.busca || "";
  const clientes = await listarClientes(busca);

  return (
    <AppShell
      eyebrow="Cadastro e consulta"
      title="Clientes"
      description="Cadastre e consulte clientes com persistência local em banco relacional, mantendo o fluxo simples e consistente para a primeira entrega do MVP."
      action={{ href: "/ordens-servico", label: "Ir para OS" }}
    >
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">Total</p>
          <div className="mt-3 flex items-end justify-between gap-4">
            <div>
              <p className="text-4xl font-semibold text-[color:var(--text)]">{clientes.length}</p>
              <p className="mt-2 text-sm text-slate-600">clientes encontrados</p>
            </div>
            <Badge tone="accent">Local</Badge>
          </div>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">Fluxo</p>
          <SectionTitle className="mt-3 text-xl">Cadastro rápido</SectionTitle>
          <p className="mt-3 text-sm leading-6 text-slate-700">Formulário enxuto para uso no balcão e consulta imediata da lista.</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">Próximo passo</p>
          <SectionTitle className="mt-3 text-xl">Base para OS</SectionTitle>
          <p className="mt-3 text-sm leading-6 text-slate-700">A navegação já prepara o sistema para ordens de serviço sem CRUD completo ainda.</p>
        </Card>
      </div>

      <section className="mt-6 grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
        <Card className="p-6">
          <div className="mb-6">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">Novo cliente</p>
            <SectionTitle className="mt-2 text-2xl">Preencha os dados básicos</SectionTitle>
          </div>

          <ClientesForm />
        </Card>

        <Card className="bg-[color:var(--text)] p-6 text-white">
          <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-soft)]">Lista de clientes</p>
              <h2 className="mt-2 text-2xl font-semibold">Clientes cadastrados</h2>
            </div>
            <Badge tone="accent">PostgreSQL</Badge>
          </div>

          <form className="mb-6 flex gap-2">
            <Input 
              name="busca"
              defaultValue={busca}
              placeholder="Buscar por nome ou telefone..."
              className="!bg-white/10 !text-white !border-white/20 placeholder:text-slate-400"
            />
            <Button type="submit" variant="secondary">Buscar</Button>
            {busca && (
              <Button href="/clientes" variant="ghost" className="!border-white/20 !text-white hover:!bg-white/10">Limpar</Button>
            )}
          </form>

          {clientes.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm leading-6 text-slate-200">
              Nenhum cliente encontrado.
            </div>
          ) : (
            <div className="space-y-4">
              {clientes.map((cliente) => (
                <article key={cliente.id} className="rounded-3xl border border-white/10 bg-white/5 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-white">{cliente.nome}</h3>
                      <p className="mt-1 text-sm text-slate-200">{cliente.telefone}</p>
                    </div>
                    <Badge tone="neutral">{dateFormatter.format(cliente.criadoEm)}</Badge>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-slate-200">
                    {cliente.email ? <p>E-mail: {cliente.email}</p> : null}
                    {cliente.cpfCnpj ? <p>CPF/CNPJ: {cliente.cpfCnpj}</p> : null}
                    {cliente.observacoes ? <p>Observações: {cliente.observacoes}</p> : null}
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