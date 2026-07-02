import { AppShell } from "@/components/app-shell";
import { Badge, Button, Card, SectionTitle } from "@/components/ui";

export const metadata = {
  title: "Ordens de Serviço | UPA do Tênis",
  description: "Estrutura inicial para o fluxo de ordens de serviço da sapataria.",
};

const osStatusPreview = ["ABERTA", "EM_ANDAMENTO", "AGUARDANDO_APROVACAO", "FINALIZADA", "ENTREGUE"];

export default function OrdensServicoPage() {
  return (
    <AppShell
      eyebrow="Operação"
      title="Ordens de Serviço"
      description="Página base preparada para receber o fluxo principal de OS do MVP, sem implementar o CRUD completo ainda."
      action={{ href: "/clientes", label: "Voltar para clientes" }}
    >
      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Card className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">Estrutura inicial</p>
          <SectionTitle className="mt-3">Base visual da OS</SectionTitle>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-700">
            Esta tela serve como ponto de ancoragem para o próximo ciclo: navegação, lista de OS, status, detalhes e ações recorrentes do atendimento.
          </p>

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <div className="rounded-3xl border border-[color:var(--border)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">Fluxo futuro</p>
              <p className="mt-2 text-sm text-slate-700">Cadastro, consulta, atualização de status e fechamento da OS.</p>
            </div>
            <div className="rounded-3xl border border-[color:var(--border)] bg-white p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-strong)]">Uso no balcão</p>
              <p className="mt-2 text-sm text-slate-700">Leitura rápida do número, cliente, prazo e situação atual.</p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3">
            <Button variant="secondary" href="/">
              Ir para Início
            </Button>
            <Button href="/clientes">Abrir Clientes</Button>
          </div>
        </Card>

        <Card className="bg-[color:var(--text)] p-6 text-white">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[color:var(--accent-soft)]">Status previstos</p>
          <h2 className="mt-2 text-2xl font-semibold">Linha visual para o ciclo seguinte</h2>
          <div className="mt-6 flex flex-wrap gap-3">
            {osStatusPreview.map((status) => (
              <Badge key={status} tone="accent">
                {status}
              </Badge>
            ))}
          </div>
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-5 text-sm leading-6 text-slate-200">
            A definição completa das regras de OS continua para o próximo ciclo. Aqui fica apenas a base visual, a navegação e a intenção de uso.
          </div>
        </Card>
      </section>
    </AppShell>
  );
}