import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SugerirWhatsAppAvaliacaoView } from "./sugerir-whatsapp-avaliacao-dialog";
import type { DadosSugestaoAvaliacao } from "@/lib/os-avaliacao-whatsapp";

const renderizar = (dados: DadosSugestaoAvaliacao | null) =>
  renderToStaticMarkup(
    createElement(SugerirWhatsAppAvaliacaoView, { dados, onFechar: () => {} }),
  );

describe("SugerirWhatsAppAvaliacaoView", () => {
  it("sem dados (nenhuma entrega confirmada) → nada é renderizado", () => {
    expect(renderizar(null)).toBe("");
  });

  it("telefone válido e link configurado → mostra cliente, prévia da mensagem e link wa.me explícito", () => {
    const html = renderizar({
      numeroOS: "OS-2026-0010",
      nomeCliente: "Beatriz Lima",
      telefone: "61985307168",
      linkAvaliacaoGoogle: "https://g.page/r/upa-do-tenis/review",
    });

    expect(html).toContain('role="dialog"');
    expect(html).toContain("Solicitar avaliação no Google");
    expect(html).toContain("OS-2026-0010");
    expect(html).toContain("Beatriz Lima");
    expect(html).toContain("(61) 98530-7168");
    expect(html).toContain("https://g.page/r/upa-do-tenis/review");
    expect(html).toContain("Agora não");
    expect(html).toMatch(
      /<a href="https:\/\/wa\.me\/5561985307168\?text=[^"]*" target="upa-whatsapp"/,
    );
    expect(html).toContain("Abrir WhatsApp");
    expect(html).not.toContain("Link de avaliação não configurado");
    expect(html).not.toContain("não tem telefone válido");
  });

  it("link ausente → aviso informativo com atalho para /configuracoes e botão desabilitado", () => {
    const html = renderizar({
      numeroOS: "OS-2026-0011",
      nomeCliente: "Lucas Rocha",
      telefone: "61985307168",
      linkAvaliacaoGoogle: null,
    });

    expect(html).toContain("Link de avaliação não configurado");
    expect(html).toContain('href="/configuracoes"');
    expect(html).toContain("A OS permanece entregue normalmente.");
    expect(html).not.toContain("wa.me");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Abrir WhatsApp<\/button>/);
  });

  it("telefone inválido → aviso sobre telefone e botão desabilitado", () => {
    const html = renderizar({
      numeroOS: "OS-2026-0012",
      nomeCliente: "Sem Telefone",
      telefone: "123",
      linkAvaliacaoGoogle: "https://g.page/r/upa/review",
    });

    expect(html).toContain(
      "O cliente não tem telefone válido para WhatsApp. A OS continua entregue normalmente.",
    );
    expect(html).not.toContain("wa.me");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Abrir WhatsApp<\/button>/);
  });
});
