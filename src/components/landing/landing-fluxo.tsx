import type { ComponentType } from "react";

import { CARD, CONTAINER, EYEBROW, TEXTO_SECAO, TITULO_SECAO } from "./landing-estilos";
import { IconeCamera, IconeEstrela, IconeLink, IconeWhatsApp } from "./landing-icones";

const PASSOS: ReadonlyArray<{ titulo: string; texto: string; Icone: ComponentType<{ className?: string }> }> = [
  {
    titulo: "Receba e fotografe pelo celular",
    texto:
      "Até 10 itens por ordem, cada um com os serviços e as fotos da entrada. A câmera do celular já abre na tela certa.",
    Icone: IconeCamera,
  },
  {
    titulo: "O cliente acompanha por um link",
    texto: "Sem login, sem aplicativo. Ele vê o status da ordem e as etapas pelo link que você envia na abertura.",
    Icone: IconeLink,
  },
  {
    titulo: "Avise “pronto” pelo WhatsApp",
    texto:
      "Ao concluir, o sistema monta a mensagem de retirada. Um toque e ela abre no WhatsApp da loja, pronta para enviar.",
    Icone: IconeWhatsApp,
  },
  {
    titulo: "Entregue e peça a avaliação",
    texto: "Na entrega, registre o pagamento e envie o agradecimento com o link de avaliação da loja no Google.",
    Icone: IconeEstrela,
  },
];

export function LandingFluxo() {
  return (
    <section id="como-funciona" className={`${CONTAINER} flex flex-col gap-12 pb-20 pt-24`}>
      <div className="flex max-w-3xl flex-col gap-3.5">
        <span className={EYEBROW}>Como funciona</span>
        <h2 className={TITULO_SECAO}>Do balcão à entrega, com o cliente sabendo de tudo</h2>
        <p className={TEXTO_SECAO}>Quatro passos que já acontecem na sua loja, só que sem papel e sem telefone tocando.</p>
      </div>
      <ol className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {PASSOS.map((passo, indice) => (
          <li key={passo.titulo} className={`${CARD} flex flex-col gap-3.5 p-6`}>
            <span className="text-[13px] font-medium text-[color:var(--lp-muted)] [font-family:var(--lp-mono)]">
              {String(indice + 1).padStart(2, "0")}
            </span>
            <passo.Icone className="h-7 w-7 text-[color:var(--lp-accent)]" />
            <h3 className="text-balance text-xl font-semibold leading-tight text-[color:var(--lp-ink)]">{passo.titulo}</h3>
            <p className="text-pretty text-[15px] leading-relaxed text-[color:var(--lp-muted)]">{passo.texto}</p>
          </li>
        ))}
      </ol>
    </section>
  );
}
