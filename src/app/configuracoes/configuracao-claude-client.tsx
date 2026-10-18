"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Badge, Button, Card, Input, PanelHeader } from "@/components/ui";
import type { StatusChaveClaude } from "@/lib/insights-config";

type ConfiguracaoClaudeClientProps = {
  statusInicial: StatusChaveClaude;
};

type Feedback = { tipo: "sucesso" | "erro"; texto: string } | null;

export function ConfiguracaoClaudeClient({ statusInicial }: ConfiguracaoClaudeClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState(statusInicial);
  const [apiKey, setApiKey] = useState("");
  const [acao, setAcao] = useState<"salvar" | "testar" | "remover" | null>(null);
  const [feedback, setFeedback] = useState<Feedback>(null);

  async function executar(
    tipo: "salvar" | "testar" | "remover",
    requisicao: () => Promise<Response>,
    aoConcluir: (payload: Record<string, unknown>) => void,
  ) {
    setAcao(tipo);
    setFeedback(null);
    try {
      const response = await requisicao();
      const payload = await response.json().catch(() => null);
      if (!response.ok) {
        setFeedback({ tipo: "erro", texto: payload?.message || "Não foi possível concluir a operação." });
        return;
      }
      aoConcluir(payload ?? {});
      setFeedback({ tipo: "sucesso", texto: payload?.message || "Operação concluída." });
    } catch {
      setFeedback({ tipo: "erro", texto: "Falha de comunicação com o servidor. Tente novamente." });
    } finally {
      setAcao(null);
    }
  }

  const salvar = (e: React.FormEvent) => {
    e.preventDefault();
    void executar(
      "salvar",
      () =>
        fetch("/api/configuracoes/claude", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: apiKey.trim() }),
        }),
      (payload) => {
        setStatus({ configurada: true, ultimosQuatro: (payload.ultimosQuatro as string) ?? null });
        setApiKey("");
        router.refresh();
      },
    );
  };

  const testar = () =>
    void executar("testar", () => fetch("/api/configuracoes/claude/testar", { method: "POST" }), () => {});

  const remover = () => {
    if (!window.confirm("Remover a chave da Claude API? A tela de Insights deixará de gerar análises.")) return;
    void executar("remover", () => fetch("/api/configuracoes/claude", { method: "DELETE" }), () => {
      setStatus({ configurada: false, ultimosQuatro: null });
      router.refresh();
    });
  };

  const ocupado = acao !== null;

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-[color:var(--border)] p-6">
        <PanelHeader
          title="Inteligência Artificial (Claude)"
          description="Chave da Claude API usada pela tela de Insights para gerar análises de negócio."
          action={
            status.configurada ? (
              <Badge tone="success">Configurada</Badge>
            ) : (
              <Badge tone="warning">Não configurada</Badge>
            )
          }
        />
      </div>

      <form onSubmit={salvar} className="space-y-6 p-6">
        <div className="max-w-2xl space-y-2">
          <label htmlFor="claudeApiKey" className="block text-sm font-semibold text-[color:var(--text)]">
            {status.configurada ? "Substituir chave da API" : "Chave da API"}
          </label>
          <p id="claude-api-key-descricao" className="text-xs leading-relaxed text-slate-500">
            Gere a chave em{" "}
            <a
              href="https://platform.claude.com/settings/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              platform.claude.com
            </a>
            . Ela é guardada criptografada e nunca é exibida novamente; cada análise gerada consome créditos da
            conta Anthropic.
            {status.configurada && status.ultimosQuatro ? (
              <>
                {" "}
                Chave atual termina em <strong className="font-mono">••••{status.ultimosQuatro}</strong>.
              </>
            ) : null}
          </p>
          <Input
            id="claudeApiKey"
            name="claudeApiKey"
            type="password"
            autoComplete="off"
            spellCheck={false}
            placeholder="sk-ant-..."
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setFeedback(null);
            }}
            aria-describedby="claude-api-key-descricao"
          />
        </div>

        {feedback && (
          <div
            role={feedback.tipo === "erro" ? "alert" : "status"}
            className={
              feedback.tipo === "erro"
                ? "rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm font-medium text-rose-800"
                : "rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm font-medium text-emerald-800"
            }
          >
            {feedback.texto}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3 border-t border-black/5 pt-4">
          <Button type="submit" disabled={ocupado || apiKey.trim() === ""} isLoading={acao === "salvar"}>
            Salvar chave
          </Button>
          {status.configurada && (
            <>
              <Button type="button" variant="secondary" disabled={ocupado} isLoading={acao === "testar"} onClick={testar}>
                Testar conexão
              </Button>
              <Button type="button" variant="secondary" disabled={ocupado} isLoading={acao === "remover"} onClick={remover}>
                Remover chave
              </Button>
            </>
          )}
        </div>
      </form>
    </Card>
  );
}
