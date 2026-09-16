import { formatPhone, mensagemAvaliacaoOS, whatsappLink } from "@/lib/formatters";

/**
 * Dados para sugerir mensagem de agradecimento e avaliação no Google
 * ao entregar a OS (Click to Chat).
 */
export type DadosSugestaoAvaliacao = {
  numeroOS: string;
  nomeCliente: string;
  telefone: string | null | undefined;
  linkAvaliacaoGoogle?: string | null;
};

/**
 * Monta o objeto de sugestão de avaliação.
 * Retorna urlWhatsApp vazia se o telefone não for válido ou se o link de avaliação
 * não estiver configurado, permitindo que a UI desabilite a ação apropriadamente.
 */
export function montarSugestaoAvaliacao({
  numeroOS,
  nomeCliente,
  telefone,
  linkAvaliacaoGoogle,
}: DadosSugestaoAvaliacao) {
  const mensagem = mensagemAvaliacaoOS({ nomeCliente, numeroOS, linkAvaliacaoGoogle });
  const telefoneFormatado = telefone ? formatPhone(telefone) : "";
  const temTelefoneValido = Boolean(whatsappLink(telefone));
  const temLinkConfigurado = Boolean(linkAvaliacaoGoogle?.trim());

  const urlWhatsApp =
    temTelefoneValido && temLinkConfigurado && mensagem
      ? whatsappLink(telefone, mensagem)
      : "";

  return {
    mensagem,
    telefoneFormatado,
    urlWhatsApp,
    temTelefoneValido,
    temLinkConfigurado,
  };
}
