import { formatCurrency } from "@/lib/formatters";
import { LIMITE_DIAS_RECEBIMENTOS_POR_DIA } from "@/lib/dashboard-recebimentos-por-dia";
import { DashboardPanel } from "./DashboardPanel";
import type { RecebimentosPorDiaViewModel } from "./dashboard-view-model";

type DashboardRecebimentosPorDiaProps = {
  recebimentos: RecebimentosPorDiaViewModel;
  className?: string;
};

const TITULO = "Recebimentos por dia";
const DESCRICAO = "Pagamentos registrados em cada dia do período";

/**
 * Barras verticais por dia (sem biblioteca). As barras são decorativas para
 * leitores de tela; o conteúdo acessível é o resumo e a tabela visualmente
 * oculta, com um valor por dia. Rótulos do eixo só nas pontas e no meio para
 * não sobrepor em períodos longos.
 */
export function DashboardRecebimentosPorDia({ recebimentos, className = "" }: DashboardRecebimentosPorDiaProps) {
  if (!recebimentos.disponivel) {
    return (
      <DashboardPanel title={TITULO} description={DESCRICAO} className={className}>
        <p className="text-[13px] text-[color:var(--text-soft)]">
          A série diária é exibida para períodos de até {LIMITE_DIAS_RECEBIMENTOS_POR_DIA} dias. Reduza o período para
          visualizar os recebimentos por dia.
        </p>
      </DashboardPanel>
    );
  }

  const { dias, melhorDia, diasComRecebimento } = recebimentos;
  const semRecebimento = melhorDia === null;
  const indicesRotulados = new Set([0, Math.floor((dias.length - 1) / 2), dias.length - 1]);
  const espacamento = dias.length > 31 ? "gap-px" : dias.length > 14 ? "gap-0.5" : "gap-1.5";

  return (
    // Sem link de detalhe: nenhum relatório existente usa o mesmo recorte
    // (pagamentos por dataPagamento no período do dashboard).
    <DashboardPanel title={TITULO} description={DESCRICAO} className={className}>
      <dl className="flex flex-wrap gap-x-6 gap-y-2">
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-bold text-[color:var(--text-soft)]">Melhor dia</dt>
          <dd className="text-[15px] font-extrabold text-[color:var(--text)]">
            {melhorDia ? `${melhorDia.rotuloCompleto} · ${formatCurrency(melhorDia.valor)}` : "—"}
          </dd>
        </div>
        <div className="flex flex-col gap-0.5">
          <dt className="text-xs font-bold text-[color:var(--text-soft)]">Dias com recebimento</dt>
          <dd className="text-[15px] font-extrabold text-[color:var(--text)]">
            {diasComRecebimento} de {dias.length}
          </dd>
        </div>
      </dl>

      <div aria-hidden="true" className="flex flex-col gap-2">
        <div className={`flex h-40 items-end border-b border-[color:var(--border)] ${espacamento}`}>
          {dias.map((item) => (
            <div
              key={item.dia}
              title={`${item.rotuloCompleto}: ${formatCurrency(item.valor)}`}
              className="flex h-full min-w-0 flex-1 items-end"
            >
              <div
                className={`w-full rounded-t-[3px] ${item.valor > 0 ? "bg-[color:var(--accent)]" : "bg-[color:var(--surface-muted)]"}`}
                style={{ height: item.valor > 0 ? `${Math.max(item.proporcao, 2)}%` : "2px" }}
              />
            </div>
          ))}
        </div>
        <div className="relative h-4 text-[11px] font-semibold text-[color:var(--text-soft)]">
          {dias.map((item, indice) =>
            indicesRotulados.has(indice) ? (
              <span
                key={item.dia}
                className="absolute top-0 whitespace-nowrap"
                style={
                  indice === 0
                    ? { left: 0 }
                    : indice === dias.length - 1
                      ? { right: 0 }
                      : { left: `${((indice + 0.5) / dias.length) * 100}%`, transform: "translateX(-50%)" }
                }
              >
                {item.rotuloCurto}
              </span>
            ) : null
          )}
        </div>
      </div>

      {semRecebimento ? <p className="text-[13px] text-[color:var(--text-soft)]">Nenhum recebimento no período.</p> : null}

      <table className="sr-only">
        <caption>{TITULO}</caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Valor recebido</th>
          </tr>
        </thead>
        <tbody>
          {dias.map((item) => (
            <tr key={item.dia}>
              <th scope="row">{item.rotuloCompleto}</th>
              <td>{formatCurrency(item.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </DashboardPanel>
  );
}
