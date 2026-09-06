import { AppShell } from "@/components/app-shell";
import { Card, SectionTitle } from "@/components/ui";
import { ClientesClient } from "./clientes-client";

import { listarClientes } from "@/lib/clientes";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Clientes | UPA do Tênis",
  description: "Cadastro e consulta de clientes da sapataria.",
};

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
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">Fluxo</p>
          <SectionTitle className="mt-3 text-xl">Cadastro rápido</SectionTitle>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Formulário enxuto para uso no balcão, com edição, inativação e exclusão pela própria lista.
          </p>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">
            Clientes inativos
          </p>
          <SectionTitle className="mt-3 text-xl">Base para OS</SectionTitle>
          <p className="mt-3 text-sm leading-6 text-slate-700">
            Clientes inativos continuam visíveis aqui para consulta e reativação, mas deixam de ser oferecidos na
            abertura de ordens de serviço.
          </p>
        </Card>
      </div>

      <ClientesClient
        busca={busca}
        clientes={clientes.map((cliente) => ({
          id: cliente.id,
          nome: cliente.nome,
          telefone: cliente.telefone,
          email: cliente.email,
          cpfCnpj: cliente.cpfCnpj,
          observacoes: cliente.observacoes,
          ativo: cliente.ativo,
          criadoEm: cliente.criadoEm.toISOString(),
        }))}
      />
    </AppShell>
  );
}
