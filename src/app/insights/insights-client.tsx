"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { DashboardFiltros } from "@/components/dashboard/DashboardFiltros";
import { AssistenteClient } from "./assistente-client";
import { Badge, Button, Card, EmptyState, ErrorState, LoadingState, PanelHeader } from "@/components/ui";
import type { AnaliseInsightSalva, ResumoAnaliseInsight } from "@/lib/insights-historico";
import {
  ROTULO_MODELOS,
  estimarCustoUsd,
  type NivelInsight,
  type OpcaoModeloInsights,
} from "@/lib/insights-schema";

type InsightsClientProps = {
  periodoInicial: { inicio: string; fim: string };
  chaveConfigurada: boolean;
};

type AnaliseExibida = Omit<AnaliseInsightSalva, "id"> & { id: string | null; salva?: boolean };

type Historico = { itens: ResumoAnaliseInsight[]; total: number; pagina: number; porPagina: number };

const OPCOES_MODELO: { id: OpcaoModeloInsights; titulo: string; descricao: string }[] = [
  { id: "economico", titulo: "Econômico", descricao: "Claude Haiku 5.5 · rápido e de baixo custo" },
  { id: "inteligente", titulo: "Inteligente", descricao: "Claude Opus 5.5 · análise mais profunda" },
];

const ORDEM_NIVEL: Record<NivelInsight, number> = { alta: 0, media: 1, baixa: 2 };
const TOM_NIVEL = { alta: "danger", media: "warning", baixa: "neutral" } as const;
const ROTULO_NIVEL: Record<NivelInsight, string> = { alta: "Alta", media: "Média", baixa: "Baixa" };

