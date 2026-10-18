import type Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";
import { dataOperacionalHoje } from "@/lib/date-range";
import { LIMITE_DIAS_RECEBIMENTOS_POR_DIA } from "@/lib/dashboard-recebimentos-por-dia";
import { LIMITE_DIAS_PERIODO_INSIGHTS, contarDiasPeriodo } from "@/lib/insights-schema";
import { lerIndicadoresPeriodo, lerSituacaoAtual } from "@/lib/insights-service";

/**
 * Ferramentas somente leitura que a IA pode chamar. Cada uma reutiliza as
 * agregações homologadas e devolve JSON compacto, sem IDs nem dados pessoais.
 */

const DIA = /^\d{4}-\d{2}-\d{2}$/;

function diaValido(valor: string): boolean {
  if (!DIA.test(valor)) return false;
  const [ano, mes, dia] = valor.split("-").map(Number);
  const data = new Date(Date.UTC(ano, mes - 1, dia));
  return data.getUTCFullYear() === ano && data.getUTCMonth() === mes - 1 && data.getUTCDate() === dia;
}

function periodoSchema(limiteDias: number) {
  return z
    .object({
      inicio: z.string().refine(diaValido, "inicio deve ser uma data válida YYYY-MM-DD"),
      fim: z.string().refine(diaValido, "fim deve ser uma data válida YYYY-MM-DD"),
    })
    .strict()
    .refine((p) => p.inicio <= p.fim, "inicio deve ser anterior ou igual a fim")
    .refine((p) => contarDiasPeriodo(p.inicio, p.fim) <= limiteDias, `o período pode ter no máximo ${limiteDias} dias`);
}

const periodoJsonSchema = {
  type: "object",
  properties: {
    inicio: { type: "string", description: "Dia inicial no formato YYYY-MM-DD (inclusive)." },
    fim: { type: "string", description: "Dia final no formato YYYY-MM-DD (inclusive)." },
  },
  required: ["inicio", "fim"],
  additionalProperties: false,
} as const;

const semParametrosJsonSchema = {
  type: "object",
  properties: {},
  additionalProperties: false,
} as const;

interface Ferramenta {
  definicao: Anthropic.Beta.BetaTool;
  executar: (entrada: unknown) => Promise<unknown>;
}

const FERRAMENTAS: Ferramenta[] = [
  {
    definicao: {
      name: "data_de_hoje",
      description: "Retorna a data de hoje (YYYY-MM-DD) no fuso da loja. Use antes de calcular períodos relativos como 'este mês'.",
      input_schema: semParametrosJsonSchema,
      strict: true,
    },
    executar: async () => ({ hoje: dataOperacionalHoje() }),
  },
  {
    definicao: {
      name: "consultar_indicadores_periodo",
      description: `Indicadores agregados de um período: recebido líquido, saldo pendente das OS que entraram no período, ticket médio, OS por status e por situação de pagamento, serviços mais executados, insumos mais usados, atendimentos rápidos, vendas de balcão, recebimentos por forma de pagamento e novos clientes. Período de até ${LIMITE_DIAS_PERIODO_INSIGHTS} dias. Para comparar períodos, chame uma vez para cada.`,
      input_schema: periodoJsonSchema,
      strict: true,
    },
    executar: async (entrada) => {
      const { inicio, fim } = periodoSchema(LIMITE_DIAS_PERIODO_INSIGHTS).parse(entrada);
      const { indicadores } = await lerIndicadoresPeriodo(inicio, fim);
      return { periodo: { inicio, fim }, ...indicadores };
    },
  },
  {
    definicao: {
      name: "consultar_recebimentos_por_dia",
      description: `Recebido líquido por dia (pagamentos menos estornos) de um período de até ${LIMITE_DIAS_RECEBIMENTOS_POR_DIA} dias. Útil para sazonalidade e dias sem movimento.`,
      input_schema: periodoJsonSchema,
      strict: true,
    },
    executar: async (entrada) => {
      const { inicio, fim } = periodoSchema(LIMITE_DIAS_RECEBIMENTOS_POR_DIA).parse(entrada);
      const { recebimentosPorDia } = await lerIndicadoresPeriodo(inicio, fim);
      return { periodo: { inicio, fim }, recebimentosPorDia };
    },
  },
  {
    definicao: {
      name: "consultar_situacao_atual",
      description:
        "Situação atual do negócio (independe de período): OS atrasadas e saldo em aberto delas, OS concluídas aguardando retirada, caixa aberto ou não, estoque de insumos (zerados, abaixo do mínimo, lista dos críticos) e produtos sem estoque.",
      input_schema: semParametrosJsonSchema,
      strict: true,
    },
    executar: async () => lerSituacaoAtual(),
  },
];

export const DEFINICOES_FERRAMENTAS: Anthropic.Beta.BetaTool[] = FERRAMENTAS.map((f) => f.definicao);

/** Executa a ferramenta; erros de validação ou de leitura voltam como `is_error` para a IA corrigir. */
export async function executarFerramenta(
  nome: string,
  entrada: unknown,
): Promise<{ conteudo: string; erro: boolean }> {
  const ferramenta = FERRAMENTAS.find((f) => f.definicao.name === nome);
  if (!ferramenta) return { conteudo: `Ferramenta desconhecida: ${nome}`, erro: true };

  try {
    return { conteudo: JSON.stringify(await ferramenta.executar(entrada ?? {})), erro: false };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { conteudo: `Parâmetros inválidos: ${error.issues.map((i) => i.message).join("; ")}`, erro: true };
    }
    console.error(`Erro ao executar a ferramenta ${nome} do Assistente:`, error);
    return { conteudo: "Falha ao consultar os dados do sistema. Tente novamente mais tarde.", erro: true };
  }
}
