"use client";

import { useMemo, useRef, useState } from "react";

import { Combobox } from "@/components/combobox";
import { Badge, Button, Card, EmptyState, Input, Label, SectionTitle } from "@/components/ui";
import {
  centavosDaMascara,
  mascaraDeCentavos,
  mascaraDoPrecoCatalogo,
  montarPayloadAtendimento,
  resumirFormulario,
  validarFormulario,
  type LinhaPagamentoFormulario,
  type LinhaServicoFormulario,
  type ServicoCatalogo,
} from "@/lib/atendimento-rapido-formulario";
import { OBSERVACOES_TAMANHO_MAXIMO } from "@/lib/atendimento-rapido-schema";
import { formatarCentavos, paraCentavos } from "@/lib/centavos";
import { maskCurrency } from "@/lib/formatters";

type FormaPagamento = { id: string; nome: string };

type AtendimentoRegistrado = {
  codigo: string;
  valorTotal: number;
  pagamentos: { id: string; valor: number; formaPagamento: { nome: string } }[];
};

type Estado =
  | { tipo: "editando" }
  | { tipo: "enviando" }
  | { tipo: "erro"; mensagem: string }
  | { tipo: "sucesso"; atendimento: AtendimentoRegistrado };

const classeSelect =
  "w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[color:var(--text)] outline-none transition focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)] disabled:opacity-60";

