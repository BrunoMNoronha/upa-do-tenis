import { Badge, Card } from "@/components/ui";
import { FUSO_OPERACIONAL } from "@/lib/date-range";
import type { AcompanhamentoPublico } from "@/lib/os-acompanhamento";

const dataFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeZone: FUSO_OPERACIONAL,
});

const dataHoraFormatter = new Intl.DateTimeFormat("pt-BR", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: FUSO_OPERACIONAL,
});

function tomDoStatus(status: string) {
  if (status === "CONCLUIDA" || status === "ENTREGUE") return "success" as const;
  if (status === "EM_ANDAMENTO") return "warning" as const;
  if (status === "CANCELADA") return "danger" as const;
  return "accent" as const;
}

function Cabecalho() {
  return (
    <header className="mb-6 text-center">
      <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[color:var(--accent-strong)]">
        UPA do Tênis
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight text-[color:var(--text)]">Sapataria Alves</h1>
      <p className="mt-2 text-sm text-slate-600">Acompanhamento da Ordem de Serviço</p>
    </header>
  );
}

function Moldura({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen justify-center bg-[color:var(--background)] px-4 py-10">
      <div className="w-full max-w-lg">
        <Cabecalho />
        {children}
      </div>
    </main>
  );
}

export function AcompanhamentoView({ acompanhamento }: { acompanhamento: AcompanhamentoPublico }) {
  // Mais recente primeiro: o cliente quer ver onde o calçado está agora.
  const etapas = [...acompanhamento.etapas].reverse();

  return (
    <Moldura>
      <Card className="p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Ordem de Serviço</p>
        <p className="mt-1 break-all text-2xl font-semibold text-[color:var(--text)]">{acompanhamento.numero}</p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Badge tone={tomDoStatus(acompanhamento.status)}>{acompanhamento.statusLabel}</Badge>
          <span className="text-sm text-slate-600">
            Entrada em {dataFormatter.format(new Date(acompanhamento.dataEntrada))}
          </span>
        </div>

        <p role="status" className="mt-4 text-sm leading-6 text-slate-700">
          {acompanhamento.mensagem}
        </p>
      </Card>

      <Card className="mt-4 p-6">
        <h2 className="text-lg font-semibold text-[color:var(--text)]">Linha do tempo</h2>
        <ol className="mt-4 space-y-3">
          {etapas.map((etapa, indice) => (
            <li
              key={`${etapa.status}-${etapa.data}-${indice}`}
              className="flex items-start justify-between gap-4 rounded-2xl border border-black/10 bg-white/80 p-3 text-sm"
            >
              <span className="font-semibold text-[color:var(--text)]">{etapa.statusLabel}</span>
              <time dateTime={etapa.data} className="shrink-0 text-slate-600">
                {dataHoraFormatter.format(new Date(etapa.data))}
              </time>
            </li>
          ))}
        </ol>
      </Card>

      <p className="mt-6 text-center text-xs text-slate-500">
        Dúvidas sobre o serviço? Fale diretamente com a sapataria.
      </p>
    </Moldura>
  );
}

export function AcompanhamentoIndisponivelView() {
  return (
    <Moldura>
      <Card className="p-6 text-center">
        <h2 className="text-lg font-semibold text-[color:var(--text)]">Link de acompanhamento indisponível</h2>
        <p className="mt-3 text-sm leading-6 text-slate-600">
          Não foi possível exibir o acompanhamento com este link. Confira se ele foi copiado por completo ou
          fale com a sapataria para receber um novo link.
        </p>
      </Card>
    </Moldura>
  );
}
