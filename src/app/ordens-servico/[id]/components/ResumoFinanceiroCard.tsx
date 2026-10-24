import type { ResumoFinanceiro } from "../types";
import { currencyFormatter, percentualPago } from "../utils";

function Linha({ label, valor, destaque = false }: { label: string; valor: number; destaque?: boolean }) {
  return (
    <div className={`flex items-center justify-between gap-4 py-1.5 text-[13px] ${destaque ? "border-t border-white/15 pt-3" : ""}`}>
      <dt className={destaque ? "font-bold text-white" : "text-[color:var(--on-dark-soft)]"}>{label}</dt>
      <dd className={destaque ? "text-base font-extrabold text-[color:var(--saldo-on-dark)]" : "font-semibold text-white"}>
        {currencyFormatter.format(Number(valor || 0))}
      </dd>
    </div>
  );
}

/**
 * Resumo financeiro da OS em destaque (fundo escuro). Só exibe os valores
 * consolidados pelo backend; o percentual pago é derivado para a barra.
 */
export function ResumoFinanceiroCard({ resumo }: { resumo: ResumoFinanceiro }) {
  const cancelada = resumo.statusFinanceiro === "CANCELADO";
  const percentual = percentualPago(resumo.valorPago, resumo.valorTotal);

  return (
    <section aria-labelledby="resumo-financeiro-titulo" className="rounded-[var(--r-card)] bg-[color:var(--ink)] p-[22px] text-white">
      <p id="resumo-financeiro-titulo" className="text-[13px] font-semibold text-[color:var(--on-dark-soft)]">
        {cancelada ? "OS cancelada" : "Saldo a receber"}
      </p>
      <p className="mt-1 text-[32px] font-extrabold leading-none tracking-[-0.02em]">
        {currencyFormatter.format(Number(resumo.saldo || 0))}
      </p>

      {cancelada ? null : (
        <>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-white/15"
            role="progressbar"
            aria-label="Percentual pago"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={percentual}
          >
            <div className="h-full rounded-full bg-[color:var(--bar-on-dark)]" style={{ width: `${percentual}%` }} />
          </div>
          <p className="mt-2 text-xs text-[color:var(--on-dark-soft)]">
            {currencyFormatter.format(Number(resumo.valorPago || 0))} pagos de {currencyFormatter.format(Number(resumo.valorTotal || 0))} · {percentual}%
          </p>
        </>
      )}

      <dl className="mt-4">
        <Linha label="Valor total" valor={resumo.valorTotal} />
        <Linha label="Desconto" valor={resumo.valorDesconto} />
        <Linha label="Sinal" valor={resumo.valorSinal} />
        <Linha label="Valor pago" valor={resumo.valorPago} />
        <Linha label="Saldo" valor={resumo.saldo} destaque />
      </dl>
    </section>
  );
}
