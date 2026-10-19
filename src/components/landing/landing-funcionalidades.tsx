import type { ComponentType } from "react";

import { CONTAINER, EYEBROW, TEXTO_SECAO, TITULO_SECAO } from "./landing-estilos";
import {
  IconeCaixa,
  IconeCamadas,
  IconeCarrinho,
  IconeDocumento,
  IconeGrafico,
  IconeLink,
  IconeRaio,
  IconeWhatsApp,
} from "./landing-icones";

const FUNCIONALIDADES: ReadonlyArray<{ titulo: string; texto: string; Icone: ComponentType<{ className?: string }> }> = [
  {
    titulo: "Ordens de serviço com fotos",
    texto:
      "Vários itens por ordem, status Aberta, Em andamento, Concluída e Entregue, histórico de cada mudança e galeria de fotos.",
    Icone: IconeDocumento,
  },
  {
    titulo: "Acompanhamento online",
    texto: "Link seguro e exclusivo de cada ordem. O cliente consulta o andamento sozinho, a qualquer hora.",
    Icone: IconeLink,
  },
  {
    titulo: "WhatsApp em um toque",
    texto: "Mensagens prontas na abertura, na conclusão e na entrega, com o nome do cliente e os dados da ordem preenchidos.",
    Icone: IconeWhatsApp,
  },
  {
    titulo: "Atendimento rápido",
    texto: "Serviço feito na hora, sem cadastrar cliente nem abrir ordem. Código próprio, pagamento dividido e estorno com motivo.",
    Icone: IconeRaio,
  },
  {
    titulo: "Vendas de balcão",
    texto: "Venda de produtos com estoque e caixa atualizados na hora, recibo para imprimir e cancelamento com motivo.",
    Icone: IconeCarrinho,
  },
  {
    titulo: "Caixa com fechamento",
    texto:
      "Abertura, movimentações e fechamento diário. Nenhum pagamento entra sem caixa aberto, e um caixa pendente trava o próximo.",
    Icone: IconeCaixa,
  },
  {
    titulo: "Insumos e estoque mínimo",
    texto:
      "Cola, sola, linha, salto: cada insumo com estoque mínimo, alerta no painel e extrato de movimentações que não se apaga.",
    Icone: IconeCamadas,
  },
  {
    titulo: "Relatórios",
    texto:
      "Financeiro das ordens por período, forma de pagamento e serviço. Estoque consolidado com insumos críticos e últimas movimentações.",
    Icone: IconeGrafico,
  },
];

export function LandingFuncionalidades() {
  return (
    <section id="funcionalidades" className="border-y border-[color:var(--lp-border)] bg-white">
      <div className={`${CONTAINER} flex flex-col gap-12 py-24`}>
        <div className="flex max-w-3xl flex-col gap-3.5">
          <span className={EYEBROW}>Funcionalidades</span>
          <h2 className={TITULO_SECAO}>Tudo o que a operação da loja precisa</h2>
          <p className={TEXTO_SECAO}>
            Ordens, vendas, caixa e estoque conversam entre si. O que entra no balcão aparece no financeiro sem retrabalho.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {FUNCIONALIDADES.map((item) => (
            <li
              key={item.titulo}
              className="flex flex-col gap-3 rounded-xl border border-[color:var(--lp-border)] bg-[color:var(--lp-bg)] p-6"
            >
              <item.Icone className="h-[26px] w-[26px] text-[color:var(--lp-ink)]" />
              <h3 className="text-lg font-semibold text-[color:var(--lp-ink)]">{item.titulo}</h3>
              <p className="text-pretty text-[15px] leading-relaxed text-[color:var(--lp-muted)]">{item.texto}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
