import type Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { extrairTexto, type MensagemGerada } from "@/lib/assistente-ia";
import type { PersonaAssistente } from "@/lib/assistente-personas";

export const CONVERSAS_POR_PAGINA = 20;
/** Perguntas por conversa: o histórico é reenviado inteiro a cada pergunta, então o custo cresce com ela. */
export const LIMITE_PERGUNTAS_POR_CONVERSA = 30;

export interface ResumoConversa {
  id: string;
  titulo: string;
  persona: PersonaAssistente;
  atualizadoEm: string;
}

export interface MensagemVisivel {
  papel: "user" | "assistant";
  texto: string;
  modelo: string | null;
  criadoEm: string;
}

function tituloDaPergunta(pergunta: string): string {
  const limpa = pergunta.replace(/\s+/g, " ").trim();
  return limpa.length > 80 ? `${limpa.slice(0, 77)}...` : limpa;
}

function paraResumo(conversa: { id: string; titulo: string; persona: string; atualizadoEm: Date }): ResumoConversa {
  return {
    id: conversa.id,
    titulo: conversa.titulo,
    persona: conversa.persona as PersonaAssistente,
    atualizadoEm: conversa.atualizadoEm.toISOString(),
  };
}

function eTurnoDoUsuario(papel: string, conteudo: Anthropic.Beta.BetaMessageParam["content"]): boolean {
  return papel === "user" && Array.isArray(conteudo) && conteudo.every((bloco) => bloco.type === "text");
}

export async function listarConversas(usuarioId: string, pagina: number) {
  const [conversas, total] = await Promise.all([
    prisma.conversaAssistente.findMany({
      where: { usuarioId },
      orderBy: { atualizadoEm: "desc" },
      skip: (pagina - 1) * CONVERSAS_POR_PAGINA,
      take: CONVERSAS_POR_PAGINA,
      select: { id: true, titulo: true, persona: true, atualizadoEm: true },
    }),
    prisma.conversaAssistente.count({ where: { usuarioId } }),
  ]);
  return { itens: conversas.map(paraResumo), total, pagina, porPagina: CONVERSAS_POR_PAGINA };
}

/** Conversa do próprio usuário com o histórico completo da API; `null` se não existir ou for de outro usuário. */
export async function obterConversaCompleta(id: string, usuarioId: string) {
  const conversa = await prisma.conversaAssistente.findFirst({
    where: { id, usuarioId },
    include: { mensagens: { orderBy: { ordem: "asc" } } },
  });
  if (!conversa) return null;

  const mensagens = conversa.mensagens.map((m) => ({
    ...m,
    conteudoApi: JSON.parse(m.conteudo) as Anthropic.Beta.BetaMessageParam["content"],
  }));

  let perguntas = 0;
  const visiveis: MensagemVisivel[] = [];

  for (const m of mensagens) {
    const eTurnoUsuario = eTurnoDoUsuario(m.papel, m.conteudoApi);
    if (eTurnoUsuario) perguntas++;

    const texto = extrairTexto(m.conteudoApi);
    if (!texto) continue;
    if (m.papel === "user" && !eTurnoUsuario) continue;

    visiveis.push({
      papel: m.papel as "user" | "assistant",
      texto,
      modelo: m.modelo,
      criadoEm: m.criadoEm.toISOString(),
    });
  }

  return {
    resumo: paraResumo(conversa),
    historico: mensagens.map((m) => ({ role: m.papel as "user" | "assistant", content: m.conteudoApi })),
    perguntas,
    visiveis,
  };
}

function dadosMensagem(ordem: number, mensagem: MensagemGerada) {
  return {
    ordem,
    papel: mensagem.papel,
    conteudo: JSON.stringify(mensagem.conteudo),
    modelo: mensagem.modelo,
    tokensEntrada: mensagem.tokensEntrada,
    tokensSaida: mensagem.tokensSaida,
  };
}

export async function criarConversaComMensagens(params: {
  usuarioId: string;
  persona: PersonaAssistente;
  pergunta: string;
  mensagens: MensagemGerada[];
}): Promise<ResumoConversa> {
  const conversa = await prisma.conversaAssistente.create({
    data: {
      usuarioId: params.usuarioId,
      persona: params.persona,
      titulo: tituloDaPergunta(params.pergunta),
      mensagens: { create: params.mensagens.map((m, i) => dadosMensagem(i, m)) },
    },
    select: { id: true, titulo: true, persona: true, atualizadoEm: true },
  });
  return paraResumo(conversa);
}

/**
 * Acrescenta mensagens ao final da conversa. `ordemInicial` é o tamanho do
 * histórico lido antes da chamada à IA: se outra requisição acrescentou
 * mensagens no meio tempo, a unicidade (conversaId, ordem) rejeita a gravação.
 */
export async function acrescentarMensagens(
  conversaId: string,
  ordemInicial: number,
  mensagens: MensagemGerada[],
): Promise<void> {
  await prisma.$transaction([
    prisma.mensagemAssistente.createMany({
      data: mensagens.map((m, i) => ({ conversaId, ...dadosMensagem(ordemInicial + i, m) })),
    }),
    prisma.conversaAssistente.update({ where: { id: conversaId }, data: { atualizadoEm: new Date() } }),
  ]);
}

export async function excluirConversa(id: string, usuarioId: string): Promise<boolean> {
  const { count } = await prisma.conversaAssistente.deleteMany({ where: { id, usuarioId } });
  return count > 0;
}
