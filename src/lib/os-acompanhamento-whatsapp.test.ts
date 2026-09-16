import { describe, expect, it } from "vitest";

import { mensagemAberturaOS } from "@/lib/formatters";
import { montarSugestaoAcompanhamento } from "@/lib/os-acompanhamento-whatsapp";

const base = {
  origem: "https://upa.example.com/",
  caminhoAcompanhamento: "/acompanhar/b3MtMQ.assinatura",
  nomeCliente: "Maria José",
  numeroOS: "OS-05092026-0001",
};

describe("mensagemAberturaOS", () => {
  it("segue o texto padrão com nome, número da OS e link", () => {
    expect(
      mensagemAberturaOS({
        nomeCliente: "Maria",
        numeroOS: "OS-05092026-0001",
        linkAcompanhamento: "https://upa.example.com/acompanhar/t",
      }),
    ).toBe(
      "Olá, Maria! Sua Ordem de Serviço OS-05092026-0001 foi aberta na UPA do Tênis - Sapataria Alves.\n\n" +
        "Você pode acompanhar o andamento pelo link:\nhttps://upa.example.com/acompanhar/t",
    );
  });

  it("sem nome do cliente usa saudação neutra", () => {
    expect(mensagemAberturaOS({ nomeCliente: "  ", numeroOS: "OS-1", linkAcompanhamento: "L" })).toMatch(/^Olá! /);
  });
});

describe("montarSugestaoAcompanhamento", () => {
  it("telefone com máscara gera wa.me sanitizado com a mensagem codificada", () => {
    const sugestao = montarSugestaoAcompanhamento({ ...base, telefone: "(61) 98765-4321" });

    expect(sugestao.linkAcompanhamento).toBe("https://upa.example.com/acompanhar/b3MtMQ.assinatura");
    const url = new URL(sugestao.urlWhatsApp);
    expect(`${url.origin}${url.pathname}`).toBe("https://wa.me/5561987654321");
    const texto = url.searchParams.get("text");
    expect(texto).toBe(sugestao.mensagem);
    expect(texto).toContain("Maria José");
    expect(texto).toContain("OS-05092026-0001");
    expect(texto).toContain(sugestao.linkAcompanhamento);
  });

  it.each([[""], [null], [undefined], ["123"], ["abc"]])(
    "telefone inválido (%s) mantém o link e não gera wa.me",
    (telefone) => {
      const sugestao = montarSugestaoAcompanhamento({ ...base, telefone });

      expect(sugestao.urlWhatsApp).toBe("");
      expect(sugestao.linkAcompanhamento).toContain("/acompanhar/");
      expect(sugestao.mensagem).toContain(sugestao.linkAcompanhamento);
    },
  );

  it("mensagem não contém valores, saldo ou cobrança", () => {
    const { mensagem } = montarSugestaoAcompanhamento({ ...base, telefone: "61987654321" });

    expect(mensagem).not.toMatch(/R\$|saldo|pagamento|valor|cobran|total/i);
  });
});
