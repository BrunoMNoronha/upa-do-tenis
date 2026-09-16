import { mensagemAberturaOS, whatsappLink } from "@/lib/formatters";

/**
 * Monta a sugestão de compartilhamento do acompanhamento público da OS.
 * Módulo sem dependência de Node/Prisma: usado pelos componentes cliente.
 *
 * `urlWhatsApp` vem vazia quando o telefone não serve para WhatsApp — a UI
 * deve desabilitar a ação em vez de gerar um `wa.me` inválido. O link de
 * acompanhamento existe independentemente do telefone.
 */
export function montarSugestaoAcompanhamento({
  origem,
  caminhoAcompanhamento,
  nomeCliente,
  numeroOS,
  telefone,
}: {
  origem: string;
  caminhoAcompanhamento: string;
  nomeCliente: string;
  numeroOS: string;
  telefone: string | null | undefined;
}) {
  const linkAcompanhamento = `${origem.replace(/\/+$/, "")}${caminhoAcompanhamento}`;
  const mensagem = mensagemAberturaOS({ nomeCliente, numeroOS, linkAcompanhamento });

  return {
    linkAcompanhamento,
    mensagem,
    urlWhatsApp: whatsappLink(telefone, mensagem),
  };
}
