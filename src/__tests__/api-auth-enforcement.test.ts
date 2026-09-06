import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

// Nenhuma rota privada pode tocar o banco sem sessão: o proxy abaixo faz
// qualquer acesso ao prisma falhar o teste com erro explícito.
vi.mock("@/lib/prisma", () => ({
  prisma: new Proxy(
    {},
    {
      get(_alvo, propriedade) {
        throw new Error(`Acesso indevido ao prisma sem sessão: ${String(propriedade)}`);
      },
    }
  ),
}));

import { GET as dashboardGet } from "@/app/api/dashboard/route";
import { GET as caixaGet, POST as caixaPost } from "@/app/api/caixa/route";
import { GET as caixaAtualGet } from "@/app/api/caixa/atual/route";
import { GET as caixaIdGet } from "@/app/api/caixa/[id]/route";
import { POST as caixaFecharPost } from "@/app/api/caixa/[id]/fechar/route";
import { POST as caixaMovPost } from "@/app/api/caixa/[id]/movimentacoes/route";
import { GET as clientesGet, POST as clientesPost } from "@/app/api/clientes/route";
import { DELETE as clientesDelete } from "@/app/api/clientes/[id]/route";
import { GET as servicosGet, POST as servicosPost } from "@/app/api/servicos/route";
import { DELETE as servicosDelete } from "@/app/api/servicos/[id]/route";
import { GET as osGet, POST as osPost } from "@/app/api/ordens-servico/route";
import { GET as osIdGet, DELETE as osIdDelete } from "@/app/api/ordens-servico/[id]/route";
import { PATCH as osStatusPatch } from "@/app/api/ordens-servico/[id]/status/route";
import {
  GET as osPagamentosGet,
  POST as osPagamentosPost,
} from "@/app/api/ordens-servico/[id]/pagamentos/route";
import {
  GET as osInsumosGet,
  POST as osInsumosPost,
} from "@/app/api/ordens-servico/[id]/insumos/route";
import { GET as insumosGet, POST as insumosPost } from "@/app/api/insumos/route";
import { DELETE as insumosDelete } from "@/app/api/insumos/[id]/route";
import {
  GET as insumosMovGet,
  POST as insumosMovPost,
} from "@/app/api/insumos/[id]/movimentacoes/route";
import { GET as relatorioEstoqueGet } from "@/app/api/relatorios/estoque/route";
import { GET as relatorioAlertasGet } from "@/app/api/relatorios/estoque/alertas/route";
import { GET as relatorioFinanceiroGet } from "@/app/api/relatorios/financeiro-os/route";
import { POST as formasPagamentoPost } from "@/app/api/formas-pagamento/route";
import { GET as produtosGet, POST as produtosPost } from "@/app/api/produtos/route";
import {
  PATCH as produtosPatch,
  DELETE as produtosDelete,
} from "@/app/api/produtos/[id]/route";
import { GET as vendasGet, POST as vendasPost } from "@/app/api/vendas/route";
import { GET as vendasIdGet } from "@/app/api/vendas/[id]/route";

function criarRequest(path: string, method = "GET") {
  return new NextRequest(`http://localhost${path}`, {
    method,
    headers: { "Content-Type": "application/json" },
    ...(method === "GET" ? {} : { body: JSON.stringify({}) }),
  });
}

const params = { params: { id: "abc" } };

