import { formatarCentavos } from "@/lib/centavos";
import { APF, PREMISSAS, type PrecosLanding } from "@/lib/landing-precos";

import { BOTAO_PRIMARIO, CONTAINER, EYEBROW, TEXTO_SECAO, TITULO_SECAO } from "./landing-estilos";
import { IconeCheck } from "./landing-icones";

type Props = {
  precos: PrecosLanding;
  ctaHref: string | null;
};

const INCLUSO = [
  "Ordens de serviço com fotos e acompanhamento online",
  "Mensagens de WhatsApp prontas em cada etapa",
  "Atendimento rápido e vendas de balcão",
  "Caixa, estoque, insumos e relatórios",
  "Catálogo público com pedido pelo WhatsApp",
  "Usuários da equipe sem limite por conta",
  "Insights com IA (opcional, com sua chave de API)",
] as const;

const LINHAS_APF = [
  { tipo: "Arquivos lógicos internos", itens: "16 arquivos (OS, venda, caixa, estoque, clientes…)", pf: APF.arquivosLogicosInternos },
  { tipo: "Entradas externas", itens: "62 transações (cadastros, OS, pagamentos, caixa, fotos)", pf: APF.entradasExternas },
  { tipo: "Saídas externas", itens: "20 saídas (painel, relatórios, recibo, insights, WhatsApp)", pf: APF.saidasExternas },
  { tipo: "Consultas externas", itens: "28 consultas (listas, detalhes, extratos, catálogo)", pf: APF.consultasExternas },
] as const;

const porcentagem = (fracao: number) => `${Math.round(fracao * 100)}%`;

