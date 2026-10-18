import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "./prisma";
import {
  ITENS_POR_PAGINA_HISTORICO_INSIGHTS,
  listarAnalisesInsight,
  obterAnaliseInsight,
  registrarAnaliseInsight,
} from "./insights-historico";

const ANALISE = {
  resumoExecutivo: "Receita estável.",
  destaques: [{ titulo: "Pix", detalhe: "Principal forma de recebimento." }],
  alertas: [{ titulo: "Estoque", detalhe: "2 insumos zerados.", severidade: "media" as const }],
  oportunidades: [],
  recomendacoes: [{ titulo: "Repor cola", detalhe: "Comprar esta semana.", prioridade: "alta" as const }],
};

let usuarioId: string;

async function limpar() {
  if (usuarioId) await prisma.analiseInsight.deleteMany({ where: { usuarioId } });
}

describe("insights-historico (integração)", () => {
  beforeAll(async () => {
    const usuario = await prisma.usuario.create({
      data: { nome: "Analista Insights", email: `insights-${Date.now()}@teste.local`, senhaHash: "x" },
    });
    usuarioId = usuario.id;
  });

  beforeEach(limpar);

  afterAll(async () => {
    await limpar();
    await prisma.usuario.deleteMany({ where: { id: usuarioId } });
  });

  it("registra e reabre uma análise com o autor", async () => {
    const salva = await registrarAnaliseInsight({
      modelo: "claude-haiku-5-5",
      periodoInicio: "2026-10-01",
      periodoFim: "2026-10-31",
      analise: ANALISE,
      tokensEntrada: 1500,
      tokensSaida: 700,
      usuarioId,
    });

    expect(salva).toMatchObject({ modelo: "claude-haiku-5-5", usuarioNome: "Analista Insights", analise: ANALISE });
    expect(await obterAnaliseInsight(salva.id)).toEqual(salva);
    expect(await obterAnaliseInsight("inexistente")).toBeNull();
  });

  it("lista do mais recente para o mais antigo, paginando", async () => {
    for (let i = 0; i < ITENS_POR_PAGINA_HISTORICO_INSIGHTS + 2; i++) {
      await prisma.analiseInsight.create({
        data: {
          modelo: "claude-opus-5-5",
          periodoInicio: "2026-10-01",
          periodoFim: "2026-10-31",
          resultado: JSON.stringify(ANALISE),
          usuarioId,
          criadoEm: new Date(Date.UTC(2026, 9, 1 + i)),
        },
      });
    }

    const primeira = await listarAnalisesInsight(1);
    const segunda = await listarAnalisesInsight(2);

    expect(primeira.total).toBeGreaterThanOrEqual(ITENS_POR_PAGINA_HISTORICO_INSIGHTS + 2);
    expect(primeira.itens).toHaveLength(ITENS_POR_PAGINA_HISTORICO_INSIGHTS);
    expect(primeira.itens[0].criadoEm >= primeira.itens[1].criadoEm).toBe(true);
    expect(primeira.itens[0]).not.toHaveProperty("analise");
    expect(segunda.itens.length).toBeGreaterThanOrEqual(2);
  });

  it("devolve null para resultado salvo corrompido", async () => {
    const registro = await prisma.analiseInsight.create({
      data: {
        modelo: "claude-haiku-5-5",
        periodoInicio: "2026-10-01",
        periodoFim: "2026-10-31",
        resultado: "{inválido",
        usuarioId,
      },
    });

    expect(await obterAnaliseInsight(registro.id)).toBeNull();
  });
});
