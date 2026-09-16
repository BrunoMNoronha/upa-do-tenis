import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock } = vi.hoisted(() => ({
  prismaMock: { ordemServico: { findUnique: vi.fn() } },
}));

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));

import { AcompanhamentoView } from "@/app/acompanhar/[token]/acompanhamento-view";
import { montarAcompanhamentoPublico, obterAcompanhamentoPublico } from "@/lib/os-acompanhamento";
import { gerarTokenAcompanhamento } from "@/lib/os-acompanhamento-token";

const ordemBase = {
  numero: "OS-05092026-0001",
  status: "EM_ANDAMENTO",
  dataEntrada: new Date("2026-09-05T15:00:00Z"),
  historicosStatus: [
    { statusAnterior: "EM_ANDAMENTO", statusNovo: "CONCLUIDA", criadoEm: new Date("2026-09-08T13:00:00Z") },
    { statusAnterior: "ABERTA", statusNovo: "EM_ANDAMENTO", criadoEm: new Date("2026-09-06T12:00:00Z") },
  ],
};

// Campos que nunca podem sair na superfície pública.
const CAMPOS_PROIBIDOS = [
  "cliente",
  "clienteId",
  "valorTotal",
  "valorDesconto",
  "valorSinal",
  "valorPago",
  "saldo",
  "pagamentos",
  "observacoes",
  "observacao",
  "justificativaInicioSemAprovacao",
  "itens",
  "movimentacoesEstoque",
  "movimentacoesCaixa",
  "favorita",
];

describe("montarAcompanhamentoPublico", () => {
  it("expõe somente número, status, entrada, mensagem e etapas", () => {
    const dto = montarAcompanhamentoPublico(ordemBase);

    expect(Object.keys(dto).sort()).toEqual(
      ["dataEntrada", "etapas", "mensagem", "numero", "status", "statusLabel"].sort(),
    );
    for (const etapa of dto.etapas) {
      expect(Object.keys(etapa).sort()).toEqual(["data", "status", "statusLabel"]);
    }
  });

  it("ordena a linha do tempo cronologicamente, começando pela entrada", () => {
    const dto = montarAcompanhamentoPublico(ordemBase);

    expect(dto.etapas.map((etapa) => etapa.status)).toEqual(["ABERTA", "EM_ANDAMENTO", "CONCLUIDA"]);
    expect(dto.etapas[0].data).toBe("2026-09-05T15:00:00.000Z");
    expect(dto.etapas[2].data).toBe("2026-09-08T13:00:00.000Z");
  });

  it("OS recém-aberta sem histórico mostra apenas a abertura", () => {
    const dto = montarAcompanhamentoPublico({ ...ordemBase, status: "ABERTA", historicosStatus: [] });

    expect(dto.statusLabel).toBe("Recebida");
    expect(dto.etapas).toHaveLength(1);
  });

  it("ignora o registro inicial retroativo (sem status anterior) para não duplicar a abertura", () => {
    const dto = montarAcompanhamentoPublico({
      ...ordemBase,
      status: "ABERTA",
      historicosStatus: [
        { statusAnterior: null, statusNovo: "ABERTA", criadoEm: new Date("2026-09-10T12:00:00Z") },
      ],
    });

    expect(dto.etapas).toEqual([
      { status: "ABERTA", statusLabel: "Recebida", data: "2026-09-05T15:00:00.000Z" },
    ]);
  });

  it.each([
    ["CONCLUIDA", "Pronta para retirada"],
    ["ENTREGUE", "Entregue"],
    ["CANCELADA", "Cancelada"],
  ])("status %s tem rótulo público %s e mensagem sem conteúdo financeiro", (status, label) => {
    const dto = montarAcompanhamentoPublico({ ...ordemBase, status });

    expect(dto.statusLabel).toBe(label);
    expect(dto.mensagem).not.toMatch(/R\$|saldo|pagamento|valor|cobran/i);
  });
});

describe("obterAcompanhamentoPublico", () => {
  beforeEach(() => {
    prismaMock.ordemServico.findUnique.mockReset();
  });

  it("token válido consulta a OS com select restrito aos campos públicos", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValue(ordemBase);

    const dto = await obterAcompanhamentoPublico(gerarTokenAcompanhamento("os-1"));

    expect(dto?.numero).toBe("OS-05092026-0001");
    const args = prismaMock.ordemServico.findUnique.mock.calls[0][0];
    expect(args.where).toEqual({ id: "os-1" });
    expect(args.include).toBeUndefined();
    expect(Object.keys(args.select).sort()).toEqual(["dataEntrada", "historicosStatus", "numero", "status"]);
    expect(Object.keys(args.select.historicosStatus.select).sort()).toEqual([
      "criadoEm",
      "statusAnterior",
      "statusNovo",
    ]);
  });

  it("token inválido não consulta o banco", async () => {
    for (const token of ["os-1", "OS-05092026-0001", "abc.def", `${gerarTokenAcompanhamento("os-1")}x`]) {
      expect(await obterAcompanhamentoPublico(token)).toBeNull();
    }

    expect(prismaMock.ordemServico.findUnique).not.toHaveBeenCalled();
  });

  it("token válido de OS inexistente tem a mesma resposta que token inválido", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValue(null);

    expect(await obterAcompanhamentoPublico(gerarTokenAcompanhamento("os-removida"))).toBeNull();
  });

  it("não vaza campos proibidos mesmo que o banco devolva a OS completa", async () => {
    prismaMock.ordemServico.findUnique.mockResolvedValue({
      ...ordemBase,
      cliente: { nome: "Maria", telefone: "61987654321", email: "maria@x.com" },
      valorTotal: 150,
      saldo: 50,
      observacoes: "cliente difícil",
      pagamentos: [{ valor: 100 }],
    });

    const dto = await obterAcompanhamentoPublico(gerarTokenAcompanhamento("os-1"));
    const serializado = JSON.stringify(dto);

    for (const campo of CAMPOS_PROIBIDOS) {
      expect(serializado, campo).not.toContain(`"${campo}"`);
    }
    expect(serializado).not.toMatch(/Maria|61987654321|maria@x\.com|difícil/);
  });
});

describe("AcompanhamentoView", () => {
  it("renderiza número, status e linha do tempo sem dados financeiros ou pessoais", () => {
    const html = renderToStaticMarkup(
      createElement(AcompanhamentoView, { acompanhamento: montarAcompanhamentoPublico(ordemBase) }),
    );

    expect(html).toContain("OS-05092026-0001");
    expect(html).toContain("Em andamento");
    expect(html).toContain("Linha do tempo");
    expect(html).toContain("Pronta para retirada");
    expect(html).toContain("05/09/2026");
    expect(html).toContain("UPA do Tênis");
    expect(html).not.toMatch(/R\$|saldo|pagamento/i);
    expect(html).not.toMatch(/href="\/(api|ordens-servico|dashboard|caixa)/);
  });
});
