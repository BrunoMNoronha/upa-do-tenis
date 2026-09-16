import { describe, expect, it, vi } from "vitest";

import { mensagemConclusaoOS } from "@/lib/formatters";
import type { OsStatus } from "@/lib/ordens-servico-status";
import { alterarStatusOS, montarSugestaoConclusao, type OrdemParaMudancaStatus } from "@/lib/os-conclusao-whatsapp";

const MENSAGEM_PADRAO =
  "Olá, Maria José! Sua Ordem de Serviço OS-16092026-0001 foi concluída. Quando puder, entre em contato " +
  "ou venha até a UPA do Tênis - Sapataria Alves para seguirmos com o atendimento.";

const ordemEmAndamento: OrdemParaMudancaStatus = {
  id: "os-1",
  numero: "OS-16092026-0001",
  status: "EM_ANDAMENTO",
  cliente: { nome: "Maria José", telefone: "(61) 98530-7168" },
};

const respostaJson = (status: number, corpo: unknown) =>
  new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });

describe("mensagemConclusaoOS", () => {
  it("segue o texto padrão com nome e número da OS", () => {
    expect(mensagemConclusaoOS({ nomeCliente: " Maria José ", numeroOS: "OS-16092026-0001" })).toBe(MENSAGEM_PADRAO);
  });

  it("não menciona valores, saldo ou cobrança", () => {
    const mensagem = mensagemConclusaoOS({ nomeCliente: "Maria", numeroOS: "OS-1" });
    expect(mensagem).not.toMatch(/R\$|saldo|pagamento|valor|cobran/i);
  });

  it("sem nome do cliente usa saudação neutra", () => {
    expect(mensagemConclusaoOS({ nomeCliente: "  ", numeroOS: "OS-1" })).toMatch(/^Olá! Sua Ordem de Serviço OS-1/);
  });
});

describe("montarSugestaoConclusao", () => {
  it("telefone celular com máscara → wa.me/55 com mensagem codificada", () => {
    const sugestao = montarSugestaoConclusao({
      numeroOS: "OS-16092026-0001",
      nomeCliente: "Maria José",
      telefone: "(61) 98530-7168",
    });

    expect(sugestao.mensagem).toBe(MENSAGEM_PADRAO);
    expect(sugestao.telefoneFormatado).toBe("(61) 98530-7168");
    expect(sugestao.urlWhatsApp).toBe(`https://wa.me/5561985307168?text=${encodeURIComponent(MENSAGEM_PADRAO)}`);
    expect(sugestao.urlWhatsApp).toContain("Ol%C3%A1%2C%20Maria%20Jos%C3%A9!");
    expect(sugestao.urlWhatsApp).not.toMatch(/\s/);
    expect(new URL(sugestao.urlWhatsApp).searchParams.get("text")).toBe(MENSAGEM_PADRAO);
  });

  it("telefone fixo de 10 dígitos → wa.me/55", () => {
    const { urlWhatsApp } = montarSugestaoConclusao({ numeroOS: "OS-1", nomeCliente: "A", telefone: "6133334444" });
    expect(urlWhatsApp.startsWith("https://wa.me/556133334444?text=")).toBe(true);
  });

  it.each([null, undefined, "", "123"])("telefone ausente/inválido (%s) → sem URL", (telefone) => {
    const sugestao = montarSugestaoConclusao({ numeroOS: "OS-1", nomeCliente: "A", telefone });
    expect(sugestao.urlWhatsApp).toBe("");
    expect(sugestao.mensagem).toContain("OS-1");
  });
});

describe("alterarStatusOS", () => {
  it("EM_ANDAMENTO → CONCLUIDA com sucesso devolve sugestão com dados do cliente", async () => {
    const fetcher = vi.fn(async () => respostaJson(200, { id: "os-1", status: "CONCLUIDA" }));

    const resultado = await alterarStatusOS(ordemEmAndamento, "CONCLUIDA", fetcher as unknown as typeof fetch);

    expect(fetcher).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledWith("/api/ordens-servico/os-1/status", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ statusNovo: "CONCLUIDA" }),
    });
    expect(resultado).toEqual({
      ok: true,
      sugestaoConclusao: { numeroOS: "OS-16092026-0001", nomeCliente: "Maria José", telefone: "(61) 98530-7168" },
    });
  });

  it("conclusão com cliente sem telefone ainda confirma a OS (a UI desabilita o WhatsApp)", async () => {
    const fetcher = vi.fn(async () => respostaJson(200, {}));
    const resultado = await alterarStatusOS(
      { ...ordemEmAndamento, cliente: { nome: "Sem Fone", telefone: null } },
      "CONCLUIDA",
      fetcher as unknown as typeof fetch,
    );

    expect(resultado.ok).toBe(true);
    if (resultado.ok) {
      expect(resultado.sugestaoConclusao).not.toBeNull();
      expect(montarSugestaoConclusao(resultado.sugestaoConclusao!).urlWhatsApp).toBe("");
    }
  });

  it.each([400, 409, 500])("resposta %i → erro do backend e nenhuma sugestão", async (status) => {
    const fetcher = vi.fn(async () => respostaJson(status, { message: "Transição inválida." }));
    const resultado = await alterarStatusOS(ordemEmAndamento, "CONCLUIDA", fetcher as unknown as typeof fetch);
    expect(resultado).toEqual({ ok: false, mensagem: "Transição inválida." });
  });

  it("erro sem corpo JSON → mensagem padrão e nenhuma sugestão", async () => {
    const fetcher = vi.fn(async () => new Response("<html>", { status: 502 }));
    const resultado = await alterarStatusOS(ordemEmAndamento, "CONCLUIDA", fetcher as unknown as typeof fetch);
    expect(resultado).toEqual({ ok: false, mensagem: "Erro ao atualizar status." });
  });

  it("falha de rede → erro e nenhuma sugestão", async () => {
    const fetcher = vi.fn(async () => {
      throw new TypeError("Failed to fetch");
    });
    const resultado = await alterarStatusOS(ordemEmAndamento, "CONCLUIDA", fetcher as unknown as typeof fetch);
    expect(resultado.ok).toBe(false);
  });

  it.each<[OsStatus, OsStatus]>([
    ["ABERTA", "EM_ANDAMENTO"],
    ["CONCLUIDA", "ENTREGUE"],
    ["ABERTA", "CANCELADA"],
  ])("transição %s → %s não sugere WhatsApp", async (atual, novo) => {
    const fetcher = vi.fn(async () => respostaJson(200, {}));
    const resultado = await alterarStatusOS({ ...ordemEmAndamento, status: atual }, novo, fetcher as unknown as typeof fetch);
    expect(resultado).toEqual({ ok: true, sugestaoConclusao: null });
  });
});
