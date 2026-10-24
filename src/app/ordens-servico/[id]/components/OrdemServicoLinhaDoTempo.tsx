import { Card, PanelHeader } from "@/components/ui";
import type { EventoLinhaDoTempo } from "@/lib/ordens-servico-progresso";

import { dateFormatter } from "../utils";

/** Linha do tempo da OS: status, pagamentos e estornos, do mais recente ao mais antigo. */
export function OrdemServicoLinhaDoTempo({ eventos }: { eventos: EventoLinhaDoTempo[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[color:var(--border)] px-[22px] py-4">
        <PanelHeader title="Linha do tempo" description="Status e movimentações da ordem" />
      </div>
      <div className="px-[22px] py-5">
        {eventos.length === 0 ? (
          <p className="text-sm text-[color:var(--text-soft)]">Sem histórico registrado.</p>
        ) : (
          <ol className="flex flex-col">
            {eventos.map((evento, indice) => {
              const ultimo = indice === eventos.length - 1;
              const estorno = evento.tipo === "estorno";
              return (
                <li key={evento.id} className="relative flex gap-3.5 pb-5 last:pb-0">
                  {!ultimo ? (
                    <span aria-hidden="true" className="absolute left-[5px] top-4 h-[calc(100%-8px)] w-0.5 bg-[color:var(--track)]" />
                  ) : null}
                  <span
                    aria-hidden="true"
                    className={`relative mt-1 h-3 w-3 shrink-0 rounded-full ${
                      ultimo
                        ? "bg-[color:var(--muted)] ring-[3px] ring-[color:var(--surface-muted)]"
                        : estorno
                          ? "bg-[color:var(--danger)] ring-[3px] ring-[color:var(--danger-soft)]"
                          : "bg-[color:var(--accent)] ring-[3px] ring-[color:var(--accent-soft)]"
                    }`}
                  />
                  <div className="min-w-0">
                    <p className={`text-sm font-bold ${estorno ? "text-[color:var(--danger)]" : "text-[color:var(--text)]"}`}>{evento.titulo}</p>
                    <p className="text-xs text-[color:var(--text-soft)]">
                      {dateFormatter.format(new Date(evento.data))}
                      {evento.detalhe ? ` · ${evento.detalhe}` : ""}
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </Card>
  );
}
