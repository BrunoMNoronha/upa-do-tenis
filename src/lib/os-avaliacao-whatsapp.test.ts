import { describe, expect, it } from "vitest";
import { mensagemAvaliacaoOS, whatsappLink } from "@/lib/formatters";
import { montarSugestaoAvaliacao } from "@/lib/os-avaliacao-whatsapp";

describe("mensagemAvaliacaoOS", () => {
  it("monta mensagem correta com nome do cliente, número da OS e link de avaliação", () => {
    const msg = mensagemAvaliacaoOS({
      nomeCliente: "Maria Silva",
      numeroOS: "OS-2026-001",
      linkAvaliacaoGoogle: "https://g.page/r/upa-do-tenis/review",
    });

    expect(msg).toContain("Olá, Maria Silva!");
    expect(msg).toContain("Sua Ordem de Serviço OS-2026-001 foi entregue.");
    expect(msg).toContain("https://g.page/r/upa-do-tenis/review");
    expect(msg).toContain("Muito obrigado pela confiança!");
  });

  it("utiliza saudação genérica se o nome do cliente for vazio", () => {
    const msg = mensagemAvaliacaoOS({
      nomeCliente: "   ",
      numeroOS: "OS-2026-002",
      linkAvaliacaoGoogle: "https://g.page/r/upa/review",
    });

    expect(msg).toMatch(/^Olá! Agradecemos por escolher/);
    expect(msg).toContain("OS-2026-002");
  });

  it("retorna string vazia se o link de avaliação não estiver informado ou for vazio", () => {
    expect(
      mensagemAvaliacaoOS({
        nomeCliente: "Carlos",
        numeroOS: "OS-2026-003",
        linkAvaliacaoGoogle: null,
      }),
    ).toBe("");

    expect(
      mensagemAvaliacaoOS({
        nomeCliente: "Carlos",
        numeroOS: "OS-2026-003",
        linkAvaliacaoGoogle: "   ",
      }),
    ).toBe("");
  });

  it("não contém dados financeiros, saldo, formas de pagamento ou valores", () => {
    const msg = mensagemAvaliacaoOS({
      nomeCliente: "João Souza",
      numeroOS: "OS-2026-004",
      linkAvaliacaoGoogle: "https://g.page/r/upa/review",
    });

    expect(msg).not.toMatch(/R\$/);
    expect(msg).not.toMatch(/saldo/i);
    expect(msg).not.toMatch(/pagamento/i);
    expect(msg).not.toMatch(/caixa/i);
    expect(msg).not.toMatch(/total/i);
  });
});

describe("montarSugestaoAvaliacao", () => {
  const dadosCompletos = {
    numeroOS: "OS-2026-005",
    nomeCliente: "Ana Santos",
    telefone: "(11) 98765-4321",
    linkAvaliacaoGoogle: "https://g.page/r/upa/review",
  };

  it("gera url wa.me válida com código 55 e mensagem codificada", () => {
    const sugestao = montarSugestaoAvaliacao(dadosCompletos);

    expect(sugestao.temTelefoneValido).toBe(true);
    expect(sugestao.temLinkConfigurado).toBe(true);
    expect(sugestao.telefoneFormatado).toBe("(11) 98765-4321");
    expect(sugestao.urlWhatsApp).toMatch(
      /^https:\/\/wa\.me\/5511987654321\?text=/,
    );
    expect(sugestao.urlWhatsApp).toContain(
      encodeURIComponent("OS-2026-005"),
    );
    expect(sugestao.urlWhatsApp).toContain(
      encodeURIComponent("https://g.page/r/upa/review"),
    );
  });

  it("trata telefone com máscara e acentos corretamente no encoding", () => {
    const sugestao = montarSugestaoAvaliacao({
      ...dadosCompletos,
      nomeCliente: "José Éder",
      telefone: "1199998888", // 10 dígitos (fixo/celular sem 9)
    });

    expect(sugestao.urlWhatsApp).toMatch(/^https:\/\/wa\.me\/551199998888\?text=/);
    expect(sugestao.urlWhatsApp).toContain(encodeURIComponent("José Éder"));
  });

  it("não gera urlWhatsApp se o telefone for inválido", () => {
    const telefonesInvalidos = ["123", "99999", "abc", null, undefined, ""];

    for (const tel of telefonesInvalidos) {
      const sugestao = montarSugestaoAvaliacao({
        ...dadosCompletos,
        telefone: tel,
      });

      expect(sugestao.urlWhatsApp).toBe("");
      expect(sugestao.temTelefoneValido).toBe(false);
    }
  });

  it("não gera urlWhatsApp se o link de avaliação estiver ausente", () => {
    const linksAusentes = [null, undefined, "", "   "];

    for (const link of linksAusentes) {
      const sugestao = montarSugestaoAvaliacao({
        ...dadosCompletos,
        linkAvaliacaoGoogle: link,
      });

      expect(sugestao.urlWhatsApp).toBe("");
      expect(sugestao.temLinkConfigurado).toBe(false);
      expect(sugestao.mensagem).toBe("");
    }
  });
});
