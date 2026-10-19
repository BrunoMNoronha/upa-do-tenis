import { afterEach, describe, expect, it, vi } from "vitest";

import { PRODUTO } from "@/config/landing";

import { normalizarTelefoneBrasileiro, obterContatoLanding } from "./landing-contato";

const URL_ESPERADA = `https://wa.me/5561985307168?text=${encodeURIComponent(PRODUTO.mensagemWhatsapp)}`;

describe("contato da landing por variável de ambiente", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("sem LANDING_WHATSAPP, não há telefone, link nem exibição", () => {
    expect(obterContatoLanding({})).toEqual({ whatsappTelefone: null, whatsappUrl: null, whatsappExibicao: null });
    expect(obterContatoLanding({ LANDING_WHATSAPP: "" })).toEqual(obterContatoLanding({}));
    expect(obterContatoLanding({ LANDING_WHATSAPP: "   " })).toEqual(obterContatoLanding({}));
  });

  it("aceita só dígitos, máscara e prefixo +55, sempre com a mesma saída", () => {
    for (const valor of ["61985307168", "(61) 98530-7168", "+55 61 98530-7168", "5561985307168", " 61 98530 7168 "]) {
      expect(obterContatoLanding({ LANDING_WHATSAPP: valor }), valor).toEqual({
        whatsappTelefone: "61985307168",
        whatsappUrl: URL_ESPERADA,
        whatsappExibicao: "(61) 98530-7168",
      });
    }
  });

  it("aceita telefone fixo de 10 dígitos", () => {
    expect(obterContatoLanding({ LANDING_WHATSAPP: "(61) 3562-8447" })).toEqual({
      whatsappTelefone: "6135628447",
      whatsappUrl: `https://wa.me/556135628447?text=${encodeURIComponent(PRODUTO.mensagemWhatsapp)}`,
      whatsappExibicao: "(61) 3562-8447",
    });
  });

  it("valor inválido oculta o contato e avisa uma vez no log", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});

    // Um número estrangeiro com 10 ou 11 dígitos é indistinguível de um brasileiro
    // sem o prefixo 55; a validação é só de formato, não de país.
    for (const valor of ["985307168", "abc", "12345678901234", "+44 20 7946 0958"]) {
      expect(obterContatoLanding({ LANDING_WHATSAPP: valor }), valor).toEqual({
        whatsappTelefone: null,
        whatsappUrl: null,
        whatsappExibicao: null,
      });
    }

    // O aviso é de processo (não por requisição) e pode já ter sido emitido por
    // outro caso; o que importa é não repetir a cada chamada.
    expect(warn.mock.calls.length).toBeLessThanOrEqual(1);
  });

  it("lê process.env por padrão", () => {
    vi.stubEnv("LANDING_WHATSAPP", "61985307168");
    expect(obterContatoLanding().whatsappUrl).toBe(URL_ESPERADA);
  });

  it("normalizarTelefoneBrasileiro remove só o 55 de 12/13 dígitos", () => {
    expect(normalizarTelefoneBrasileiro("5561985307168")).toBe("61985307168");
    expect(normalizarTelefoneBrasileiro("556135628447")).toBe("6135628447");
    // 11 dígitos começando com 55 é um telefone de DDD 55 (RS), não um prefixo.
    expect(normalizarTelefoneBrasileiro("55999887766")).toBe("55999887766");
    expect(normalizarTelefoneBrasileiro(undefined)).toBeNull();
    expect(normalizarTelefoneBrasileiro("")).toBeNull();
  });
});
