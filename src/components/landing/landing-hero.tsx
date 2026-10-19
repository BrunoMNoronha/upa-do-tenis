import { BOTAO_PRIMARIO, BOTAO_SECUNDARIO, CONTAINER } from "./landing-estilos";
import { IconeCheck, IconeLoja, IconeWhatsApp } from "./landing-icones";

type Props = {
  ctaHref: string | null;
};

const FILA_EXEMPLO = [
  { codigo: "OS-0231", item: "Tênis — troca de sola", status: "Aberta", tom: "bg-[#E7EEF9] text-[#1D3F7A]" },
  { codigo: "OS-0229", item: "Bota — costura e tingimento", status: "Em andamento", tom: "bg-[#FBEBD3] text-[#7A4A0E]" },
  { codigo: "OS-0226", item: "Sapato social — salto", status: "Concluída", tom: "bg-[#DDEFE6] text-[#155B40]" },
  { codigo: "OS-0224", item: "Sandália — fivela", status: "Entregue", tom: "bg-[#ECECEA] text-[#3C4046]" },
] as const;

const KPIS_EXEMPLO = [
  { rotulo: "Recebido", valor: "R$ 1.240,00" },
  { rotulo: "Pendente", valor: "R$ 380,00" },
  { rotulo: "Ticket médio", valor: "R$ 95,00" },
  { rotulo: "OS ativas", valor: "12" },
] as const;

export function LandingHero({ ctaHref }: Props) {
  return (
    <>
      <section id="topo" className={`${CONTAINER} flex flex-wrap items-center gap-14 pb-16 pt-14 sm:pt-20`}>
        <div className="flex min-w-0 flex-[1_1_28rem] flex-col gap-6">
          <span className="inline-flex items-center gap-2 self-start rounded-full border border-[color:var(--lp-border)] bg-white px-3 py-1.5 text-[13px] font-semibold uppercase tracking-[0.04em] text-[color:var(--lp-muted)]">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-[color:var(--lp-accent-2)]" />
            Sistema de gestão para sapatarias
          </span>
          <h1 className="text-balance text-[2.5rem] font-bold leading-[1.05] tracking-[-0.025em] text-[color:var(--lp-ink)] [font-family:var(--lp-display)] sm:text-[3.6rem]">
            Ordens de serviço, caixa, estoque e WhatsApp em um só lugar.
          </h1>
          <p className="max-w-xl text-pretty text-lg leading-relaxed text-[color:var(--lp-muted)] sm:text-xl">
            Feito para o balcão da sapataria: registre o calçado com foto, mande o link de acompanhamento
            para o cliente e avise pelo WhatsApp quando estiver pronto. Sem caderno, sem ligação perguntando
            se já ficou.
          </p>
          {ctaHref ? (
            <div className="flex flex-wrap gap-3 pt-2">
              <a href={ctaHref} className={`${BOTAO_PRIMARIO} min-h-[52px]`}>
                Agendar demonstração
              </a>
              <a href={ctaHref} className={`${BOTAO_SECUNDARIO} min-h-[52px]`}>
                <IconeWhatsApp className="h-5 w-5" />
                Falar no WhatsApp
              </a>
            </div>
          ) : null}
          <ul className="flex flex-wrap gap-x-6 gap-y-2 pt-2 text-sm text-[color:var(--lp-muted)]">
            <li className="inline-flex items-center gap-2">
              <IconeCheck className="h-4 w-4 text-[color:var(--lp-accent)]" />
              Funciona no navegador, sem instalar
            </li>
            <li className="inline-flex items-center gap-2">
              <IconeCheck className="h-4 w-4 text-[color:var(--lp-accent)]" />
              Celular e computador
            </li>
          </ul>
        </div>

        <figure className="min-w-0 flex-[1_1_30rem]">
          <div className="overflow-hidden rounded-2xl border border-[color:var(--lp-border)] bg-white shadow-[0_24px_60px_rgba(23,25,28,0.10)]">
            <div className="flex items-center justify-between border-b border-[color:var(--lp-border)] px-5 py-3.5">
              <div className="flex items-center gap-2.5 text-sm">
                <span aria-hidden="true" className="h-[22px] w-[22px] rounded-md bg-[color:var(--lp-accent)]" />
                <span className="font-semibold">Painel</span>
                <span className="text-[color:var(--lp-muted)]">· Hoje</span>
              </div>
              <span className="rounded-md bg-[color:var(--lp-bg)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--lp-muted)]">
                Dados de exemplo
              </span>
            </div>
            <div className="flex flex-col gap-4 p-5">
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {KPIS_EXEMPLO.map((kpi) => (
                  <div key={kpi.rotulo} className="flex flex-col gap-1.5 rounded-xl bg-[color:var(--lp-bg)] p-3.5">
                    <dt className="text-xs text-[color:var(--lp-muted)]">{kpi.rotulo}</dt>
                    <dd className="text-xl font-medium [font-family:var(--lp-mono)]">{kpi.valor}</dd>
                  </div>
                ))}
              </dl>
              <div className="overflow-hidden rounded-xl border border-[color:var(--lp-border)]">
                <div className="flex justify-between border-b border-[color:var(--lp-border)] bg-[#FAFAF8] px-4 py-3 text-[13px] font-semibold">
                  <span>Fila de ordens de serviço</span>
                  <span className="font-medium text-[color:var(--lp-muted)]">4 de 12</span>
                </div>
                <ul>
                  {FILA_EXEMPLO.map((os, indice) => (
                    <li
                      key={os.codigo}
                      className={`flex items-center justify-between gap-3 px-4 py-3 text-sm ${indice < FILA_EXEMPLO.length - 1 ? "border-b border-[color:var(--lp-border)]" : ""}`}
                    >
                      <span className="flex min-w-0 items-center gap-3">
                        <span className="text-[13px] text-[color:var(--lp-muted)] [font-family:var(--lp-mono)]">{os.codigo}</span>
                        <span className="truncate">{os.item}</span>
                      </span>
                      <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${os.tom}`}>{os.status}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <figcaption className="sr-only">
            Tela do painel: indicadores do dia e fila de ordens de serviço, com dados de exemplo.
          </figcaption>
        </figure>
      </section>

      <section className="border-y border-[color:var(--lp-border)] bg-white">
        <div className={`${CONTAINER} flex flex-wrap items-center justify-center gap-4 py-7 text-center`}>
          <IconeLoja className="h-6 w-6 shrink-0 text-[color:var(--lp-accent)]" />
          <p className="m-0 text-pretty text-[17px] text-[color:var(--lp-ink)]">
            <strong className="font-semibold">Criado dentro de uma sapataria em Brasília</strong> e usado todos
            os dias no balcão, por quem recebe o calçado e por quem fecha o caixa.
          </p>
        </div>
      </section>
    </>
  );
}
