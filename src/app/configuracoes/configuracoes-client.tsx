"use client";

import { useState } from "react";
import { Button, Card, Input, PanelHeader } from "@/components/ui";
import { validarUrlHttps } from "@/lib/configuracoes-schema";

type ConfiguracoesClientProps = {
  linkInicial: string | null;
  nomeEmpresa: string;
};

export function ConfiguracoesClient({ linkInicial, nomeEmpresa }: ConfiguracoesClientProps) {
  const [linkGoogle, setLinkGoogle] = useState(linkInicial ?? "");
  const [linkSalvo, setLinkSalvo] = useState(linkInicial ?? "");
  const [salvando, setSalvando] = useState(false);
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const validacao = validarUrlHttps(linkGoogle);
  const temAlteracao = linkGoogle.trim() !== linkSalvo.trim();

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setMensagemSucesso(null);
    setMensagemErro(null);

    if (!validacao.valido) {
      setMensagemErro(validacao.mensagem || "URL inválida.");
      return;
    }

    setSalvando(true);
    try {
      const response = await fetch("/api/configuracoes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          linkAvaliacaoGoogle: linkGoogle.trim() === "" ? null : linkGoogle.trim(),
        }),
      });

      const payload = await response.json().catch(() => null);

      if (!response.ok) {
        setMensagemErro(payload?.message || "Não foi possível salvar as configurações.");
        return;
      }

      const salvo = payload?.linkAvaliacaoGoogle ?? "";
      setLinkGoogle(salvo);
      setLinkSalvo(salvo);
      setMensagemSucesso("Configurações atualizadas com sucesso.");
    } catch {
      setMensagemErro("Falha de comunicação com o servidor. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  };

  const handleLimpar = () => {
    setLinkGoogle("");
    setMensagemSucesso(null);
    setMensagemErro(null);
  };

  return (
    <Card className="overflow-hidden">
        <div className="border-b border-[color:var(--border)] p-6">
          <PanelHeader
            title="Avaliações de Clientes"
            description="Defina o link oficial para coleta de avaliações da sapataria no Google."
          />
        </div>

        <form onSubmit={handleSalvar} className="p-6 space-y-6">
          <div className="max-w-2xl space-y-2">
            <label
              htmlFor="linkAvaliacaoGoogle"
              className="block text-sm font-semibold text-[color:var(--text)]"
            >
              Link de avaliação no Google
            </label>
            <p id="link-google-descricao" className="text-xs text-slate-500 leading-relaxed">
              Cole o link direto do perfil de {nomeEmpresa} no Google Business / Google Maps (ex.:{" "}
              <code className="rounded bg-black/5 px-1 py-0.5 text-xs text-slate-700">https://g.page/r/.../review</code> ou{" "}
              <code className="rounded bg-black/5 px-1 py-0.5 text-xs text-slate-700">https://maps.app.goo.gl/...</code>).
              Apenas links com protocolo seguro <strong className="font-semibold">HTTPS</strong> são aceitos.
            </p>

            <div className="mt-2 flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Input
                  id="linkAvaliacaoGoogle"
                  name="linkAvaliacaoGoogle"
                  type="text"
                  placeholder="https://g.page/r/sua-empresa/review"
                  value={linkGoogle}
                  onChange={(e) => {
                    setLinkGoogle(e.target.value);
                    setMensagemSucesso(null);
                    setMensagemErro(null);
                  }}
                  aria-describedby="link-google-descricao link-google-feedback"
                  className={!validacao.valido ? "border-red-400 focus:border-red-500" : ""}
                />
              </div>

              {validacao.valido && validacao.urlLimpa ? (
                <a
                  href={validacao.urlLimpa}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 rounded-[var(--r-field)] border border-[color:var(--border)] bg-[color:var(--surface)] px-4 py-2 text-sm font-medium text-slate-700 hover:bg-black/5 transition"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Testar link
                </a>
              ) : null}
            </div>

            <div id="link-google-feedback" className="min-h-[1.5rem]">
              {!validacao.valido && validacao.mensagem ? (
                <p role="alert" className="text-xs font-semibold text-red-600">
                  {validacao.mensagem}
                </p>
              ) : linkGoogle.trim() === "" ? (
                <p className="text-xs text-amber-700">
                  Nenhum link configurado. O modal de entrega não exibirá o botão do WhatsApp até que uma URL seja cadastrada.
                </p>
              ) : (
                <p className="text-xs text-emerald-700 font-medium">
                  URL HTTPS válida.
                </p>
              )}
            </div>
          </div>

          {mensagemSucesso && (
            <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-4 text-sm font-medium text-emerald-800">
              {mensagemSucesso}
            </div>
          )}

          {mensagemErro && (
            <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50/80 p-4 text-sm font-medium text-rose-800">
              {mensagemErro}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-4 border-t border-black/5">
            <Button
              type="submit"
              disabled={salvando || !validacao.valido || !temAlteracao}
              isLoading={salvando}
            >
              Salvar alterações
            </Button>

            {linkGoogle !== "" && (
              <Button
                type="button"
                variant="secondary"
                disabled={salvando}
                onClick={handleLimpar}
              >
                Limpar link
              </Button>
            )}
          </div>
        </form>
    </Card>
  );
}