const casos: Array<[string, () => Promise<Response>]> = [
  ["GET /api/dashboard", () => dashboardGet(criarRequest("/api/dashboard"))],
  ["GET /api/caixa", () => caixaGet(criarRequest("/api/caixa"))],
  ["POST /api/caixa", () => caixaPost(criarRequest("/api/caixa", "POST"))],
  ["GET /api/caixa/atual", () => caixaAtualGet(criarRequest("/api/caixa/atual"))],
  ["GET /api/caixa/[id]", () => caixaIdGet(criarRequest("/api/caixa/abc"), params)],
  [
    "POST /api/caixa/[id]/fechar",
    () => caixaFecharPost(criarRequest("/api/caixa/abc/fechar", "POST"), params),
  ],
  [
    "POST /api/caixa/[id]/movimentacoes",
    () => caixaMovPost(criarRequest("/api/caixa/abc/movimentacoes", "POST"), params),
  ],
  ["GET /api/clientes", () => clientesGet(criarRequest("/api/clientes"))],
  ["POST /api/clientes", () => clientesPost(criarRequest("/api/clientes", "POST"))],
  [
    "DELETE /api/clientes/[id]",
    () => clientesDelete(criarRequest("/api/clientes/abc", "DELETE"), params),
  ],
  ["GET /api/servicos", () => servicosGet(criarRequest("/api/servicos"))],
  ["POST /api/servicos", () => servicosPost(criarRequest("/api/servicos", "POST"))],
  [
    "DELETE /api/servicos/[id]",
    () => servicosDelete(criarRequest("/api/servicos/abc", "DELETE"), params),
  ],
  ["GET /api/ordens-servico", () => osGet(criarRequest("/api/ordens-servico"))],
  ["POST /api/ordens-servico", () => osPost(criarRequest("/api/ordens-servico", "POST"))],
  ["GET /api/ordens-servico/[id]", () => osIdGet(criarRequest("/api/ordens-servico/abc"), params)],
  [
    "DELETE /api/ordens-servico/[id]",
    () => osIdDelete(criarRequest("/api/ordens-servico/abc", "DELETE"), params),
  ],
  [
    "PATCH /api/ordens-servico/[id]/status",
    () => osStatusPatch(criarRequest("/api/ordens-servico/abc/status", "PATCH"), params),
  ],
  [
    "GET /api/ordens-servico/[id]/pagamentos",
    () => osPagamentosGet(criarRequest("/api/ordens-servico/abc/pagamentos"), params),
  ],
  [
    "POST /api/ordens-servico/[id]/pagamentos",
    () => osPagamentosPost(criarRequest("/api/ordens-servico/abc/pagamentos", "POST"), params),
  ],
  [
    "GET /api/ordens-servico/[id]/insumos",
    () => osInsumosGet(criarRequest("/api/ordens-servico/abc/insumos"), params),
  ],
  [
    "POST /api/ordens-servico/[id]/insumos",
    () => osInsumosPost(criarRequest("/api/ordens-servico/abc/insumos", "POST"), params),
  ],
  ["GET /api/insumos", () => insumosGet(criarRequest("/api/insumos"))],
  ["POST /api/insumos", () => insumosPost(criarRequest("/api/insumos", "POST"))],
  [
    "DELETE /api/insumos/[id]",
    () => insumosDelete(criarRequest("/api/insumos/abc", "DELETE"), params),
  ],
  [
    "GET /api/insumos/[id]/movimentacoes",
    () => insumosMovGet(criarRequest("/api/insumos/abc/movimentacoes"), params),
  ],
  [
    "POST /api/insumos/[id]/movimentacoes",
    () => insumosMovPost(criarRequest("/api/insumos/abc/movimentacoes", "POST"), params),
  ],
  ["GET /api/relatorios/estoque", () => relatorioEstoqueGet(criarRequest("/api/relatorios/estoque"))],
  [
    "GET /api/relatorios/estoque/alertas",
    () => relatorioAlertasGet(criarRequest("/api/relatorios/estoque/alertas")),
  ],
  [
    "GET /api/relatorios/financeiro-os",
    () => relatorioFinanceiroGet(criarRequest("/api/relatorios/financeiro-os")),
  ],
  [
    "POST /api/formas-pagamento",
    () => formasPagamentoPost(criarRequest("/api/formas-pagamento", "POST")),
  ],
  ["GET /api/produtos", () => produtosGet(criarRequest("/api/produtos"))],
  ["POST /api/produtos", () => produtosPost(criarRequest("/api/produtos", "POST"))],
  [
    "PATCH /api/produtos/[id]",
    () => produtosPatch(criarRequest("/api/produtos/abc", "PATCH"), params),
  ],
  [
    "DELETE /api/produtos/[id]",
    () => produtosDelete(criarRequest("/api/produtos/abc", "DELETE"), params),
  ],
  ["GET /api/vendas", () => vendasGet(criarRequest("/api/vendas"))],
  ["POST /api/vendas", () => vendasPost(criarRequest("/api/vendas", "POST"))],
  ["GET /api/vendas/[id]", () => vendasIdGet(criarRequest("/api/vendas/abc"), params)],
];

describe("enforcement de sessão nas APIs privadas (sem cookie)", () => {
  it.each(casos)("%s responde 401 sem tocar o banco", async (_nome, executar) => {
    const response = await executar();

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ message: "Não autenticado." });
  });
});
