import { formatCurrency } from "@/lib/formatters";
import { LIMITE_DIAS_RECEBIMENTOS_POR_DIA } from "@/lib/dashboard-recebimentos-por-dia";
import { DashboardPanel } from "./DashboardPanel";
import { ALTURA_MINIMA_BARRA, type RecebimentosPorDiaViewModel } from "./dashboard-view-model";

type DashboardRecebimentosPorDiaProps = {
  recebimentos: RecebimentosPorDiaViewModel;
  className?: string;
};

const TITULO = "Recebimentos por dia";

/** Altura da barra com mínimo visível, sem ultrapassar a área do seu lado do eixo. */
function alturaBarra(proporcao: number, areaDisponivel: number): number {
  return Math.min(Math.max(proporcao, ALTURA_MINIMA_BARRA), areaDisponivel);
}
const DESCRICAO = "Pagamentos registrados em cada dia do período, descontados os estornos";

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

  const { dias, melhorDia, diasComRecebimento, alturaAreaPositiva } = recebimentos;
  const temDiaNegativo = dias.some((item) => item.valor < 0);
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
        {temDiaNegativo ? (
          // Com estorno líquido em algum dia (#230): eixo na altura da área
          // positiva, barras positivas acima e negativas (vermelhas) abaixo.
          <div className={`relative flex h-40 border-b border-[color:var(--border)] ${espacamento}`}>
            <div
              className="absolute inset-x-0 border-t border-[color:var(--border)]"
              style={{ top: `${alturaAreaPositiva}%` }}
            />
            {dias.map((item) => (
              <div
                key={item.dia}
                title={`${item.rotuloCompleto}: ${formatCurrency(item.valor)}`}
                className="relative h-full min-w-0 flex-1"
              >
                {item.valor > 0 ? (
                  <div
                    className="absolute inset-x-0 rounded-t-[3px] bg-[color:var(--accent)]"
                    style={{
                      bottom: `${100 - alturaAreaPositiva}%`,
                      height: `${alturaBarra(item.proporcao, alturaAreaPositiva)}%`,
                    }}
                  />
                ) : item.valor < 0 ? (
                  <div
                    className="absolute inset-x-0 rounded-b-[3px] bg-[color:var(--danger)]"
                    style={{
                      top: `${alturaAreaPositiva}%`,
                      height: `${alturaBarra(item.proporcao, 100 - alturaAreaPositiva)}%`,
                    }}
                  />
                ) : null}
              </div>
            ))}
          </div>
        ) : (
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
        )}
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

      {semRecebimento && !temDiaNegativo ? <p className="text-[13px] text-[color:var(--text-soft)]">Nenhum recebimento no período.</p> : null}

      <table className="sr-only">
        <caption>{TITULO}</caption>
        <thead>
          <tr>
            <th scope="col">Dia</th>
            <th scope="col">Valor recebido (líquido)</th>
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
