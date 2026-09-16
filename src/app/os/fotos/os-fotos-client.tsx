"use client";

import { useEffect, useRef, useState } from "react";

import { Badge, Button, Card, EmptyState, ErrorState, Input, Label, LoadingState } from "@/components/ui";
import { validarFotoOriginal } from "@/lib/imagem-otimizacao";
import {
  buscarOrdensParaFoto,
  carregarOrdemParaFoto,
  criarEnviadorFotoOS,
  FluxoFotoError,
  ordemAceitaFoto,
  type OrdemParaFoto,
} from "@/lib/os-fotos-fluxo";

type EstadoBusca = "ocioso" | "buscando" | "vazio" | "erro" | "resultados";
type EstadoEnvio = "ocioso" | "processando" | "enviando" | "sucesso" | "erro";

const ROTULO_STATUS: Record<string, string> = {
  ABERTA: "Aberta",
  EM_ANDAMENTO: "Em andamento",
  CONCLUIDA: "Concluída",
  ENTREGUE: "Entregue",
  CANCELADA: "Cancelada",
};

function mensagemErro(error: unknown, padrao: string) {
  return error instanceof FluxoFotoError || error instanceof Error ? error.message : padrao;
}

function ResumoOrdem({ ordem, itemDescricao }: { ordem: OrdemParaFoto; itemDescricao?: string }) {
  return (
    <dl className="grid gap-1 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <dt className="sr-only">Número</dt>
        <dd className="text-lg font-semibold text-[color:var(--text)]">{ordem.numero}</dd>
        <dt className="sr-only">Status</dt>
        <dd><Badge tone={ordemAceitaFoto(ordem.status) ? "success" : "warning"}>{ROTULO_STATUS[ordem.status] ?? ordem.status}</Badge></dd>
      </div>
      <div><dt className="inline text-slate-500">Cliente: </dt><dd className="inline font-medium text-slate-800">{ordem.cliente.nome}</dd></div>
      {itemDescricao ? (
        <div><dt className="inline text-slate-500">Item: </dt><dd className="inline font-medium text-slate-800">{itemDescricao}</dd></div>
      ) : null}
    </dl>
  );
}

