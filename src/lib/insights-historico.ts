import { prisma } from "@/lib/prisma";
import { analiseInsightsSchema, type AnaliseInsights } from "@/lib/insights-schema";

export const ITENS_POR_PAGINA_HISTORICO_INSIGHTS = 10;

export interface ResumoAnaliseInsight {
  id: string;
  modelo: string;
  periodoInicio: string;
  periodoFim: string;
  tokensEntrada: number;
  tokensSaida: number;
  criadoEm: string;
  usuarioNome: string;
}

export interface AnaliseInsightSalva extends ResumoAnaliseInsight {
  analise: AnaliseInsights;
}

const SELECT_RESUMO = {
  id: true,
  modelo: true,
  periodoInicio: true,
  periodoFim: true,
  tokensEntrada: true,
  tokensSaida: true,
  criadoEm: true,
  usuario: { select: { nome: true } },
} as const;

type RegistroResumo = {
  id: string;
  modelo: string;
  periodoInicio: string;
  periodoFim: string;
  tokensEntrada: number;
  tokensSaida: number;
  criadoEm: Date;
  usuario: { nome: string };
};

function paraResumo(registro: RegistroResumo): ResumoAnaliseInsight {
  return {
    id: registro.id,
    modelo: registro.modelo,
    periodoInicio: registro.periodoInicio,
    periodoFim: registro.periodoFim,
    tokensEntrada: registro.tokensEntrada,
    tokensSaida: registro.tokensSaida,
    criadoEm: registro.criadoEm.toISOString(),
    usuarioNome: registro.usuario.nome,
  };
}

export async function registrarAnaliseInsight(dados: {
  modelo: string;
  periodoInicio: string;
  periodoFim: string;
  analise: AnaliseInsights;
  tokensEntrada: number;
  tokensSaida: number;
  usuarioId: string;
}): Promise<AnaliseInsightSalva> {
  const { analise, ...campos } = dados;
  const registro = await prisma.analiseInsight.create({
    data: { ...campos, resultado: JSON.stringify(analise) },
    select: SELECT_RESUMO,
  });
  return { ...paraResumo(registro), analise };
}

export async function listarAnalisesInsight(pagina: number): Promise<{
  itens: ResumoAnaliseInsight[];
  total: number;
  pagina: number;
  porPagina: number;
}> {
  const [registros, total] = await Promise.all([
    prisma.analiseInsight.findMany({
      select: SELECT_RESUMO,
      orderBy: { criadoEm: "desc" },
      skip: (pagina - 1) * ITENS_POR_PAGINA_HISTORICO_INSIGHTS,
      take: ITENS_POR_PAGINA_HISTORICO_INSIGHTS,
    }),
    prisma.analiseInsight.count(),
  ]);

  return { itens: registros.map(paraResumo), total, pagina, porPagina: ITENS_POR_PAGINA_HISTORICO_INSIGHTS };
}

/** `null` quando não existe ou quando o JSON salvo não é mais uma análise válida. */
export async function obterAnaliseInsight(id: string): Promise<AnaliseInsightSalva | null> {
  const registro = await prisma.analiseInsight.findUnique({
    where: { id },
    select: { ...SELECT_RESUMO, resultado: true },
  });
  if (!registro) return null;

  try {
    const analise = analiseInsightsSchema.safeParse(JSON.parse(registro.resultado));
    return analise.success ? { ...paraResumo(registro), analise: analise.data } : null;
  } catch {
    return null;
  }
}
