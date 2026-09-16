import { formatPhone, mensagemConclusaoOS, whatsappLink } from "@/lib/formatters";
import type { OsStatus } from "@/lib/ordens-servico-status";

/**
 * Sugestão de contato via WhatsApp ao concluir a OS (Click to Chat).
 * Módulo sem dependência de Node/Prisma: usado pelos componentes cliente.
 */
export type DadosSugestaoConclusao = {
  numeroOS: string;
  nomeCliente: string;
  telefone: string | null | undefined;
  nomeExibicaoEmpresa?: string;
};

/**
 * `urlWhatsApp` vem vazia quando o telefone não serve para WhatsApp — a UI
 * deve desabilitar a ação em vez de gerar um `wa.me` inválido.
 */
export function montarSugestaoConclusao({ numeroOS, nomeCliente, telefone, nomeExibicaoEmpresa }: DadosSugestaoConclusao) {
  const mensagem = mensagemConclusaoOS({ nomeCliente, numeroOS, nomeExibicaoEmpresa });

  return {
    mensagem,
    telefoneFormatado: telefone ? formatPhone(telefone) : "",
    urlWhatsApp: whatsappLink(telefone, mensagem),
  };
}

export type OrdemParaMudancaStatus = {
  id: string;
  numero: string;
  status: string;
  cliente?: { nome: string; telefone?: string | null } | null;
};

export type ResultadoMudancaStatus =
  | {
      ok: true;
      sugestaoConclusao: DadosSugestaoConclusao | null;
      sugestaoAvaliacao?: DadosSugestaoConclusao | null;
    }
  | { ok: false; mensagem: string };

/**
 * Persiste a mudança de status e só então decide se há sugestão de WhatsApp.
 * - `EM_ANDAMENTO -> CONCLUIDA`: sugestaoConclusao (aviso operacional)
 * - `CONCLUIDA -> ENTREGUE`: sugestaoAvaliacao (avaliação no Google)
 * Falha na requisição nunca produz nenhuma sugestão.
 */
export async function alterarStatusOS(
  ordem: OrdemParaMudancaStatus,
  novoStatus: OsStatus,
  fetcher: typeof fetch = fetch,
): Promise<ResultadoMudancaStatus> {
  let response: Response;
  try {
    response = await fetcher(`/api/ordens-servico/${ordem.id}/status`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusNovo: novoStatus }),
    });
  } catch {
    return { ok: false, mensagem: "Não foi possível comunicar com o servidor. Tente novamente." };
  }

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    return { ok: false, mensagem: payload?.message || "Erro ao atualizar status." };
  }

  const concluiu = ordem.status === "EM_ANDAMENTO" && novoStatus === "CONCLUIDA";
  const entregou = ordem.status === "CONCLUIDA" && novoStatus === "ENTREGUE";

  const dadosBasicos: DadosSugestaoConclusao = {
    numeroOS: ordem.numero,
    nomeCliente: ordem.cliente?.nome ?? "",
    telefone: ordem.cliente?.telefone,
  };

  return {
    ok: true,
    sugestaoConclusao: concluiu ? dadosBasicos : null,
    sugestaoAvaliacao: entregou ? dadosBasicos : null,
  };
}
