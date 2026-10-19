import { CONTAINER, EYEBROW, TEXTO_SECAO, TITULO_SECAO } from "./landing-estilos";
import { IconeCarrinho, IconeCheck, IconeFaisca, IconeSeta } from "./landing-icones";

const PRODUTOS_EXEMPLO = [
  { nome: "Cadarço encerado", preco: "R$ 12,00", tom: "bg-[#ECECEA]" },
  { nome: "Palmilha em gel", preco: "R$ 39,90", tom: "bg-[#E3E3DF]" },
  { nome: "Impermeabilizante", preco: "R$ 45,00", tom: "bg-[#ECECEA]" },
] as const;

const PERSONAS = ["Finanças", "Operações", "Marketing", "Estratégia", "RH"] as const;

const ITENS_CATALOGO = [
  "Publicar e despublicar produto com um botão",
  "Foto, preço e descrição vindos do seu cadastro",
  "Pedido formatado no WhatsApp, pronto para confirmar",
] as const;

/** Duas seções de destaque: catálogo público e insights com IA. */
export function LandingDestaques() {
  return (
    <>
      <section className={`${CONTAINER} flex flex-wrap items-center gap-14 pb-12 pt-24`}>
        <div className="flex min-w-0 flex-[1_1_26rem] flex-col gap-4">
          <span className={EYEBROW}>Catálogo público</span>
          <h2 className={TITULO_SECAO}>Sua vitrine na internet, com pedido chegando no WhatsApp</h2>
          <p className={TEXTO_SECAO}>
            Publique os produtos que vende no balcão em uma página pública. O cliente monta o carrinho e o pedido chega
            pronto no WhatsApp da loja, sem taxa de marketplace.
          </p>
          <ul className="flex flex-col gap-2.5 text-base">
            {ITENS_CATALOGO.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <IconeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--lp-accent)]" />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <figure className="min-w-0 flex-[1_1_26rem]">
          <div className="overflow-hidden rounded-2xl border border-[color:var(--lp-border)] bg-white shadow-[0_24px_60px_rgba(23,25,28,0.08)]">
            <div className="flex items-center justify-between border-b border-[color:var(--lp-border)] px-5 py-3.5 text-sm">
              <span className="font-semibold">Catálogo · Sua Sapataria</span>
              <span className="inline-flex items-center gap-2 text-[color:var(--lp-muted)]">
                <IconeCarrinho className="h-[18px] w-[18px]" />2 itens
              </span>
            </div>
            <ul className="grid grid-cols-3 gap-3.5 p-5">
              {PRODUTOS_EXEMPLO.map((produto) => (
                <li key={produto.nome} className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--lp-border)]">
                  <div aria-hidden="true" className={`h-24 ${produto.tom}`} />
                  <div className="flex flex-col gap-1 p-3">
                    <span className="text-[13px] font-semibold">{produto.nome}</span>
                    <span className="text-[13px] text-[color:var(--lp-muted)] [font-family:var(--lp-mono)]">{produto.preco}</span>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mx-5 mb-5 flex items-center justify-between gap-3 rounded-xl bg-[color:var(--lp-ink)] px-4 py-3.5 text-sm text-white">
              <span>
                Total <strong className="font-medium [font-family:var(--lp-mono)]">R$ 51,90</strong>
              </span>
              <span className="inline-flex items-center gap-2 font-semibold">
                Enviar pedido no WhatsApp
                <IconeSeta className="h-4 w-4" />
              </span>
            </div>
          </div>
          <figcaption className="sr-only">Tela do catálogo público com produtos e carrinho, dados de exemplo.</figcaption>
        </figure>
      </section>

      <section className={`${CONTAINER} flex flex-wrap-reverse items-center gap-14 pb-24 pt-12`}>
        <figure className="min-w-0 flex-[1_1_26rem]">
          <div className="flex flex-col gap-4 rounded-2xl border border-[color:var(--lp-border)] bg-white p-6 shadow-[0_24px_60px_rgba(23,25,28,0.08)]">
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="inline-flex items-center gap-2.5 font-semibold">
                <span className="inline-flex h-[26px] w-[26px] items-center justify-center rounded-lg bg-[color:var(--lp-accent-2)] text-[color:var(--lp-ink)]">
                  <IconeFaisca className="h-3.5 w-3.5" />
                </span>
                Insight da semana
              </span>
              <span className="rounded-md bg-[color:var(--lp-bg)] px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.06em] text-[color:var(--lp-muted)]">
                Exemplo
              </span>
            </div>
            <p className="text-pretty text-base leading-relaxed">
              Troca de sola representa a maior parte do faturamento das últimas semanas, mas o insumo “sola de borracha”
              está abaixo do estoque mínimo. Vale repor antes do fim de semana.
            </p>
            <ul className="flex flex-wrap gap-2">
              {PERSONAS.map((persona) => (
                <li
                  key={persona}
                  className="rounded-full border border-[color:var(--lp-border-strong)] px-2.5 py-1.5 text-xs font-semibold"
                >
                  {persona}
                </li>
              ))}
            </ul>
          </div>
          <figcaption className="sr-only">Card de insight gerado por inteligência artificial, com as cinco especialidades do assistente.</figcaption>
        </figure>

        <div className="flex min-w-0 flex-[1_1_26rem] flex-col gap-4">
          <span className={EYEBROW}>Insights com inteligência artificial</span>
          <h2 className={TITULO_SECAO}>Leia o seu negócio sem montar planilha</h2>
          <p className={TEXTO_SECAO}>
            O sistema analisa suas ordens, vendas e estoque e devolve observações em português claro. Um assistente com
            cinco especialidades, de finanças a marketing, responde perguntas sobre a sua própria loja.
          </p>
          <p className="text-[15px] text-[color:var(--lp-muted)]">Recurso opcional, ativado com a sua chave de API nas configurações.</p>
        </div>
      </section>
    </>
  );
}
