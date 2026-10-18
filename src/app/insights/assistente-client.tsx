"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge, Button, Card, LoadingState, PanelHeader, Textarea } from "@/components/ui";
import type { MensagemVisivel, ResumoConversa } from "@/lib/assistente-conversas";
import { DEFINICOES_PERSONAS, PERSONAS_ASSISTENTE, type PersonaAssistente } from "@/lib/assistente-personas";
import { LIMITE_CARACTERES_PERGUNTA } from "@/lib/assistente-schema";
import { ROTULO_MODELOS, type OpcaoModeloInsights } from "@/lib/insights-schema";

type AssistenteClientProps = { chaveConfigurada: boolean };

type ListaConversas = { itens: ResumoConversa[]; total: number; pagina: number; porPagina: number };

type MensagemTela = Pick<MensagemVisivel, "papel" | "texto"> & { modelo?: string | null };

const OPCOES_MODELO: { id: OpcaoModeloInsights; rotulo: string }[] = [
  { id: "economico", rotulo: "Econômico" },
  { id: "inteligente", rotulo: "Inteligente" },
];

async function lerJson(response: Response) {
  return response.json().catch(() => null);
}

function formatarDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function AssistenteClient({ chaveConfigurada }: AssistenteClientProps) {
  const [lista, setLista] = useState<ListaConversas | null>(null);
  const [erroLista, setErroLista] = useState<string | null>(null);
  const [conversa, setConversa] = useState<ResumoConversa | null>(null);
  const [persona, setPersona] = useState<PersonaAssistente>("FINANCAS");
  const [modelo, setModelo] = useState<OpcaoModeloInsights>("economico");
  const [mensagens, setMensagens] = useState<MensagemTela[]>([]);
  const [pergunta, setPergunta] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [abrindo, setAbrindo] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [limiteAtingido, setLimiteAtingido] = useState(false);
  const fimDaConversa = useRef<HTMLDivElement>(null);

  const carregarLista = useCallback(async () => {
    setErroLista(null);
    try {
      const response = await fetch("/api/assistente/conversas?pagina=1", { cache: "no-store" });
      const payload = await lerJson(response);
      if (!response.ok) {
        setErroLista(payload?.message || "Não foi possível carregar as conversas.");
        return;
      }
      setLista(payload);
    } catch {
      setErroLista("Falha de comunicação ao carregar as conversas.");
    }
  }, []);

  useEffect(() => {
    void carregarLista();
  }, [carregarLista]);

  useEffect(() => {
    fimDaConversa.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [mensagens, enviando]);

  const novaConversa = () => {
    setConversa(null);
    setMensagens([]);
    setErro(null);
    setLimiteAtingido(false);
    setPergunta("");
  };

  const abrirConversa = async (id: string) => {
    setAbrindo(true);
    setErro(null);
    try {
      const response = await fetch(`/api/assistente/conversas/${id}`, { cache: "no-store" });
      const payload = await lerJson(response);
      if (!response.ok) {
        setErro(payload?.message || "Não foi possível abrir a conversa.");
        return;
      }
      setConversa(payload.conversa);
      setPersona(payload.conversa.persona);
      setMensagens(payload.mensagens);
      setLimiteAtingido(Boolean(payload.limiteAtingido));
    } catch {
      setErro("Falha de comunicação ao abrir a conversa.");
    } finally {
      setAbrindo(false);
    }
  };

  const excluir = async (id: string) => {
    if (!window.confirm("Excluir esta conversa? Esta ação não pode ser desfeita.")) return;
    try {
      const response = await fetch(`/api/assistente/conversas/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await lerJson(response);
        setErroLista(payload?.message || "Não foi possível excluir a conversa.");
        return;
      }
      if (conversa?.id === id) novaConversa();
      void carregarLista();
    } catch {
      setErroLista("Falha de comunicação ao excluir a conversa.");
    }
  };

  const enviar = async (texto: string) => {
    const conteudo = texto.trim();
    if (!conteudo || enviando) return;

    setEnviando(true);
    setErro(null);
    setMensagens((atuais) => [...atuais, { papel: "user", texto: conteudo }]);
    setPergunta("");

    try {
      const response = conversa
        ? await fetch(`/api/assistente/conversas/${conversa.id}/mensagens`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ modelo, pergunta: conteudo }),
          })
        : await fetch("/api/assistente/conversas", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ persona, modelo, pergunta: conteudo }),
          });
      const payload = await lerJson(response);

      if (!response.ok) {
        setMensagens((atuais) => atuais.slice(0, -1));
        setPergunta(conteudo);
        setErro(payload?.message || "Não foi possível obter a resposta.");
        if (payload?.codigo === "LIMITE_CONVERSA") setLimiteAtingido(true);
        return;
      }

      if (payload.conversa) setConversa(payload.conversa);
      setMensagens((atuais) => [...atuais, { papel: "assistant", texto: payload.resposta }]);
      void carregarLista();
    } catch {
      setMensagens((atuais) => atuais.slice(0, -1));
      setPergunta(conteudo);
      setErro("Falha de comunicação com o servidor. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  };

  const definicao = DEFINICOES_PERSONAS[conversa?.persona ?? persona];
  const podeEnviar = chaveConfigurada && !enviando && !limiteAtingido && pergunta.trim() !== "";

  return (
    <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)]">
      <Card className="h-fit overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-[color:var(--border)] p-4">
          <h3 className="text-sm font-semibold text-[color:var(--text)]">Conversas</h3>
          <Button type="button" variant="secondary" onClick={novaConversa} disabled={enviando}>
            Nova conversa
          </Button>
        </div>
        {erroLista ? (
          <p role="alert" className="p-4 text-sm font-medium text-rose-700">
            {erroLista}
          </p>
        ) : !lista ? (
          <LoadingState text="Carregando..." />
        ) : lista.itens.length === 0 ? (
          <p className="p-4 text-sm text-slate-500">Nenhuma conversa ainda.</p>
        ) : (
          <ul className="max-h-[480px] divide-y divide-[color:var(--border)] overflow-y-auto">
            {lista.itens.map((item) => (
              <li key={item.id} className={conversa?.id === item.id ? "bg-black/5" : undefined}>
                <div className="flex items-start gap-2 p-3">
                  <button
                    type="button"
                    disabled={abrindo || enviando}
                    onClick={() => abrirConversa(item.id)}
                    className="min-w-0 flex-1 text-left disabled:cursor-not-allowed"
                  >
                    <span className="block truncate text-sm font-semibold text-[color:var(--text)]">{item.titulo}</span>
                    <span className="mt-0.5 block text-xs text-slate-500">
                      {DEFINICOES_PERSONAS[item.persona]?.rotulo ?? item.persona} · {formatarDataHora(item.atualizadoEm)}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Excluir conversa ${item.titulo}`}
                    disabled={enviando}
                    onClick={() => excluir(item.id)}
                    className="rounded-md px-2 py-1 text-xs font-semibold text-slate-500 hover:bg-black/5 hover:text-rose-700"
                  >
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card className="flex min-h-[560px] flex-col overflow-hidden">
        <div className="border-b border-[color:var(--border)] p-6">
          <PanelHeader
            title={conversa ? conversa.titulo : "Assistente de negócios"}
            description={
              conversa
                ? `${definicao.rotulo} — ${definicao.descricao}`
                : "Escolha a personalidade do assistente e faça uma pergunta. Ele consulta os dados do sistema para responder."
            }
            action={conversa ? <Badge tone="accent">{definicao.rotulo}</Badge> : undefined}
          />
        </div>

        {!chaveConfigurada && (
          <div role="status" className="m-6 mb-0 rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-sm font-medium text-amber-900">
            A chave da Claude API ainda não está configurada.{" "}
            <Link href="/configuracoes" className="font-semibold underline">
              Cadastrar em Configurações
            </Link>
            .
          </div>
        )}

        <div className="flex-1 space-y-4 overflow-y-auto p-6" aria-live="polite">
          {!conversa && mensagens.length === 0 ? (
            <div className="space-y-5">
              <div role="radiogroup" aria-label="Personalidade do assistente" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {PERSONAS_ASSISTENTE.map((id) => {
                  const ativa = persona === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      role="radio"
                      aria-checked={ativa}
                      onClick={() => setPersona(id)}
                      className={`rounded-[var(--r-card)] border p-4 text-left transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent-soft)] ${
                        ativa
                          ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-white"
                          : "border-[color:var(--border)] bg-white text-[color:var(--text)] hover:bg-black/5"
                      }`}
                    >
                      <span className="block text-sm font-semibold">{DEFINICOES_PERSONAS[id].rotulo}</span>
                      <span className={`mt-1 block text-xs ${ativa ? "text-white/80" : "text-slate-500"}`}>
                        {DEFINICOES_PERSONAS[id].descricao}
                      </span>
                    </button>
                  );
                })}
              </div>
              <div className="space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Sugestões</p>
                <div className="flex flex-wrap gap-2">
                  {DEFINICOES_PERSONAS[persona].sugestoes.map((sugestao) => (
                    <button
                      key={sugestao}
                      type="button"
                      disabled={!chaveConfigurada || enviando}
                      onClick={() => enviar(sugestao)}
                      className="rounded-full border border-[color:var(--border)] bg-white px-4 py-2 text-left text-sm text-[color:var(--text)] hover:bg-black/5 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {sugestao}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            mensagens.map((mensagem, indice) => (
              <div key={indice} className={mensagem.papel === "user" ? "flex justify-end" : "flex justify-start"}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    mensagem.papel === "user"
                      ? "bg-[color:var(--ink)] text-white"
                      : "border border-[color:var(--border)] bg-white text-slate-700"
                  }`}
                >
                  {mensagem.texto}
                  {mensagem.papel === "assistant" && mensagem.modelo && (
                    <span className="mt-2 block text-[11px] text-slate-400">{ROTULO_MODELOS[mensagem.modelo] ?? mensagem.modelo}</span>
                  )}
                </div>
              </div>
            ))
          )}
          {enviando && (
            <p role="status" className="text-sm font-medium text-slate-500">
              Consultando os dados e preparando a resposta...
            </p>
          )}
          <div ref={fimDaConversa} />
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void enviar(pergunta);
          }}
          className="space-y-3 border-t border-[color:var(--border)] p-4"
        >
          {erro && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50/80 p-3 text-sm font-medium text-rose-800">
              {erro}
            </div>
          )}
          {limiteAtingido && (
            <p role="status" className="text-sm font-medium text-amber-800">
              Esta conversa atingiu o limite de perguntas. Clique em Nova conversa para continuar.
            </p>
          )}
          <label htmlFor="pergunta-assistente" className="sr-only">
            Pergunta para o assistente
          </label>
          <Textarea
            id="pergunta-assistente"
            rows={3}
            maxLength={LIMITE_CARACTERES_PERGUNTA}
            placeholder="Pergunte sobre o negócio... (Enter envia, Shift+Enter quebra linha)"
            value={pergunta}
            disabled={!chaveConfigurada || limiteAtingido}
            onChange={(e) => setPergunta(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (podeEnviar) void enviar(pergunta);
              }
            }}
          />
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div role="radiogroup" aria-label="Modelo de IA" className="flex gap-2">
              {OPCOES_MODELO.map((opcao) => (
                <button
                  key={opcao.id}
                  type="button"
                  role="radio"
                  aria-checked={modelo === opcao.id}
                  disabled={enviando}
                  onClick={() => setModelo(opcao.id)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                    modelo === opcao.id
                      ? "border-[color:var(--ink)] bg-[color:var(--ink)] text-white"
                      : "border-[color:var(--border)] bg-white text-[color:var(--text)] hover:bg-black/5"
                  }`}
                >
                  {opcao.rotulo}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-slate-500 sm:inline">Cada pergunta consome créditos da conta Anthropic.</span>
              <Button type="submit" disabled={!podeEnviar} isLoading={enviando}>
                Enviar
              </Button>
            </div>
          </div>
        </form>
      </Card>
    </div>
  );
}