export function LandingPreco({ precos, ctaHref }: Props) {
  return (
    <section id="preco" className={`${CONTAINER} flex flex-col gap-14 py-24`}>
      <div className="flex flex-wrap items-start gap-14">
        <div className="flex min-w-0 flex-[1_1_22rem] flex-col gap-3.5">
          <span className={EYEBROW}>Preço</span>
          <h2 className={TITULO_SECAO}>Um plano, a loja inteira</h2>
          <p className={TEXTO_SECAO}>
            Sem módulos escondidos. Ordens, vendas, caixa, estoque, catálogo e relatórios vêm juntos. O preço vem de uma
            medição do sistema em pontos de função, explicada abaixo.
          </p>
          <p className="text-[15px] text-[color:var(--lp-muted)]">
            Quer ver funcionando com os serviços da sua loja? Agende uma demonstração.
          </p>
        </div>

        <div className="flex min-w-0 flex-[1_1_26rem] flex-col gap-6 rounded-2xl border-2 border-[color:var(--lp-accent)] bg-white p-7 sm:p-9">
          <div className="flex flex-col gap-1.5">
            <span className="text-sm font-semibold text-[color:var(--lp-muted)]">Plano Loja</span>
            <dl className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <div className="flex flex-col gap-1">
                <dt className="text-sm text-[color:var(--lp-muted)]">Assinatura</dt>
                <dd className="flex items-baseline gap-1.5">
                  <span className="text-[2.6rem] font-bold leading-none tracking-[-0.02em] [font-family:var(--lp-display)]">
                    {formatarCentavos(precos.assinaturaMensalCentavos)}
                  </span>
                  <span className="text-base text-[color:var(--lp-muted)]">/mês</span>
                </dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="text-sm text-[color:var(--lp-muted)]">Implantação (única)</dt>
                <dd className="text-[1.75rem] font-bold leading-none tracking-[-0.02em] [font-family:var(--lp-display)]">
                  {formatarCentavos(precos.implantacaoCentavos)}
                </dd>
              </div>
            </dl>
          </div>
          <ul className="flex flex-col gap-3 text-base">
            {INCLUSO.map((item) => (
              <li key={item} className="flex items-start gap-2.5">
                <IconeCheck className="mt-0.5 h-5 w-5 shrink-0 text-[color:var(--lp-accent)]" />
                {item}
              </li>
            ))}
          </ul>
          {ctaHref ? (
            <a href={ctaHref} className={`${BOTAO_PRIMARIO} min-h-[52px] w-full`}>
              Agendar demonstração
            </a>
          ) : null}
          <p className="text-center text-[13px] text-[color:var(--lp-muted)]">
            Valores por loja, sem impostos. Condições de implantação, suporte e prazo são combinadas na demonstração.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-6 rounded-2xl border border-[color:var(--lp-border)] bg-white p-7 sm:p-9">
        <div className="flex flex-col gap-2">
          <h3 className="text-balance text-2xl font-bold tracking-[-0.02em] [font-family:var(--lp-display)]">Como chegamos ao preço</h3>
          <p className="text-pretty text-[15px] leading-relaxed text-[color:var(--lp-muted)]">
            O sistema foi medido pela Análise de Pontos de Função (IFPUG): cada arquivo de dados e cada transação que a
            loja usa vale pontos conforme a complexidade. O total é a base de todos os valores.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[32rem] text-left text-[15px]">
            <thead>
              <tr className="border-b border-[color:var(--lp-border)] text-[13px] uppercase tracking-[0.04em] text-[color:var(--lp-muted)]">
                <th scope="col" className="py-2 pr-4 font-semibold">Tipo de função</th>
                <th scope="col" className="py-2 pr-4 font-semibold">O que foi contado</th>
                <th scope="col" className="py-2 text-right font-semibold">PF</th>
              </tr>
            </thead>
            <tbody>
              {LINHAS_APF.map((linha) => (
                <tr key={linha.tipo} className="border-b border-[color:var(--lp-border)]">
                  <th scope="row" className="py-2.5 pr-4 font-medium text-[color:var(--lp-ink)]">{linha.tipo}</th>
                  <td className="py-2.5 pr-4 text-[color:var(--lp-muted)]">{linha.itens}</td>
                  <td className="py-2.5 text-right [font-family:var(--lp-mono)]">{linha.pf}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th scope="row" colSpan={2} className="pt-3 pr-4 font-semibold">Total</th>
                <td className="pt-3 text-right font-semibold [font-family:var(--lp-mono)]">{precos.totalPontosFuncao} PF</td>
              </tr>
            </tfoot>
          </table>
        </div>

        <dl className="grid grid-cols-1 gap-4 text-[15px] sm:grid-cols-3">
          <div className="flex flex-col gap-1 rounded-xl bg-[color:var(--lp-bg)] p-4">
            <dt className="text-[13px] text-[color:var(--lp-muted)]">Valor de desenvolvimento</dt>
            <dd className="font-medium [font-family:var(--lp-mono)]">{formatarCentavos(precos.valorDesenvolvimentoCentavos)}</dd>
            <dd className="text-[13px] text-[color:var(--lp-muted)]">
              {precos.totalPontosFuncao} PF × {formatarCentavos(PREMISSAS.valorPontoFuncaoCentavos)} por ponto
            </dd>
          </div>
          <div className="flex flex-col gap-1 rounded-xl bg-[color:var(--lp-bg)] p-4">
            <dt className="text-[13px] text-[color:var(--lp-muted)]">Implantação por loja</dt>
            <dd className="font-medium [font-family:var(--lp-mono)]">{formatarCentavos(precos.implantacaoCentavos)}</dd>
            <dd className="text-[13px] text-[color:var(--lp-muted)]">
              Desenvolvimento dividido entre {PREMISSAS.lojasAlvo} lojas, arredondado para cima
            </dd>
          </div>
          <div className="flex flex-col gap-1 rounded-xl bg-[color:var(--lp-bg)] p-4">
            <dt className="text-[13px] text-[color:var(--lp-muted)]">Assinatura por loja</dt>
            <dd className="font-medium [font-family:var(--lp-mono)]">{formatarCentavos(precos.assinaturaMensalCentavos)}/mês</dd>
            <dd className="text-[13px] text-[color:var(--lp-muted)]">
              Infraestrutura {formatarCentavos(PREMISSAS.infraMensalPorLojaCentavos)} + manutenção{" "}
              {porcentagem(PREMISSAS.manutencaoAnualFracao)} a.a. + suporte{" "}
              {formatarCentavos(PREMISSAS.suporteMensalPorLojaCentavos)}, com margem de {porcentagem(PREMISSAS.margemFracao)}
            </dd>
          </div>
        </dl>
      </div>
    </section>
  );
}