/** Chave de idempotência por atendimento; reaproveitada em retries do mesmo formulário. */
function novaChave(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

// Chaves das linhas: as iniciais são fixas para o HTML do servidor e o do
// navegador coincidirem na hidratação; as seguintes vêm de um contador local.
const novaLinhaServico = (chave: string): LinhaServicoFormulario => ({
  chave,
  servicoId: "",
  valor: "",
});

const novaLinhaPagamento = (chave: string, valor = ""): LinhaPagamentoFormulario => ({
  chave,
  formaPagamentoId: "",
  valor,
});

export function AtendimentoRapidoClient({
  servicos: catalogo,
  formasPagamento,
}: {
  servicos: ServicoCatalogo[];
  formasPagamento: FormaPagamento[];
}) {
  const contadorLinhas = useRef(0);
  const chaveLinha = () => `linha-${++contadorLinhas.current}`;
  const [servicos, setServicos] = useState<LinhaServicoFormulario[]>(() => [novaLinhaServico("servico-inicial")]);
  const [pagamentos, setPagamentos] = useState<LinhaPagamentoFormulario[]>(() => [novaLinhaPagamento("pagamento-inicial")]);
  const [observacoes, setObservacoes] = useState("");
  const [chaveIdempotencia, setChaveIdempotencia] = useState(novaChave);
  const [estado, setEstado] = useState<Estado>({ tipo: "editando" });
  const [erroValidacao, setErroValidacao] = useState<string | null>(null);
  // Trava síncrona: o estado do React só muda no próximo render, então dois
  // cliques no mesmo frame passariam pelo `disabled`.
  const enviandoRef = useRef(false);

  const enviando = estado.tipo === "enviando";
  const resumo = resumirFormulario(servicos, pagamentos);
  const opcoesServico = useMemo(
    () =>
      catalogo.map((servico) => ({
        value: servico.id,
        label: servico.nome,
        subLabel: `Catálogo: ${formatarCentavos(paraCentavos(servico.precoBase) ?? 0)}`,
      })),
    [catalogo],
  );

  const alterarServico = (chave: string, alteracao: Partial<LinhaServicoFormulario>) => {
    setErroValidacao(null);
    setServicos((atuais) => atuais.map((linha) => (linha.chave === chave ? { ...linha, ...alteracao } : linha)));
  };

  const selecionarServico = (linha: LinhaServicoFormulario, servicoId: string) => {
    if (servicoId === linha.servicoId) return;
    // Trocar o serviço carrega o preço do catálogo como valor inicial; o
    // operador pode alterá-lo depois. Limpar a seleção mantém o valor digitado.
    const catalogado = catalogo.find((servico) => servico.id === servicoId);
    alterarServico(linha.chave, {
      servicoId,
      ...(catalogado ? { valor: mascaraDoPrecoCatalogo(catalogado.precoBase) } : {}),
    });
  };

  const alterarPagamento = (chave: string, alteracao: Partial<LinhaPagamentoFormulario>) => {
    setErroValidacao(null);
    setPagamentos((atuais) => atuais.map((linha) => (linha.chave === chave ? { ...linha, ...alteracao } : linha)));
  };

  const completarComRestante = (linha: LinhaPagamentoFormulario) => {
    if (resumo.restanteCentavos <= 0) return;
    alterarPagamento(linha.chave, {
      valor: mascaraDeCentavos(centavosDaMascara(linha.valor) + resumo.restanteCentavos),
    });
  };

  const adicionarPagamento = () => {
    setErroValidacao(null);
    setPagamentos((atuais) => [
      ...atuais,
      novaLinhaPagamento(chaveLinha(), resumo.restanteCentavos > 0 ? mascaraDeCentavos(resumo.restanteCentavos) : ""),
    ]);
  };

  const registrar = async () => {
    if (enviandoRef.current) return;

    const erro = validarFormulario(servicos, pagamentos);
    if (erro) {
      setErroValidacao(erro);
      return;
    }

    enviandoRef.current = true;
    setErroValidacao(null);
    setEstado({ tipo: "enviando" });

    try {
      const resposta = await fetch("/api/atendimentos-rapidos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(montarPayloadAtendimento({ chaveIdempotencia, servicos, pagamentos, observacoes })),
      });
      const corpo = (await resposta.json().catch(() => null)) as
        | { message?: string; atendimento?: AtendimentoRegistrado }
        | null;

      if (!resposta.ok || !corpo?.atendimento) {
        // A chave é mantida: um novo envio do mesmo formulário não duplica o atendimento.
        setEstado({
          tipo: "erro",
          mensagem:
            resposta.status >= 500 || !corpo?.message
              ? "Não foi possível registrar o atendimento. Tente novamente; se persistir, acione o suporte."
              : corpo.message,
        });
        return;
      }

      setEstado({ tipo: "sucesso", atendimento: corpo.atendimento });
    } catch {
      setEstado({
        tipo: "erro",
        mensagem: "Falha de conexão. Verifique a rede e tente novamente: o reenvio não duplica o atendimento.",
      });
    } finally {
      enviandoRef.current = false;
    }
  };

  const novoAtendimento = () => {
    setServicos([novaLinhaServico(chaveLinha())]);
    setPagamentos([novaLinhaPagamento(chaveLinha())]);
    setObservacoes("");
    setErroValidacao(null);
    setChaveIdempotencia(novaChave());
    setEstado({ tipo: "editando" });
  };

  if (estado.tipo === "sucesso") {
    const { atendimento } = estado;
    return (
      <div className="mt-6 flex justify-center">
        <Card className="w-full max-w-lg p-8 text-center">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-emerald-700">Atendimento registrado</p>
          <h2 className="mt-2 text-2xl font-semibold text-[color:var(--text)]">{atendimento.codigo}</h2>
          <p className="mt-2 text-3xl font-bold text-[color:var(--accent-strong)]">
            {formatarCentavos(paraCentavos(atendimento.valorTotal) ?? 0)}
          </p>
          <ul className="mt-4 space-y-1 text-sm text-slate-600">
            {atendimento.pagamentos.map((pagamento) => (
              <li key={pagamento.id}>
                {pagamento.formaPagamento.nome}: {formatarCentavos(paraCentavos(pagamento.valor) ?? 0)}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button type="button" onClick={novoAtendimento}>
              Novo atendimento
            </Button>
            <Button href="/atendimentos-rapidos" variant="secondary">
              Ver histórico
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (catalogo.length === 0 || formasPagamento.length === 0) {
    return (
      <Card className="mt-6 p-6">
        <EmptyState
          title="Cadastro incompleto"
          description={
            catalogo.length === 0
              ? "Cadastre ao menos um serviço ativo em Serviços para registrar atendimentos rápidos."
              : "Cadastre ao menos uma forma de pagamento ativa em Financeiro para registrar atendimentos rápidos."
          }
        />
      </Card>
    );
  }

  return (
    <form
      className="mt-6 grid gap-6 xl:grid-cols-[1fr_420px]"
      onSubmit={(evento) => {
        evento.preventDefault();
        void registrar();
      }}
      aria-busy={enviando}
    >
      <fieldset disabled={enviando} className="min-w-0 space-y-6">
        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <SectionTitle className="text-xl">Serviços</SectionTitle>
            <Badge tone="accent">
              {servicos.length} {servicos.length === 1 ? "serviço" : "serviços"}
            </Badge>
          </div>

          <div className="space-y-4">
            {servicos.map((linha, indice) => (
              <div key={linha.chave} className="rounded-2xl border border-black/10 p-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_160px]">
                  <div className="min-w-0">
                    <Label htmlFor={`servico-${linha.chave}`}>Serviço {indice + 1}</Label>
                    <Combobox
                      id={`servico-${linha.chave}`}
                      options={opcoesServico}
                      value={linha.servicoId}
                      onChange={(servicoId) => selecionarServico(linha, servicoId)}
                      placeholder="Buscar serviço..."
                      emptyText="Nenhum serviço ativo encontrado"
                    />
                  </div>
                  <div>
                    <Label htmlFor={`valor-${linha.chave}`}>Valor</Label>
                    <Input
                      id={`valor-${linha.chave}`}
                      inputMode="numeric"
                      placeholder="R$ 0,00"
                      value={linha.valor}
                      onChange={(evento) => alterarServico(linha.chave, { valor: maskCurrency(evento.target.value) })}
                    />
                  </div>
                </div>
                <div className="mt-3 flex justify-end">
                  <Button
                    type="button"
                    variant="ghost"
                    className="px-3 py-2"
                    disabled={servicos.length === 1}
                    onClick={() => setServicos((atuais) => atuais.filter((item) => item.chave !== linha.chave))}
                  >
                    Remover
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            className="mt-4"
            onClick={() => setServicos((atuais) => [...atuais, novaLinhaServico(chaveLinha())])}
          >
            Adicionar serviço
          </Button>
        </Card>

        <Card className="p-6">
          <Label htmlFor="observacoes-atendimento">
            Observação <span className="font-normal text-slate-400">(opcional)</span>
          </Label>
          <textarea
            id="observacoes-atendimento"
            rows={2}
            maxLength={OBSERVACOES_TAMANHO_MAXIMO}
            value={observacoes}
            onChange={(evento) => setObservacoes(evento.target.value)}
            placeholder="Ex.: troca de cadarço no par azul"
            className="w-full rounded-2xl border border-black/10 bg-white px-4 py-3 text-sm text-[color:var(--text)] outline-none transition placeholder:text-slate-400 focus:border-[color:var(--accent)] focus:ring-2 focus:ring-[color:var(--accent-soft)]"
          />
        </Card>
      </fieldset>

      <Card className="h-fit p-6">
        <SectionTitle className="text-xl">Pagamento</SectionTitle>
        <p className="mt-1 text-sm text-slate-500">O atendimento só é registrado 100% pago. Divida entre formas se precisar.</p>

        <fieldset disabled={enviando} className="mt-4 space-y-3">
          {pagamentos.map((linha, indice) => (
            <div key={linha.chave} className="rounded-2xl border border-black/10 p-3">
              <div className="grid gap-2 sm:grid-cols-2">
                <div>
                  <Label htmlFor={`forma-${linha.chave}`}>Forma {indice + 1}</Label>
                  <select
                    id={`forma-${linha.chave}`}
                    value={linha.formaPagamentoId}
                    onChange={(evento) => alterarPagamento(linha.chave, { formaPagamentoId: evento.target.value })}
                    className={classeSelect}
                  >
                    <option value="">Selecione</option>
                    {formasPagamento.map((forma) => (
                      <option key={forma.id} value={forma.id}>
                        {forma.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label htmlFor={`valor-pagamento-${linha.chave}`}>Valor</Label>
                  <Input
                    id={`valor-pagamento-${linha.chave}`}
                    inputMode="numeric"
                    placeholder="R$ 0,00"
                    value={linha.valor}
                    onChange={(evento) => alterarPagamento(linha.chave, { valor: maskCurrency(evento.target.value) })}
                  />
                </div>
              </div>
              <div className="mt-2 flex flex-wrap justify-end gap-2">
                {resumo.restanteCentavos > 0 ? (
                  <Button type="button" variant="ghost" className="px-3 py-2" onClick={() => completarComRestante(linha)}>
                    Completar com o restante
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="ghost"
                  className="px-3 py-2"
                  disabled={pagamentos.length === 1}
                  onClick={() => setPagamentos((atuais) => atuais.filter((item) => item.chave !== linha.chave))}
                >
                  Remover
                </Button>
              </div>
            </div>
          ))}

          <Button type="button" variant="secondary" className="w-full" onClick={adicionarPagamento}>
            Adicionar forma de pagamento
          </Button>
        </fieldset>

        <dl className="mt-5 space-y-2 rounded-2xl bg-[color:var(--surface-muted)] px-4 py-3 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-600">Total do atendimento</dt>
            <dd className="text-lg font-bold text-[color:var(--accent-strong)]">{formatarCentavos(resumo.totalCentavos)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-slate-600">Pagamentos</dt>
            <dd className="font-semibold text-slate-800">{formatarCentavos(resumo.somaPagamentosCentavos)}</dd>
          </div>
          <div className="flex justify-between" aria-live="polite">
            <dt className="text-slate-600">{resumo.restanteCentavos < 0 ? "Excedente" : "Falta"}</dt>
            <dd className={`font-semibold ${resumo.restanteCentavos === 0 ? "text-emerald-700" : "text-rose-700"}`}>
              {formatarCentavos(Math.abs(resumo.restanteCentavos))}
            </dd>
          </div>
        </dl>

        {erroValidacao ? (
          <p role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {erroValidacao}
          </p>
        ) : null}

        {estado.tipo === "erro" ? (
          <div role="alert" className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <p className="font-semibold">Atendimento não registrado</p>
            <p className="mt-1">{estado.mensagem}</p>
          </div>
        ) : null}

        <Button type="submit" className="mt-4 w-full" isLoading={enviando}>
          {enviando ? "Registrando..." : "Registrar atendimento"}
        </Button>
      </Card>
    </form>
  );
}
