import { describe, expect, it } from "vitest";

import {
  montarEtapasProgresso,
  montarLinhaDoTempo,
  rotuloTipoItem,
  rotuloTipoPagamento,
  somarCustoInsumos,
} from "./ordens-servico-progresso";

const historicos = [
  { id: "h1", statusAnterior: null, statusNovo: "ABERTA", observacao: "Foto de recebimento anexada", criadoEm: "2026-09-05T12:40:00.000Z" },
  { id: "h2", statusAnterior: "ABERTA", statusNovo: "EM_ANDAMENTO", observacao: "Serviço iniciado", criadoEm: "2026-09-06T11:15:00.000Z" },
];

describe("montarEtapasProgresso", () => {
  it("marca etapas percorridas, a atual e as pendentes", () => {
    const etapas = montarEtapasProgresso({ status: "EM_ANDAMENTO", dataEntrada: "2026-09-05T12:40:00.000Z", historicosStatus: historicos });
    expect(etapas.map((etapa) => [etapa.rotulo, etapa.estado, etapa.data])).toEqual([
      ["Aberta", "concluida", "2026-09-05T12:40:00.000Z"],
      ["Em andamento", "atual", "2026-09-06T11:15:00.000Z"],
      ["Concluída", "pendente", null],
      ["Entregue", "pendente", null],
    ]);
  });

  it("OS entregue fica com todas as etapas concluídas", () => {
    const etapas = montarEtapasProgresso({
      status: "ENTREGUE",
      dataEntrada: "2026-09-05T12:40:00.000Z",
      historicosStatus: [
        ...historicos,
        { id: "h3", statusAnterior: "EM_ANDAMENTO", statusNovo: "CONCLUIDA", criadoEm: "2026-09-07T12:00:00.000Z" },
        { id: "h4", statusAnterior: "CONCLUIDA", statusNovo: "ENTREGUE", criadoEm: "2026-09-08T12:00:00.000Z" },
      ],
    });
    expect(etapas.every((etapa) => etapa.estado === "concluida")).toBe(true);
  });

  it("OS cancelada não tem etapa atual", () => {
    const etapas = montarEtapasProgresso({
      status: "CANCELADA",
      dataEntrada: "2026-09-05T12:40:00.000Z",
      historicosStatus: [historicos[0], { id: "h9", statusAnterior: "ABERTA", statusNovo: "CANCELADA", criadoEm: "2026-09-06T12:00:00.000Z" }],
    });
    expect(etapas.map((etapa) => etapa.estado)).toEqual(["concluida", "pendente", "pendente", "pendente"]);
  });
});

describe("montarLinhaDoTempo", () => {
  it("mescla criação, transições, pagamentos e estornos, do mais recente ao mais antigo", () => {
    const eventos = montarLinhaDoTempo({
      dataEntrada: "2026-09-05T12:40:00.000Z",
      historicosStatus: historicos,
      pagamentos: [
        {
          id: "p1",
          tipo: "SINAL",
          valor: 45,
          dataPagamento: "2026-09-06T11:20:00.000Z",
          formaPagamento: { nome: "Pix" },
          estorno: { id: "e1", motivo: "Duplicado", dataEstorno: "2026-09-07T10:00:00.000Z", usuario: { nome: "Maria" } },
        },
      ],
    });
    expect(eventos.map((evento) => evento.tipo)).toEqual(["estorno", "pagamento", "status", "criacao"]);
    expect(eventos[0]).toMatchObject({ titulo: "Pagamento estornado · R$ 45,00", detalhe: "Duplicado · por Maria" });
    expect(eventos[1].titulo).toBe("Sinal recebido · R$ 45,00 (Pix)");
    expect(eventos[2].titulo).toBe("Aberta → Em andamento");
    expect(eventos[3]).toMatchObject({ titulo: "OS criada · Aberta", detalhe: "Foto de recebimento anexada" });
  });

  it("usa a data de entrada quando o histórico não registra a abertura", () => {
    const eventos = montarLinhaDoTempo({ dataEntrada: "2026-09-05T12:40:00.000Z", historicosStatus: [], pagamentos: [] });
    expect(eventos).toEqual([{ id: "criacao", tipo: "criacao", titulo: "OS criada · Aberta", detalhe: null, data: "2026-09-05T12:40:00.000Z" }]);
  });
});

describe("rótulos e totais", () => {
  it("traduz tipos de item e de pagamento", () => {
    expect(rotuloTipoItem("CALCADO")).toBe("Calçado");
    expect(rotuloTipoItem("tenis")).toBe("Tênis");
    expect(rotuloTipoItem("BOLSA_COURO")).toBe("Bolsa couro");
    expect(rotuloTipoItem(null)).toBe("Item");
    expect(rotuloTipoPagamento("PAGAMENTO")).toBe("Pagamento");
    expect(rotuloTipoPagamento("SINAL")).toBe("Sinal");
  });

  it("soma o custo dos insumos em centavos", () => {
    expect(somarCustoInsumos([{ custoTotalAplicado: 7.2 }, { custoTotalAplicado: "2.2" }])).toBe(9.4);
    expect(somarCustoInsumos([])).toBe(0);
  });
});
