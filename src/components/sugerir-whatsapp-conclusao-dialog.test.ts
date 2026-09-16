import { describe, expect, it } from "vitest";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";

import { SugerirWhatsAppConclusaoView } from "./sugerir-whatsapp-conclusao-dialog";
import type { DadosSugestaoConclusao } from "@/lib/os-conclusao-whatsapp";

const renderizar = (dados: DadosSugestaoConclusao | null) =>
  renderToStaticMarkup(createElement(SugerirWhatsAppConclusaoView, { dados, onFechar: () => {} }));

describe("SugerirWhatsAppConclusaoView", () => {
  it("sem dados (nenhuma conclusão confirmada) → nada é renderizado", () => {
    expect(renderizar(null)).toBe("");
  });

  it("telefone válido → mostra cliente, telefone, prévia e link wa.me explícito", () => {
    const html = renderizar({ numeroOS: "OS-16092026-0001", nomeCliente: "Maria José", telefone: "61985307168" });

    expect(html).toContain('role="dialog"');
    expect(html).toContain("Ordem de serviço concluída");
    expect(html).toContain("OS-16092026-0001");
    expect(html).toContain("Maria José");
    expect(html).toContain("(61) 98530-7168");
    expect(html).toContain("Sua Ordem de Serviço OS-16092026-0001 foi concluída.");
    expect(html).toContain("Agora não");
    expect(html).toMatch(/<a href="https:\/\/wa\.me\/5561985307168\?text=Ol%C3%A1%2C%20Maria[^"]*" target="upa-whatsapp"/);
    expect(html).toContain("Abrir WhatsApp");
    expect(html).not.toContain("não tem telefone válido");
  });

  it("telefone inválido → aviso, sem link wa.me e botão desabilitado", () => {
    const html = renderizar({ numeroOS: "OS-1", nomeCliente: "Sem Fone", telefone: "123" });

    expect(html).toContain("O cliente não tem telefone válido para WhatsApp. A OS continua concluída normalmente.");
    expect(html).not.toContain("wa.me");
    expect(html).toMatch(/<button[^>]*disabled=""[^>]*>Abrir WhatsApp<\/button>/);
  });
});
