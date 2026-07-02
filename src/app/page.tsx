import { AppShell } from "@/components/app-shell";
import { Badge, Button, Card, SectionTitle } from "@/components/ui";

const highlights = [
  "Clientes",
  "Ordens de serviço",
  "Itens e serviços",
  "Pagamentos",
  "Histórico de status",
];

export default function HomePage() {
  return (
    <AppShell
      eyebrow="Painel inicial"
      title="Base administrativa da UPA do Tênis"
      description="Painel inicial do MVP v1 para clientes, ordens de serviço e operação da sapataria, já preparado para evoluir com navegação e layout consistentes."
      action={{ href: "/clientes", label: "Abrir clientes" }}
    >
      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <Card className="p-8">
          <Badge tone="accent">MVP v1 em consolidação</Badge>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-[color:var(--text)] md:text-5xl">
            Atendimento organizado para a rotina da sapataria.
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-slate-700 md:text-lg">
            A primeira etapa do sistema já cobre clientes e prepara a base para ordens de serviço,
            pagamentos e histórico operacional, com foco em agilidade de balcão e clareza de uso.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            {highlights.map((item) => (
              <Badge key={item}>{item}</Badge>
            ))}
          </div>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button href="/clientes">Ir para Clientes</Button>
            <Button href="/ordens-servico" variant="secondary">
              Ver Ordens de Serviço
            </Button>
          </div>
        </Card>

        <Card className="bg-[color:var(--text)] p-8 text-white">
          <p className="text-sm uppercase tracking-[0.18em] text-[color:var(--accent-soft)]">Escopo do núcleo</p>
          <div className="mt-6 space-y-4 text-sm leading-6 text-slate-200">
            <p>Cadastro e listagem de clientes com persistência local.</p>
            <p>Estrutura pronta para ordens de serviço e seu fluxo principal.</p>
            <p>Base para itens, serviços, pagamentos e histórico de status.</p>
            <p>Layout administrativo simples para uso diário no balcão.</p>
          </div>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5">
            <p className="text-xs uppercase tracking-[0.16em] text-[color:var(--accent-soft)]">Base técnica</p>
            <p className="mt-2 text-sm leading-6 text-slate-100">
              Next.js 14, TypeScript, Prisma, SQLite, Tailwind CSS, Zod e React Hook Form.
            </p>
          </div>
        </Card>
      </section>

      <section className="mt-6 grid gap-6 md:grid-cols-3">
        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">Atalho</p>
          <SectionTitle className="mt-3 text-xl">Clientes</SectionTitle>
          <p className="mt-3 text-sm leading-6 text-slate-700">Cadastro e consulta de clientes com foco em atendimento rápido.</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">Atalho</p>
          <SectionTitle className="mt-3 text-xl">Ordens de Serviço</SectionTitle>
          <p className="mt-3 text-sm leading-6 text-slate-700">Estrutura inicial para evoluir o fluxo operacional da sapataria.</p>
        </Card>
        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">Atalho</p>
          <SectionTitle className="mt-3 text-xl">Próxima entrega</SectionTitle>
          <p className="mt-3 text-sm leading-6 text-slate-700">Tema global, shell administrativo e padronização visual das telas principais.</p>
        </Card>
      </section>
    </AppShell>
  );
}