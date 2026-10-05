/**
 * Evidência HTTP do Data Cache no build de produção.
 * Uso, após pnpm run build: pnpm exec node scripts/verificar-cache-dados.mjs
 * Execute sem a suíte em paralelo. Apenas .env.test em PostgreSQL local e banco
 * cujo nome contenha "test" é aceito. Não migra, limpa ou recria o banco.
 * As fixtures têm identificação única e são removidas no finally. Os dois
 * registros institucionais são restaurados com valor e atualizadoEm originais.
 * O preload temporário conta operações reais do Prisma sem SQL, argumentos,
 * resultados, cookies, credenciais ou dados de clientes.
 */
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import { once } from "node:events";
import { mkdtemp, readFile, realpath, rm, writeFile } from "node:fs/promises";
import { createServer } from "node:net";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseEnv } from "node:util";
import { PrismaClient } from "@prisma/client";

const projeto = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const resultados = [];
let cenarioAtual = "preparo";
const cancelamento = new AbortController();
process.once("SIGINT", () => cancelamento.abort());
process.once("SIGTERM", () => cancelamento.abort());

function validarBancoLocal(valor) {
  let url;
  try { url = new URL(valor); } catch { throw new Error("DATABASE_URL de .env.test inválida."); }
  const banco = decodeURIComponent(url.pathname.slice(1));
  if (!["postgresql:", "postgres:"].includes(url.protocol) ||
      !["localhost", "127.0.0.1", "[::1]"].includes(url.hostname) ||
      !/(?:^|[_-])test(?:$|[_-])/i.test(banco)) {
    throw new Error("Permitido apenas PostgreSQL local com nome de banco contendo o segmento test.");
  }
  return url;
}

async function portaLivre() {
  const servidor = createServer();
  servidor.listen(0, "127.0.0.1");
  await once(servidor, "listening");
  const porta = servidor.address().port;
  await new Promise((resolve, reject) => servidor.close((erro) => erro ? reject(erro) : resolve()));
  return porta;
}

async function validarDiretorioTemporario(diretorio) {
  if (!path.isAbsolute(diretorio)) throw new Error("Diretório temporário deve ter caminho absoluto.");
  const raiz = await realpath(tmpdir());
  const destino = await realpath(diretorio);
  const relativo = path.relative(raiz, destino);
  if (!relativo || path.isAbsolute(relativo) || relativo.startsWith("..") ||
      path.dirname(destino) !== raiz || !path.basename(destino).startsWith("upa-cache-dados-")) {
    throw new Error("Limpeza limitada ao diretório temporário criado por este harness.");
  }
  return destino;
}

// Prisma 5 permite middleware. O proxy só observa clientes no processo Next;
// as consultas administrativas de preparo/limpeza não entram nas medições.
const preload = String.raw`
const Module = require("node:module");
const { appendFileSync } = require("node:fs");
const destino = new URL(process.env.DATABASE_URL || "");
if (!["postgres:", "postgresql:"].includes(destino.protocol) ||
    !["localhost", "127.0.0.1", "[::1]"].includes(destino.hostname) ||
    !/(?:^|[_-])test(?:$|[_-])/i.test(decodeURIComponent(destino.pathname.slice(1)))) {
  throw new Error("Instrumentação permitida apenas no banco local de testes.");
}
const carregar = Module._load;
const clientes = new WeakMap();
Module._load = function (nome, parent, isMain) {
  const exports = carregar.apply(this, arguments);
  if (nome !== "@prisma/client" || !exports.PrismaClient) return exports;
  const original = exports.PrismaClient;
  let instrumentado = clientes.get(original);
  if (!instrumentado) {
    instrumentado = class extends original {
      constructor(...args) {
        super(...args);
        this.$use(async (params, next) => {
          const resultado = await next(params);
          appendFileSync(process.env.CACHE_PROBE_CONTADORES, JSON.stringify({
            model: params.model || "raw", action: params.action
          }) + "\n");
          return resultado;
        });
      }
    };
    clientes.set(original, instrumentado);
  }
  return { ...exports, PrismaClient: instrumentado };
};
`;