export function OsFotosClient() {
  const [enviador] = useState(() => criarEnviadorFotoOS());

  const [termo, setTermo] = useState("");
  const [estadoBusca, setEstadoBusca] = useState<EstadoBusca>("ocioso");
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  const [resultados, setResultados] = useState<OrdemParaFoto[]>([]);
  const buscaAtual = useRef(0);

  const [ordem, setOrdem] = useState<OrdemParaFoto | null>(null);
  const [carregandoOrdem, setCarregandoOrdem] = useState(false);
  const [erroOrdem, setErroOrdem] = useState<string | null>(null);
  const [itemId, setItemId] = useState<string | null>(null);

  const [foto, setFoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [erroFoto, setErroFoto] = useState<string | null>(null);
  const [estadoEnvio, setEstadoEnvio] = useState<EstadoEnvio>("ocioso");
  const [erroEnvio, setErroEnvio] = useState<{ mensagem: string; podeTentarNovamente: boolean } | null>(null);

  const cameraRef = useRef<HTMLInputElement>(null);
  const galeriaRef = useRef<HTMLInputElement>(null);

  // A Object URL da foto original é revogada ao trocar ou descartar a foto.
  useEffect(() => {
    if (!foto) {
      setPreview(null);
      return;
    }
    const url = URL.createObjectURL(foto);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [foto]);

  const item = ordem?.itens.find((atual) => atual.id === itemId) ?? null;
  const ocupado = estadoEnvio === "processando" || estadoEnvio === "enviando";

  const buscar = async (event?: React.FormEvent) => {
    event?.preventDefault();
    const busca = termo.trim();
    if (!busca) return;
    const requisicao = ++buscaAtual.current;
    setEstadoBusca("buscando");
    setErroBusca(null);
    try {
      const encontradas = await buscarOrdensParaFoto(busca);
      if (requisicao !== buscaAtual.current) return;
      setResultados(encontradas);
      setEstadoBusca(encontradas.length > 0 ? "resultados" : "vazio");
    } catch (error) {
      if (requisicao !== buscaAtual.current) return;
      setErroBusca(mensagemErro(error, "Não foi possível buscar as ordens de serviço."));
      setEstadoBusca("erro");
    }
  };

  const limparFoto = () => {
    enviador.descartar();
    setFoto(null);
    setErroFoto(null);
    setErroEnvio(null);
    setEstadoEnvio("ocioso");
    if (cameraRef.current) cameraRef.current.value = "";
    if (galeriaRef.current) galeriaRef.current.value = "";
  };

  const abrirOrdem = async (id: string, manterItem?: string | null) => {
    setCarregandoOrdem(true);
    setErroOrdem(null);
    try {
      const carregada = await carregarOrdemParaFoto(id);
      setOrdem(carregada);
      const itemMantido = carregada.itens.find((atual) => atual.id === manterItem);
      setItemId(itemMantido?.id ?? (carregada.itens.length === 1 ? carregada.itens[0].id : null));
    } catch (error) {
      setOrdem(null);
      setErroOrdem(mensagemErro(error, "Não foi possível carregar a ordem de serviço."));
    } finally {
      setCarregandoOrdem(false);
    }
  };

  const selecionarOrdem = (id: string) => {
    limparFoto();
    setItemId(null);
    void abrirOrdem(id);
  };

  const buscarOutraOrdem = () => {
    limparFoto();
    setOrdem(null);
    setItemId(null);
    setErroOrdem(null);
  };

  const adicionarOutraFoto = () => {
    limparFoto();
    // Recarrega a OS para refletir a foto recém-vinculada nos itens.
    if (ordem) void abrirOrdem(ordem.id, ordem.itens.length === 1 ? itemId : null);
  };

  const selecionarArquivo = (file: File | null) => {
    setErroEnvio(null);
    setEstadoEnvio("ocioso");
    enviador.descartar();
    if (!file) return;
    const erro = validarFotoOriginal(file);
    if (erro) {
      setFoto(null);
      setErroFoto(erro);
      if (cameraRef.current) cameraRef.current.value = "";
      if (galeriaRef.current) galeriaRef.current.value = "";
      return;
    }
    setErroFoto(null);
    setFoto(file);
  };

  const tirarNovamente = () => {
    limparFoto();
    cameraRef.current?.click();
  };

  const confirmarEnvio = async () => {
    if (!ordem || !item || !foto || ocupado || enviador.estaEnviando()) return;
    setErroEnvio(null);
    const resultado = await enviador.enviar({
      ordemId: ordem.id,
      itemId: item.id,
      original: foto,
      onFase: setEstadoEnvio,
    });
    if (resultado.ok) {
      setFoto(null);
      setEstadoEnvio("sucesso");
      return;
    }
    if (resultado.motivo === "em-andamento") return;
    setErroEnvio({ mensagem: resultado.mensagem, podeTentarNovamente: resultado.motivo === "envio" && resultado.status !== 409 });
    setEstadoEnvio("erro");
  };

  const inputs = (
    <>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(event) => selecionarArquivo(event.target.files?.[0] ?? null)}
      />
      <input
        ref={galeriaRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => selecionarArquivo(event.target.files?.[0] ?? null)}
      />
    </>
  );

  // ── Sucesso ────────────────────────────────────────────────────────────────
  if (ordem && estadoEnvio === "sucesso") {
    return (
      <Card className="mx-auto max-w-lg p-5">
        <p role="status" className="text-lg font-semibold text-emerald-700">Foto adicionada com sucesso</p>
        <div className="mt-3"><ResumoOrdem ordem={ordem} itemDescricao={item?.descricao} /></div>
        <div className="mt-5 grid gap-2">
          <Button type="button" className="w-full py-3" onClick={adicionarOutraFoto}>Adicionar outra foto</Button>
          <Button type="button" variant="secondary" className="w-full py-3" onClick={buscarOutraOrdem}>Buscar outra OS</Button>
          <Button href={`/ordens-servico/${ordem.id}`} variant="ghost" className="w-full py-3">Abrir OS</Button>
        </div>
      </Card>
    );
  }

  // ── OS selecionada ─────────────────────────────────────────────────────────
  if (ordem || carregandoOrdem || erroOrdem) {
    if (carregandoOrdem) return <LoadingState text="Carregando ordem de serviço..." />;
    if (erroOrdem || !ordem) {
      return (
        <ErrorState
          title="Não foi possível abrir a OS"
          description={erroOrdem ?? "Ordem de serviço não encontrada."}
          action={<Button type="button" variant="secondary" onClick={buscarOutraOrdem}>Buscar outra OS</Button>}
        />
      );
    }

    const aceitaFoto = ordemAceitaFoto(ordem.status);

    return (
      <div className="mx-auto grid max-w-lg gap-4">
        {inputs}
        <Card className="p-4">
          <ResumoOrdem ordem={ordem} itemDescricao={item?.descricao} />
          {!ocupado ? (
            <button type="button" className="mt-3 text-sm font-medium text-[color:var(--accent-strong)] underline" onClick={buscarOutraOrdem}>
              Trocar OS
            </button>
          ) : null}
        </Card>

        {!aceitaFoto ? (
          <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            Fotos só podem ser adicionadas enquanto a OS estiver aberta.
          </p>
        ) : null}

        {aceitaFoto && ordem.itens.length === 0 ? (
          <EmptyState title="OS sem itens" description="Esta OS não possui itens para vincular a foto." />
        ) : null}

        {aceitaFoto && ordem.itens.length > 1 && !foto ? (
          <Card className="p-4">
            <p className="text-sm font-semibold text-slate-700">Qual item será fotografado?</p>
            <div className="mt-2 grid gap-2">
              {ordem.itens.map((atual) => (
                <button
                  key={atual.id}
                  type="button"
                  onClick={() => setItemId(atual.id)}
                  aria-pressed={atual.id === itemId}
                  className={`flex items-center justify-between rounded-xl border px-3 py-3 text-left text-sm ${atual.id === itemId ? "border-[color:var(--accent)] bg-[color:var(--accent-tint)]" : "border-black/10 bg-white"}`}
                >
                  <span className="font-medium text-slate-800">{atual.descricao || atual.tipoItem}</span>
                  {atual.possuiFotoRecebimento ? <Badge tone="neutral">Já tem foto</Badge> : null}
                </button>
              ))}
            </div>
          </Card>
        ) : null}

        {aceitaFoto && item && !foto ? (
          <Card className="grid gap-2 p-4">
            {item.possuiFotoRecebimento ? (
              <p className="text-sm text-amber-800">Este item já possui foto. Uma nova foto substituirá a atual.</p>
            ) : null}
            <Button type="button" className="w-full py-4 text-base" onClick={() => cameraRef.current?.click()}>Tirar foto</Button>
            <Button type="button" variant="secondary" className="w-full py-3" onClick={() => galeriaRef.current?.click()}>
              Escolher da galeria
            </Button>
            {erroFoto ? <p role="alert" className="text-sm font-medium text-rose-700">{erroFoto}</p> : null}
          </Card>
        ) : null}

        {aceitaFoto && item && foto && preview ? (
          <Card className="grid gap-3 p-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- Object URL local, fora do otimizador do Next */}
            <img src={preview} alt={`Prévia da foto de ${item.descricao}`} className="max-h-[60vh] w-full rounded-xl border border-black/10 bg-slate-50 object-contain" />
            <ResumoOrdem ordem={ordem} itemDescricao={item.descricao} />
            {item.possuiFotoRecebimento ? (
              <p className="text-sm text-amber-800">Confirmar substituirá a foto atual deste item.</p>
            ) : null}
            {estadoEnvio === "processando" ? <p role="status" className="text-sm text-slate-600">Processando imagem…</p> : null}
            {estadoEnvio === "enviando" ? <p role="status" className="text-sm text-slate-600">Enviando foto…</p> : null}
            {erroEnvio ? <p role="alert" className="text-sm font-medium text-rose-700">{erroEnvio.mensagem}</p> : null}
            <div className="grid gap-2">
              {erroEnvio?.podeTentarNovamente ? (
                <Button type="button" className="w-full py-4 text-base" disabled={ocupado} onClick={() => void confirmarEnvio()}>
                  Tentar novamente
                </Button>
              ) : !erroEnvio ? (
                <Button type="button" className="w-full py-4 text-base" isLoading={ocupado} disabled={ocupado} onClick={() => void confirmarEnvio()}>
                  Confirmar envio
                </Button>
              ) : null}
              <Button type="button" variant="secondary" className="w-full py-3" disabled={ocupado} onClick={tirarNovamente}>
                Tirar novamente
              </Button>
            </div>
          </Card>
        ) : null}
      </div>
    );
  }

  // ── Busca ──────────────────────────────────────────────────────────────────
  return (
    <div className="mx-auto grid max-w-lg gap-4">
      <Card className="p-4">
        <form className="grid gap-2" onSubmit={(event) => void buscar(event)}>
          <Label htmlFor="busca-os-foto">Buscar OS</Label>
          <Input
            id="busca-os-foto"
            type="search"
            inputMode="search"
            autoComplete="off"
            placeholder="Número da OS, cliente ou telefone"
            value={termo}
            onChange={(event) => setTermo(event.target.value)}
          />
          <Button type="submit" className="w-full py-3" isLoading={estadoBusca === "buscando"} disabled={!termo.trim() || estadoBusca === "buscando"}>
            Buscar
          </Button>
        </form>
      </Card>

      {estadoBusca === "buscando" ? <LoadingState text="Buscando OS..." /> : null}
      {estadoBusca === "vazio" ? (
        <EmptyState title="Nenhuma OS encontrada" description="Confira o número da OS ou busque pelo nome ou telefone do cliente." />
      ) : null}
      {estadoBusca === "erro" ? (
        <ErrorState
          title="Erro na busca"
          description={erroBusca ?? "Não foi possível buscar as ordens de serviço."}
          action={<Button type="button" variant="secondary" onClick={() => void buscar()}>Tentar novamente</Button>}
        />
      ) : null}
      {estadoBusca === "resultados" ? (
        <ul className="grid gap-2">
          {resultados.map((resultado) => (
            <li key={resultado.id}>
              <button
                type="button"
                onClick={() => selecionarOrdem(resultado.id)}
                className="w-full rounded-2xl border border-black/10 bg-white p-4 text-left shadow-sm active:bg-[color:var(--accent-tint)]"
              >
                <ResumoOrdem
                  ordem={resultado}
                  itemDescricao={resultado.itens.map((atual) => atual.descricao || atual.tipoItem).join(", ") || undefined}
                />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
