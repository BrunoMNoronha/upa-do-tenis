/**
 * Resumo do pedido do catálogo e link de clique para conversa (#273). Módulo
 * puro. O link só abre a conversa com o texto preenchido: o envio é feito pelo
 * visitante no WhatsApp e não há registro de pedido no sistema.
 */
import { formatarCentavos } from "./centavos";
import { subtotalCentavos, totalCentavos, type ItemCarrinho } from "./carrinho-catalogo";
import { whatsappLink } from "./formatters";

/** Acima disso alguns aplicativos/navegadores truncam ou recusam o `wa.me`. */
export const LIMITE_LINK_WHATSAPP = 2000;

export const MENSAGEM_CONVERSA_CURTA =
  "Olá! Montei um pedido no catálogo do site e vou colar o resumo aqui.";

function textoEmLinha(texto: string) {
  return texto.replace(/\s+/g, " ").trim();
}

export function montarResumoPedido(params: { nomeLoja: string; itens: readonly ItemCarrinho[] }): string {
  const linhas = params.itens.map((item) => {
    const unitario = formatarCentavos(item.precoCentavos);
    const subtotal = formatarCentavos(subtotalCentavos(item));
    return `- ${item.quantidade} x ${textoEmLinha(item.nome)} (${unitario} cada) = ${subtotal}`;
  });

  return [
    `Olá, ${textoEmLinha(params.nomeLoja)}! Gostaria de fazer um pedido pelo catálogo do site:`,
    "",
    ...linhas,
    "",
    `Total dos produtos: ${formatarCentavos(totalCentavos(params.itens))}`,
    "",
    "Valores conforme o catálogo. Disponibilidade, pagamento e retirada/entrega a combinar.",
  ].join("\n");
}

export type EnvioPedido =
  | { status: "SEM_ITENS" }
  | { status: "SEM_DESTINO"; resumo: string }
  | { status: "PRONTO"; resumo: string; link: string }
  | { status: "LONGO"; resumo: string; linkConversa: string };

/**
 * Decide como encaminhar o pedido. Sem itens ou sem telefone válido não há
 * link de pedido; resumo longo demais abre a conversa com texto curto e o
 * visitante cola o resumo copiado.
 */
export function montarEnvioPedido(params: {
  whatsapp: string | null;
  nomeLoja: string;
  itens: readonly ItemCarrinho[];
}): EnvioPedido {
  if (params.itens.length === 0) return { status: "SEM_ITENS" };
  const resumo = montarResumoPedido(params);
  const conversa = whatsappLink(params.whatsapp);
  if (!conversa) return { status: "SEM_DESTINO", resumo };

  const link = whatsappLink(params.whatsapp, resumo);
  if (link.length <= LIMITE_LINK_WHATSAPP) return { status: "PRONTO", resumo, link };
  return { status: "LONGO", resumo, linkConversa: whatsappLink(params.whatsapp, MENSAGEM_CONVERSA_CURTA) };
}