function formatarDia(dia: string): string {
  const [ano, mes, d] = dia.split("-");
  return `${d}/${mes}/${ano}`;
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

function formatarCusto(modelo: string, entrada: number, saida: number): string | null {
  const custo = estimarCustoUsd(modelo, entrada, saida);
  if (custo === null) return null;
  return custo.toLocaleString("pt-BR", { style: "currency", currency: "USD", maximumFractionDigits: 4 });
}

async function lerJson(response: Response) {
  return response.json().catch(() => null);
}

const ABAS = [
  { id: "analises", rotulo: "Análises" },
  { id: "assistente", rotulo: "Assistente" },
] as const;

export function InsightsClient(props: InsightsClientProps) {
  const [aba, setAba] = useState<(typeof ABAS)[number]["id"]>("analises");

  return (
    <div className="space-y-6">
      <div role="tablist" aria-label="Seções de Insights" className="flex gap-2">
        {ABAS.map((item) => {
          const ativa = aba === item.id;
          return (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`aba-${item.id}`}
              aria-selected={ativa}
              aria-controls={`painel-${item.id}`}
              onClick={() => setAba(item.id)}
              className={`inline-flex min-h-[44px] items-center rounded-full border px-5 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] ${
                ativa
                  ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-white"
                  : "border-[color:var(--border)] bg-white text-[color:var(--text)] hover:bg-black/5"
              }`}
            >
              {item.rotulo}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" id="painel-analises" aria-labelledby="aba-analises" hidden={aba !== "analises"}>
        <AnalisesPainel {...props} />
      </div>
      <div role="tabpanel" id="painel-assistente" aria-labelledby="aba-assistente" hidden={aba !== "assistente"}>
        <AssistenteClient chaveConfigurada={props.chaveConfigurada} />
      </div>
    </div>
  );
}

function AnalisesPainel({ periodoInicial, chaveConfigurada }: InsightsClientProps) {
  const [inicio, setInicio] = useState(periodoInicial.inicio);
  const [fim, setFim] = useState(periodoInicial.fim);
  const [modelo, setModelo] = useState<OpcaoModeloInsights>("economico");
  const [gerando, setGerando] = useState(false);
  const [abrindoId, setAbrindoId] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [analise, setAnalise] = useState<AnaliseExibida | null>(null);
  const [historico, setHistorico] = useState<Historico | null>(null);
  const [erroHistorico, setErroHistorico] = useState<string | null>(null);
  const requisicaoHistorico = useRef(0);

  const carregarHistorico = useCallback(async (pagina: number) => {
    const atual = ++requisicaoHistorico.current;
    setErroHistorico(null);
    try {
      const response = await fetch(`/api/insights?pagina=${pagina}`, { cache: "no-store" });
      const payload = await lerJson(response);
      if (atual !== requisicaoHistorico.current) return;
      if (!response.ok) {
        setErroHistorico(payload?.message || "Não foi possível carregar o histórico.");
        return;
      }
      setHistorico(payload);
    } catch {
      if (atual === requisicaoHistorico.current) setErroHistorico("Falha de comunicação ao carregar o histórico.");
    }
  }, []);

  useEffect(() => {
    void carregarHistorico(1);
  }, [carregarHistorico]);

  const alterarPeriodo = (novoInicio: string, novoFim: string) => {
    setInicio(novoInicio);
    setFim(novoFim);
  };

  const gerar = async () => {
    setGerando(true);
    setErro(null);
    try {
      const response = await fetch("/api/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inicio, fim, modelo }),
      });
      const payload = await lerJson(response);
      if (!response.ok) {
        setErro(payload?.message || "Não foi possível gerar a análise.");
        return;
      }
      setAnalise(payload);
      void carregarHistorico(1);
    } catch {
      setErro("Falha de comunicação com o servidor. Tente novamente.");
    } finally {
      setGerando(false);
    }
  };

  const abrir = async (id: string) => {
    setAbrindoId(id);
    setErro(null);
    try {
      const response = await fetch(`/api/insights/${id}`, { cache: "no-store" });
      const payload = await lerJson(response);
      if (!response.ok) {
        setErro(payload?.message || "Não foi possível abrir a análise.");
        return;
      }
      setAnalise(payload);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setErro("Falha de comunicação com o servidor. Tente novamente.");
    } finally {
      setAbrindoId(null);
    }
  };

  const totalPaginas = historico ? Math.max(1, Math.ceil(historico.total / historico.porPagina)) : 1;

  return (
    <div className="space-y-6">
      {!chaveConfigurada && (
        <div
          role="status"
          className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm font-medium text-amber-900"
        >
          A chave da Claude API ainda não está configurada (ou precisa ser cadastrada novamente).{" "}
          <Link href="/configuracoes" className="font-semibold underline">
            Cadastrar em Configurações
          </Link>
          .
        </div>
      )}

      <DashboardFiltros
        inicio={inicio}
        fim={fim}
        onPeriodoChange={alterarPeriodo}
        onAplicarPeriodo={alterarPeriodo}
        loading={gerando}
      />

      <Card className="space-y-5 p-6">
        <PanelHeader
          title="Gerar nova análise"
          description="A IA lê os indicadores agregados do período (comparados ao período anterior), a situação atual de OS, caixa e estoque, e devolve um diagnóstico com recomendações."
        />
        <div role="radiogroup" aria-label="Modelo de IA" className="grid gap-3 sm:grid-cols-2">
          {OPCOES_MODELO.map((opcao) => {
            const ativo = modelo === opcao.id;
            return (
              <button
                key={opcao.id}
                type="button"
                role="radio"
                aria-checked={ativo}
                disabled={gerando}
                onClick={() => setModelo(opcao.id)}
                className={`rounded-[var(--r-card)] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] disabled:cursor-not-allowed disabled:opacity-60 ${
                  ativo
                    ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-white"
                    : "border-[color:var(--border)] bg-white text-[color:var(--text)] hover:bg-black/5"
                }`}
              >
                <span className="block text-sm font-semibold">{opcao.titulo}</span>
                <span className={`mt-1 block text-xs ${ativo ? "text-white/80" : "text-slate-500"}`}>
                  {opcao.descricao}
                </span>
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button type="button" onClick={gerar} disabled={gerando || !chaveConfigurada} isLoading={gerando}>
            Gerar análise de {formatarDia(inicio)} a {formatarDia(fim)}
          </Button>
          <span className="text-xs text-slate-500">Cada análise consome créditos da conta Anthropic.</span>
        </div>
      </Card>

      {gerando ? (
        <Card>
          <LoadingState text="Analisando os dados do período. Isso pode levar até 1 minuto..." />
        </Card>
      ) : erro ? (
        <ErrorState
          title="Não foi possível concluir"
          description={erro}
          action={
            chaveConfigurada ? (
              <Button type="button" variant="secondary" onClick={gerar}>
                Tentar novamente
              </Button>
            ) : undefined
          }
        />
      ) : analise ? (
        <AnaliseView analise={analise} />
      ) : (
        <EmptyState
          title="Nenhuma análise aberta"
          description="Escolha o período e o modelo e clique em Gerar análise, ou abra uma análise do histórico."
        />
      )}

      <Card className="overflow-hidden">
        <div className="border-b border-[color:var(--border)] p-6">
          <PanelHeader title="Histórico de análises" description="Análises geradas anteriormente, da mais recente para a mais antiga." />
        </div>
        {erroHistorico ? (
          <p role="alert" className="p-6 text-sm font-medium text-rose-700">
            {erroHistorico}
          </p>
        ) : !historico ? (
          <LoadingState text="Carregando histórico..." />
        ) : historico.itens.length === 0 ? (
          <p className="p-6 text-sm text-slate-500">Nenhuma análise gerada ainda.</p>
        ) : (
          <>
            <ul className="divide-y divide-[color:var(--border)]">
              {historico.itens.map((item) => (
                <li key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[color:var(--text)]">
                      {formatarDia(item.periodoInicio)} a {formatarDia(item.periodoFim)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {ROTULO_MODELOS[item.modelo] ?? item.modelo} · {formatarDataHora(item.criadoEm)} · {item.usuarioNome}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={abrindoId !== null || gerando}
                    isLoading={abrindoId === item.id}
                    onClick={() => abrir(item.id)}
                  >
                    {analise?.id === item.id ? "Aberta" : "Abrir"}
                  </Button>
                </li>
              ))}
            </ul>
            {totalPaginas > 1 && (
              <div className="flex items-center justify-between border-t border-[color:var(--border)] p-4 text-sm">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={historico.pagina <= 1}
                  onClick={() => carregarHistorico(historico.pagina - 1)}
                >
                  Anterior
                </Button>
                <span className="text-slate-500">
                  Página {historico.pagina} de {totalPaginas}
                </span>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={historico.pagina >= totalPaginas}
                  onClick={() => carregarHistorico(historico.pagina + 1)}
                >
                  Próxima
                </Button>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  );
}

function ListaPontos({
  titulo,
  vazio,
  itens,
}: {
  titulo: string;
  vazio: string;
  itens: { titulo: string; detalhe: string; nivel?: NivelInsight; rotuloNivel?: string }[];
}) {
  return (
    <Card className="p-6">
      <h3 className="text-base font-semibold text-[color:var(--text)]">{titulo}</h3>
      {itens.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500">{vazio}</p>
      ) : (
        <ul className="mt-4 space-y-4">
          {itens.map((item, indice) => (
            <li key={indice} className="space-y-1">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-semibold text-[color:var(--text)]">{item.titulo}</p>
                {item.nivel && (
                  <Badge tone={TOM_NIVEL[item.nivel]}>
                    {item.rotuloNivel} {ROTULO_NIVEL[item.nivel].toLowerCase()}
                  </Badge>
                )}
              </div>
              <p className="text-sm leading-relaxed text-slate-600">{item.detalhe}</p>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function ordenarPorNivel<T>(itens: T[], nivel: (item: T) => NivelInsight): T[] {
  return [...itens].sort((a, b) => ORDEM_NIVEL[nivel(a)] - ORDEM_NIVEL[nivel(b)]);
}

function AnaliseView({ analise }: { analise: AnaliseExibida }) {
  const { analise: conteudo } = analise;
  const custo = formatarCusto(analise.modelo, analise.tokensEntrada, analise.tokensSaida);

  return (
    <section aria-label="Análise de negócio" className="space-y-6">
      <Card className="p-6">
        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <Badge tone="accent">{ROTULO_MODELOS[analise.modelo] ?? analise.modelo}</Badge>
          <span>
            Período {formatarDia(analise.periodoInicio)} a {formatarDia(analise.periodoFim)}
          </span>
          <span>· gerada em {formatarDataHora(analise.criadoEm)} por {analise.usuarioNome}</span>
          {custo && <span>· custo estimado {custo}</span>}
        </div>
        {analise.salva === false && (
          <p role="status" className="mt-3 text-xs font-semibold text-amber-700">
            Não foi possível salvar esta análise no histórico.
          </p>
        )}
        <h3 className="mt-4 text-base font-semibold text-[color:var(--text)]">Resumo executivo</h3>
        <p className="mt-2 text-sm leading-relaxed text-slate-700">{conteudo.resumoExecutivo}</p>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <ListaPontos titulo="Destaques" vazio="Nenhum destaque identificado." itens={conteudo.destaques} />
        <ListaPontos
          titulo="Alertas e riscos"
          vazio="Nenhum alerta identificado no período."
          itens={ordenarPorNivel(conteudo.alertas, (a) => a.severidade).map((a) => ({
            ...a,
            nivel: a.severidade,
            rotuloNivel: "Severidade",
          }))}
        />
        <ListaPontos titulo="Oportunidades" vazio="Nenhuma oportunidade identificada." itens={conteudo.oportunidades} />
        <ListaPontos
          titulo="Recomendações"
          vazio="Nenhuma recomendação gerada."
          itens={ordenarPorNivel(conteudo.recomendacoes, (r) => r.prioridade).map((r) => ({
            ...r,
            nivel: r.prioridade,
            rotuloNivel: "Prioridade",
          }))}
        />
      </div>

      <p className="text-xs text-slate-500">
        Análise gerada por IA a partir de dados agregados do sistema (sem dados pessoais de clientes). Confira os
        números nos relatórios antes de decisões importantes.
      </p>
    </section>
  );
}
