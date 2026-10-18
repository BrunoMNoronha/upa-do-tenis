import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/insights-service", () => ({
  lerIndicadoresPeriodo: vi.fn(),
  lerSituacaoAtual: vi.fn(),
}));
vi.mock("@/lib/date-range", () => ({ dataOperacionalHoje: () => "2026-10-18" }));

import { lerIndicadoresPeriodo, lerSituacaoAtual } from "@/lib/insights-service";
import { DEFINICOES_FERRAMENTAS, executarFerramenta } from "./assistente-ferramentas";
import { DEFINICOES_PERSONAS, PERSONAS_ASSISTENTE, montarPromptSistema } from "./assistente-personas";

describe("personas do Assistente", () => {
  it("define as 5 personalidades com prompt próprio e regras comuns", () => {
    expect(PERSONAS_ASSISTENTE).toEqual(["RH", "FINANCAS", "ESTRATEGIA", "MARKETING", "OPERACOES"]);
    for (const persona of PERSONAS_ASSISTENTE) {
      const prompt = montarPromptSistema(persona);
      expect(prompt).toContain(DEFINICOES_PERSONAS[persona].foco);
      expect(prompt).toContain("Nunca invente valores");
      expect(DEFINICOES_PERSONAS[persona].sugestoes.length).toBeGreaterThan(0);
    }
    expect(montarPromptSistema("RH")).toContain("NÃO possui cadastro de funcionários");
  });
});

describe("ferramentas do Assistente", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(lerIndicadoresPeriodo).mockResolvedValue({
      indicadores: { recebidoLiquido: 100 } as never,
      recebimentosPorDia: [{ dia: "2026-10-01", valor: 100 }],
    });
    vi.mocked(lerSituacaoAtual).mockResolvedValue({ osAguardandoRetirada: 3 } as never);
  });

  it("declara ferramentas estritas, sem parâmetros extras", () => {
    expect(DEFINICOES_FERRAMENTAS.map((f) => f.name)).toEqual([
      "data_de_hoje",
      "consultar_indicadores_periodo",
      "consultar_recebimentos_por_dia",
      "consultar_situacao_atual",
    ]);
    for (const ferramenta of DEFINICOES_FERRAMENTAS) {
      expect(ferramenta.strict).toBe(true);
      expect(ferramenta.input_schema).toMatchObject({ additionalProperties: false });
    }
  });

  it("executa consultas válidas", async () => {
    expect(await executarFerramenta("data_de_hoje", {})).toEqual({ conteudo: '{"hoje":"2026-10-18"}', erro: false });

    const indicadores = await executarFerramenta("consultar_indicadores_periodo", { inicio: "2026-10-01", fim: "2026-10-18" });
    expect(indicadores.erro).toBe(false);
    expect(JSON.parse(indicadores.conteudo)).toEqual({ periodo: { inicio: "2026-10-01", fim: "2026-10-18" }, recebidoLiquido: 100 });
    expect(lerIndicadoresPeriodo).toHaveBeenCalledWith("2026-10-01", "2026-10-18");

    const serie = await executarFerramenta("consultar_recebimentos_por_dia", { inicio: "2026-10-01", fim: "2026-10-18" });
    expect(JSON.parse(serie.conteudo).recebimentosPorDia).toHaveLength(1);

    expect(JSON.parse((await executarFerramenta("consultar_situacao_atual", {})).conteudo)).toEqual({ osAguardandoRetirada: 3 });
  });

  it.each([
    [{ inicio: "2026-13-01", fim: "2026-10-18" }],
    [{ inicio: "2026-10-18", fim: "2026-10-01" }],
    [{ inicio: "2024-01-01", fim: "2026-10-18" }],
    [{ inicio: "2026-10-01" }],
    [{ inicio: "2026-10-01", fim: "2026-10-18", extra: 1 }],
  ])("devolve erro de parâmetros para a IA corrigir %#", async (entrada) => {
    const resultado = await executarFerramenta("consultar_indicadores_periodo", entrada);
    expect(resultado.erro).toBe(true);
    expect(resultado.conteudo).toMatch(/^Parâmetros inválidos/);
    expect(lerIndicadoresPeriodo).not.toHaveBeenCalled();
  });

  it("limita a série diária a 92 dias", async () => {
    const resultado = await executarFerramenta("consultar_recebimentos_por_dia", { inicio: "2026-01-01", fim: "2026-10-18" });
    expect(resultado.erro).toBe(true);
  });

  it("trata ferramenta desconhecida e falha de leitura sem lançar", async () => {
    expect(await executarFerramenta("apagar_tudo", {})).toEqual({ conteudo: "Ferramenta desconhecida: apagar_tudo", erro: true });

    vi.mocked(lerSituacaoAtual).mockRejectedValue(new Error("banco fora"));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const resultado = await executarFerramenta("consultar_situacao_atual", {});
    expect(resultado.erro).toBe(true);
    expect(resultado.conteudo).not.toContain("banco fora");
  });
});