async function encerrarServidor(servidor) {
  if (!servidor?.pid || servidor.exitCode !== null) return;
  // Encerrar somente a árvore criada por este script (pnpm -> next start).
  if (process.platform === "win32") {
    const encerramento = spawn("taskkill", ["/PID", String(servidor.pid), "/T", "/F"], {
      windowsHide: true, stdio: "ignore",
    });
    await once(encerramento, "close");
  } else {
    try { process.kill(-servidor.pid, "SIGTERM"); } catch { servidor.kill("SIGTERM"); }
  }
}

async function main() {
  const ambiente = parseEnv(await readFile(path.join(projeto, ".env.test"), "utf8"));
  const destinoBanco = validarBancoLocal(ambiente.DATABASE_URL);
  await readFile(path.join(projeto, ".next", "BUILD_ID"), "utf8");
  // Um lock exclusivo entre execuções deste harness; nenhum arquivo do repo.
  // URL equivalente (credenciais, protocolo, loopback ou pool diferentes) deve
  // compartilhar a trava: configurações pertencem ao mesmo banco/schema.
  const identificacaoBanco = createHash("sha256").update(JSON.stringify([
    "loopback", destinoBanco.port || "5432", decodeURIComponent(destinoBanco.pathname.slice(1)),
    destinoBanco.searchParams.get("schema") || "public",
  ])).digest("hex");
  const trava = path.join(tmpdir(), `upa-cache-dados-${identificacaoBanco}.lock`);
  await writeFile(trava, "verificacao-cache-dados", { flag: "wx" });
  let temporario;
  let servidor;
  let prisma;
  let usuarioId;
  let request;
  const nomesServicos = new Set();
  const nomesFormas = new Set();
  const idsServicos = new Set();
  const idsFormas = new Set();
  const configuracoesOriginais = new Map();
  const configuracoesAlteradas = new Set();
  const falhasLimpeza = [];
  const marca = `CACHE-PROBE-${randomUUID()}`;
  const empresaFixture = {
    versao: 1, nomeFantasia: marca, nomeComplementar: null, razaoSocial: null,
    cnpj: null, telefone: null, whatsapp: null, email: null, site: null,
    endereco: { logradouro: null, numero: null, complemento: null, bairro: null,
      cidade: null, uf: null, cep: null },
    horarioAtendimento: null, instagramUrl: null, facebookUrl: null,
  };
  try {
    temporario = await mkdtemp(path.join(tmpdir(), "upa-cache-dados-"));
    const caminhoPreload = path.join(temporario, "instrumentar-prisma.cjs");
    const caminhoContadores = path.join(temporario, "contadores.jsonl");
    await writeFile(caminhoPreload, preload);
    await writeFile(caminhoContadores, "");
    prisma = new PrismaClient({ datasources: { db: { url: ambiente.DATABASE_URL } } });
    for (const chave of ["dadosEmpresa", "linkAvaliacaoGoogle"]) {
      configuracoesOriginais.set(chave, await prisma.configuracaoSistema.findUnique({ where: { chave } }));
    }
    const usuario = await prisma.usuario.create({ data: {
      nome: marca, email: `${marca.toLowerCase()}@example.test`,
      senhaHash: "fixture-sem-login-por-senha", ativo: true,
    } });
    usuarioId = usuario.id;
    const segredo = randomBytes(32).toString("hex");
    const payload = Buffer.from(JSON.stringify({ sub: usuario.id,
      exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
    const token = `${payload}.${createHmac("sha256", segredo).update(payload).digest("base64url")}`;
    const porta = await portaLivre();
    const origem = `http://127.0.0.1:${porta}`;
    servidor = spawn(process.platform === "win32" ? "pnpm.exe" : "pnpm",
      ["run", "start", "--port", String(porta), "--hostname", "127.0.0.1"], {
        cwd: projeto, windowsHide: true, detached: process.platform !== "win32", stdio: "ignore",
        env: { ...process.env, ...ambiente, DATABASE_URL: ambiente.DATABASE_URL,
          NODE_ENV: "production", AUTH_SESSION_SECRET: segredo, CACHE_DADOS_ENABLED: "true",
          NODE_OPTIONS: `--require="${caminhoPreload}"`, CACHE_PROBE_CONTADORES: caminhoContadores },
      });
    let erroServidor = false;
    servidor.on("error", () => { erroServidor = true; });
    async function lerContadores() {
      const contadores = {};
      for (const linha of (await readFile(caminhoContadores, "utf8")).trim().split("\n")) {
        if (!linha) continue;
        const evento = JSON.parse(linha);
        const chave = `${evento.model}.${evento.action}`;
        contadores[chave] = (contadores[chave] ?? 0) + 1;
      }
      return contadores;
    }
    request = async (cenario, rota, { metodo = "GET", body, sessao = true,
      status = 200, json = true, medir = true } = {}) => {
      cenarioAtual = cenario;
      const antes = await lerContadores();
      const resposta = await fetch(`${origem}${rota}`, {
        method: metodo, redirect: "manual", cache: "no-store",
        signal: AbortSignal.any([cancelamento.signal, AbortSignal.timeout(15000)]),
        headers: { ...(sessao ? { Cookie: `upa_sessao=${token}` } : {}),
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}) },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
      });
      const texto = await resposta.text();
      assert.equal(resposta.status, status, `${cenario}: status HTTP`);
      const depois = await lerContadores();
      const consultas = {};
      for (const chave of Object.keys(depois)) {
        const delta = depois[chave] - (antes[chave] ?? 0);
        if (delta) consultas[chave] = delta;
      }
      if (medir) resultados.push({ cenario, status: resposta.status, consultas });
      const dados = json && texto ? JSON.parse(texto) : texto;
      return { dados, consultas, headers: resposta.headers };
    };
    const limite = Date.now() + 60000;
    while (true) {
      if (erroServidor || servidor.exitCode !== null || cancelamento.signal.aborted) {
        throw new Error("Falha ao iniciar next start local.");
      }
      try {
        await request("prontidao", "/api/servicos", { sessao: false, status: 401, medir: false });
        break;
      } catch {
        if (Date.now() > limite) throw new Error("Timeout ao iniciar next start local.");
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    const consulta = (medicao, chave, valor) => assert.equal(medicao.consultas[chave] ?? 0, valor, `${chave}: consultas esperadas`);
    const privado = (medicao) => assert.equal(medicao.headers.get("cache-control"), "private, no-store");
    const nomeServico = `${marca}-Servico`;
    nomesServicos.add(nomeServico);
    const criado = await request("servico_post", "/api/servicos", { metodo: "POST",
      status: 201, body: { nome: nomeServico, descricao: "Fixture local cache", precoBase: 17.45 } });
    idsServicos.add(criado.dados.id);
    const servicoId = criado.dados.id;
    let frio = await request("servicos_frio", "/api/servicos");
    let quente = await request("servicos_quente", "/api/servicos");
    privado(frio); privado(quente);
    consulta(frio, "Servico.findMany", 1); consulta(quente, "Servico.findMany", 0);
    consulta(frio, "Usuario.findUnique", 1); consulta(quente, "Usuario.findUnique", 1);
    assert.deepEqual(quente.dados, frio.dados, "JSON idêntico no cache frio e quente");
    let servico = quente.dados.find((item) => item.id === servicoId);
    assert.equal(servico.precoBase, "17.45");
    assert.equal(typeof servico.criadoEm, "string");
    assert.equal(new Date(servico.criadoEm).toISOString(), servico.criadoEm);
    assert.equal(new Date(servico.atualizadoEm).toISOString(), servico.atualizadoEm);
    await request("servico_patch_invalido", `/api/servicos/${servicoId}`, {
      metodo: "PATCH", body: { nome: "x" }, status: 400 });
    quente = await request("servicos_apos_erro", "/api/servicos");
    consulta(quente, "Servico.findMany", 0);
    for (const [cenario, body, presente] of [
      ["edicao", { precoBase: 22.35 }, true], ["inativacao", { ativo: false }, false],
      ["reativacao", { ativo: true }, true],
    ]) {
      await request(`servico_${cenario}`, `/api/servicos/${servicoId}`, { metodo: "PATCH", body });
      frio = await request(`servicos_apos_${cenario}`, "/api/servicos");
      consulta(frio, "Servico.findMany", 1);
      servico = frio.dados.find((item) => item.id === servicoId);
      assert.equal(Boolean(servico), presente);
      if (presente) assert.equal(servico.precoBase, "22.35");
    }
    frio = await request("opcoes_os_primeira", "/api/ordens-servico/opcoes-cadastro");
    quente = await request("opcoes_os_segunda", "/api/ordens-servico/opcoes-cadastro");
    for (const medicao of [frio, quente]) {
      privado(medicao); consulta(medicao, "Cliente.findMany", 1);
      consulta(medicao, "Servico.findMany", 0); consulta(medicao, "Usuario.findUnique", 1);
    }
    // Simula escrita externa ao catálogo: o cache segue quente, mas a validação
    // de negócio deve ler o registro atual e rejeitar o serviço agora inativo.
    await prisma.servico.update({ where: { id: servicoId }, data: { ativo: false } });
    quente = await request("servicos_catalogo_temporal", "/api/servicos");
    consulta(quente, "Servico.findMany", 0);
    assert.equal(quente.dados.some((item) => item.id === servicoId && item.ativo), true);
    const rejeitada = await request("os_validador_banco_atual", "/api/ordens-servico", {
      metodo: "POST", status: 400, body: {
        clienteId: `${marca}-cliente-inexistente`, numeroOS: Date.now().toString(),
        prazoPrevisto: new Date().toISOString().slice(0, 10),
        itens: [{ descricao: "Fixture validador cache", servicos: [{ servicoId, valor: 22.35 }] }],
      },
    });
    consulta(rejeitada, "Servico.findMany", 1); consulta(rejeitada, "OrdemServico.create", 0);
    assert.equal(rejeitada.dados.message, "Serviços inativos não podem ser adicionados a uma nova OS.");
    await request("servico_delete", `/api/servicos/${servicoId}`, { metodo: "DELETE", status: 204 });
    idsServicos.delete(servicoId);
    frio = await request("servicos_apos_delete", "/api/servicos");
    consulta(frio, "Servico.findMany", 1);
    assert.equal(frio.dados.some((item) => item.id === servicoId), false);

    const nomeForma = `${marca}-Forma`;
    nomesFormas.add(nomeForma);
    const forma = await request("forma_post", "/api/formas-pagamento", { metodo: "POST",
      status: 201, body: { nome: nomeForma, tipo: "PIX" } });
    const formaId = forma.dados.id;
    idsFormas.add(formaId);
    frio = await request("formas_frio", "/caixa", { json: false });
    quente = await request("formas_quente", "/caixa", { json: false });
    consulta(frio, "FormaPagamento.findMany", 1); consulta(quente, "FormaPagamento.findMany", 0);
    assert.equal(quente.dados.includes(nomeForma), true, "Forma serializada no HTML da página de caixa");
    await request("forma_patch_invalido", `/api/formas-pagamento/${formaId}`, {
      metodo: "PATCH", body: { tipo: "INVALIDO" }, status: 400 });
    quente = await request("formas_apos_erro", "/caixa", { json: false });
    consulta(quente, "FormaPagamento.findMany", 0);
    for (const [cenario, body, nomeEsperado, presente] of [
      ["edicao", { nome: `${nomeForma}-Editada` }, `${nomeForma}-Editada`, true],
      ["inativacao", { ativo: false }, `${nomeForma}-Editada`, false],
      ["reativacao", { ativo: true }, `${nomeForma}-Editada`, true],
    ]) {
      if (body.nome) nomesFormas.add(body.nome);
      await request(`forma_${cenario}`, `/api/formas-pagamento/${formaId}`, { metodo: "PATCH", body });
      frio = await request(`formas_apos_${cenario}`, "/caixa", { json: false });
      consulta(frio, "FormaPagamento.findMany", 1);
      assert.equal(frio.dados.includes(nomeEsperado), presente);
    }
    await request("forma_delete", `/api/formas-pagamento/${formaId}`, { metodo: "DELETE", status: 204 });
    idsFormas.delete(formaId);
    frio = await request("formas_apos_delete", "/caixa", { json: false });
    consulta(frio, "FormaPagamento.findMany", 1);
    assert.equal(frio.dados.includes(`${nomeForma}-Editada`), false);

    configuracoesAlteradas.add("dadosEmpresa");
    await request("empresa_put", "/api/configuracoes/dados-empresa", { metodo: "PUT", body: empresaFixture });
    frio = await request("empresa_frio", "/api/configuracoes/dados-empresa");
    quente = await request("empresa_quente", "/api/configuracoes/dados-empresa");
    privado(frio); privado(quente);
    consulta(frio, "ConfiguracaoSistema.findUnique", 1); consulta(quente, "ConfiguracaoSistema.findUnique", 0);
    assert.deepEqual(frio.dados, empresaFixture); assert.deepEqual(quente.dados, empresaFixture);
    await request("empresa_edicao", "/api/configuracoes/dados-empresa", {
      metodo: "PUT", body: { ...empresaFixture, nomeFantasia: `${marca}-Atualizada` } });
    frio = await request("empresa_apos_edicao", "/api/configuracoes/dados-empresa");
    consulta(frio, "ConfiguracaoSistema.findUnique", 1);
    assert.equal(frio.dados.nomeFantasia, `${marca}-Atualizada`);
    const login = await request("branding_metadados", "/login", { sessao: false, json: false });
    assert.equal(login.dados.includes(`${marca}-Atualizada`), true);

    configuracoesAlteradas.add("linkAvaliacaoGoogle");
    const link = "https://example.test/cache-probe";
    await request("google_put", "/api/configuracoes", { metodo: "PUT", body: { linkAvaliacaoGoogle: link } });
    frio = await request("google_frio", "/api/configuracoes");
    quente = await request("google_quente", "/api/configuracoes");
    privado(frio); privado(quente);
    consulta(frio, "ConfiguracaoSistema.findUnique", 1); consulta(quente, "ConfiguracaoSistema.findUnique", 0);
    assert.equal(quente.dados.linkAvaliacaoGoogle, link);
    await request("google_limpeza", "/api/configuracoes", { metodo: "PUT", body: { linkAvaliacaoGoogle: null } });
    frio = await request("google_apos_limpeza", "/api/configuracoes");
    consulta(frio, "ConfiguracaoSistema.findUnique", 1);
    assert.equal(frio.dados.linkAvaliacaoGoogle, null);
    quente = await request("google_null_quente", "/api/configuracoes");
    consulta(quente, "ConfiguracaoSistema.findUnique", 0);
    assert.equal(quente.dados.linkAvaliacaoGoogle, null);

    for (const rota of ["/api/servicos", "/api/ordens-servico/opcoes-cadastro",
      "/api/configuracoes", "/api/configuracoes/dados-empresa"]) {
      const negada = await request("sem_sessao_cache_aquecido", rota, { sessao: false, status: 401 });
      privado(negada);
      assert.deepEqual(negada.consultas, {}, "Negação no middleware não consulta catálogo");
    }
    await prisma.usuario.update({ where: { id: usuarioId }, data: { ativo: false } });
    for (const rota of ["/api/servicos", "/api/ordens-servico/opcoes-cadastro",
      "/api/configuracoes", "/api/configuracoes/dados-empresa"]) {
      const negada = await request("usuario_desativado_cache_aquecido", rota, { status: 401 });
      consulta(negada, "Usuario.findUnique", 1);
      consulta(negada, "Servico.findMany", 0); consulta(negada, "ConfiguracaoSistema.findUnique", 0);
    }
  } finally {
    const cenarioAntesLimpeza = cenarioAtual;
    // Reativa só a fixture para invalidar antes de restaurar os valores originais.
    if (prisma && usuarioId) {
      try {
        await prisma.usuario.update({ where: { id: usuarioId }, data: { ativo: true } });
        if (request && servidor?.exitCode === null) {
          for (const id of idsServicos) await request("limpeza_servico", `/api/servicos/${id}`, { metodo: "DELETE", status: 204, medir: false });
          for (const id of idsFormas) await request("limpeza_forma", `/api/formas-pagamento/${id}`, { metodo: "DELETE", status: 204, medir: false });
          // Não lê depois: invalida e restaura via Prisma, deixando o cache vazio.
          if (configuracoesAlteradas.has("dadosEmpresa")) {
            await request("limpeza_empresa", "/api/configuracoes/dados-empresa", { metodo: "PUT", body: empresaFixture, medir: false });
          }
          if (configuracoesAlteradas.has("linkAvaliacaoGoogle")) {
            await request("limpeza_google", "/api/configuracoes", { metodo: "PUT", body: { linkAvaliacaoGoogle: null }, medir: false });
          }
        }
      } catch { falhasLimpeza.push("invalidacao_de_cache_local"); }
    }
    await encerrarServidor(servidor);
    if (prisma) {
      // Nomes exatos com UUID recuperam IDs mesmo se a resposta do POST falhar.
      try {
        const servicos = await prisma.servico.findMany({ where: { nome: { in: [...nomesServicos] } }, select: { id: true } });
        await prisma.servico.deleteMany({ where: { id: { in: [...idsServicos, ...servicos.map((item) => item.id)] } } });
        assert.equal(await prisma.servico.count({ where: { nome: { in: [...nomesServicos] } } }), 0);
      } catch { falhasLimpeza.push("remocao_servicos_fixture"); }
      try {
        const formas = await prisma.formaPagamento.findMany({ where: { nome: { in: [...nomesFormas] } }, select: { id: true } });
        await prisma.formaPagamento.deleteMany({ where: { id: { in: [...idsFormas, ...formas.map((item) => item.id)] } } });
        assert.equal(await prisma.formaPagamento.count({ where: { nome: { in: [...nomesFormas] } } }), 0);
      } catch { falhasLimpeza.push("remocao_formas_fixture"); }
      for (const chave of configuracoesAlteradas) {
        try {
          const original = configuracoesOriginais.get(chave);
          if (original) {
            await prisma.configuracaoSistema.upsert({ where: { chave }, create: original,
              update: { valor: original.valor, atualizadoEm: original.atualizadoEm } });
          } else {
            await prisma.configuracaoSistema.deleteMany({ where: { chave } });
          }
          assert.deepEqual(await prisma.configuracaoSistema.findUnique({ where: { chave } }), original);
        } catch { falhasLimpeza.push(`restauracao_${chave}`); }
      }
      if (usuarioId) {
        try {
          await prisma.usuario.delete({ where: { id: usuarioId } });
          assert.equal(await prisma.usuario.findUnique({ where: { id: usuarioId } }), null);
        } catch { falhasLimpeza.push("remocao_usuario_fixture"); }
      }
      await prisma.$disconnect();
    }
    if (temporario) {
      const destinoRemocao = await validarDiretorioTemporario(temporario);
      await rm(destinoRemocao, { recursive: true, force: true });
    }
    await rm(trava, { force: true });
    cenarioAtual = falhasLimpeza.length ? "limpeza" : cenarioAntesLimpeza;
    if (falhasLimpeza.length) throw new Error(`Falha na limpeza local: ${falhasLimpeza.join(", ")}.`);
  }
}

main().then(() => {
  console.log(JSON.stringify({ ok: true, runtime: "next start", cache: true,
    banco: "local-test", fixturesRestauradas: true, resultados }, null, 2));
}).catch((erro) => {
  // Nunca imprime mensagens de conectividade/Prisma que possam conter credenciais.
  console.error(JSON.stringify({ ok: false, tipoErro: erro.name, codigo: erro.code ?? null,
    cenario: cenarioAtual,
    verificacao: erro instanceof assert.AssertionError ? "Asserção não atendida." : "Verificação ou limpeza local não concluída.",
    resultados }, null, 2));
  process.exitCode = 1;
});
