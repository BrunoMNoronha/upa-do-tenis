import { describe, expect, it } from "vitest";

import {
  centavosDaMascara,
  mascaraDeCentavos,
  mascaraDoPrecoCatalogo,
  montarPayloadAtendimento,
  resumirFormulario,
  validarFormulario,
  type LinhaPagamentoFormulario,
  type LinhaServicoFormulario,
} from "./atendimento-rapido-formulario";
import { registrarAtendimentoRapidoSchema } from "./atendimento-rapido-schema";

const normalizar = (texto: string) => texto.replace(/\s/g, " ");

const servico = (dados: Partial<LinhaServicoFormulario> = {}): LinhaServicoFormulario => ({
  chave: "s1",
  servicoId: "srv-1",
  valor: "R$ 100,00",
  ...dados,
});

const pagamento = (dados: Partial<LinhaPagamentoFormulario> = {}): LinhaPagamentoFormulario => ({
  chave: "p1",
  formaPagamentoId: "pix",
  valor: "R$ 100,00",
  ...dados,
});

describe("máscara monetária do formulário", () => {
  it("lê e escreve centavos sem ponto flutuante", () => {
    expect(centavosDaMascara("R$ 150,50")).toBe(15050);
    expect(centavosDaMascara("")).toBe(0);
    expect(normalizar(mascaraDeCentavos(15050))).toBe("R$ 150,50");
    expect(mascaraDeCentavos(0)).toBe("");
    expect(normalizar(mascaraDoPrecoCatalogo("15.9"))).toBe("R$ 15,90");
    expect(mascaraDoPrecoCatalogo("inválido")).toBe("");
  });
});

describe("resumirFormulario", () => {
  it("calcula total e restante do pagamento dividido", () => {
    const resumo = resumirFormulario(
      [servico(), servico({ chave: "s2", servicoId: "srv-2", valor: "R$ 15,90" })],
      [pagamento({ valor: "R$ 60,00" }), pagamento({ chave: "p2", formaPagamentoId: "dinheiro", valor: "R$ 40,00" })],
    );
    expect(resumo).toEqual({
      totalCentavos: 11590,
      somaPagamentosCentavos: 10000,
      restanteCentavos: 1590,
    });
  });
});

describe("validarFormulario", () => {
  it("aceita formulário completo e com soma exata", () => {
    expect(validarFormulario([servico()], [pagamento()])).toBeNull();
  });

  it.each([
    ["sem serviços", [], [pagamento()], /ao menos um serviço/],
    ["serviço não selecionado", [servico({ servicoId: "" })], [pagamento()], /selecione o serviço/],
    ["valor zerado", [servico({ valor: "" })], [pagamento()], /valor maior que zero/],
    ["sem pagamento", [servico()], [], /forma de pagamento/],
    ["forma não selecionada", [servico()], [pagamento({ formaPagamentoId: "" })], /selecione a forma/],
    ["pagamento zerado", [servico()], [pagamento({ valor: "" })], /valor maior que zero/],
    ["soma menor", [servico()], [pagamento({ valor: "R$ 99,99" })], /não cobrem/],
    ["soma maior", [servico()], [pagamento({ valor: "R$ 100,01" })], /passam do total/],
    [
      "forma repetida",
      [servico()],
      [pagamento({ valor: "R$ 50,00" }), pagamento({ chave: "p2", valor: "R$ 50,00" })],
      /repetida/,
    ],
  ])("bloqueia %s", (_caso, servicos, pagamentos, mensagem) => {
    expect(validarFormulario(servicos, pagamentos)).toMatch(mensagem);
  });
});

describe("montarPayloadAtendimento", () => {
  it("gera payload aceito pelo schema do servidor", () => {
    const corpo = montarPayloadAtendimento({
      chaveIdempotencia: "7d0e1a0c-5a47-4a5c-9c1e-6f7d3c1b2a90",
      servicos: [servico({ valor: "R$ 35,50" })],
      pagamentos: [pagamento({ valor: "R$ 20,00" }), pagamento({ chave: "p2", formaPagamentoId: "dinheiro", valor: "R$ 15,50" })],
      observacoes: "  ",
    });

    expect(corpo).toEqual({
      chaveIdempotencia: "7d0e1a0c-5a47-4a5c-9c1e-6f7d3c1b2a90",
      observacoes: undefined,
      itens: [{ servicoId: "srv-1", valor: "35.50" }],
      pagamentos: [
        { formaPagamentoId: "pix", valor: "20.00" },
        { formaPagamentoId: "dinheiro", valor: "15.50" },
      ],
    });
    expect(registrarAtendimentoRapidoSchema.safeParse(corpo).success).toBe(true);
  });
});
