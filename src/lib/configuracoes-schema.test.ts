import { describe, expect, it } from "vitest";
import {
  configuracaoAvaliacaoSchema,
  validarUrlHttps,
} from "./configuracoes-schema";

describe("validarUrlHttps", () => {
  it("aceita null, undefined ou string vazia como válido para desativação", () => {
    expect(validarUrlHttps(null)).toEqual({ valido: true, urlLimpa: "" });
    expect(validarUrlHttps(undefined)).toEqual({ valido: true, urlLimpa: "" });
    expect(validarUrlHttps("")).toEqual({ valido: true, urlLimpa: "" });
    expect(validarUrlHttps("   ")).toEqual({ valido: true, urlLimpa: "" });
  });

  it("aceita URLs HTTPS válidas e normaliza espaços", () => {
    const urlsValidas = [
      "https://g.page/r/upa-do-tenis/review",
      "https://maps.app.goo.gl/abcdef123",
      "https://goo.gl/maps/12345",
      "https://search.google.com/local/writereview?placeid=ChIJ123",
      "  https://www.google.com/maps/place/Sapataria+Alves  ",
    ];

    for (const url of urlsValidas) {
      const res = validarUrlHttps(url);
      expect(res.valido).toBe(true);
      expect(res.urlLimpa).toMatch(/^https:\/\//);
    }
  });

  it("rejeita protocolo HTTP não seguro", () => {
    const res = validarUrlHttps("http://g.page/r/upa-do-tenis/review");
    expect(res.valido).toBe(false);
    expect(res.mensagem).toMatch(/protocolo HTTPS/i);
  });

  it("rejeita esquemas inseguros como javascript: e data:", () => {
    const esquemasInseguros = [
      "javascript:alert(1)",
      "JAVASCRIPT:alert('xss')",
      "data:text/html,<script>alert(1)</script>",
      "vbscript:msgbox(1)",
      "file:///etc/passwd",
    ];

    for (const url of esquemasInseguros) {
      const res = validarUrlHttps(url);
      expect(res.valido).toBe(false);
      expect(res.mensagem).toMatch(/inseguro/i);
    }
  });

  it("rejeita strings malformadas que não são URLs", () => {
    const invalidas = [
      "not-a-url",
      "htp://erro",
      "https://",
      "https://a",
      "https://..com",
    ];

    for (const url of invalidas) {
      const res = validarUrlHttps(url);
      expect(res.valido).toBe(false);
    }
  });
});

describe("configuracaoAvaliacaoSchema", () => {
  it("permite salvar URL HTTPS válida", () => {
    const parse = configuracaoAvaliacaoSchema.safeParse({
      linkAvaliacaoGoogle: "https://g.page/r/upa-do-tenis/review",
    });
    expect(parse.success).toBe(true);
    if (parse.success) {
      expect(parse.data.linkAvaliacaoGoogle).toBe(
        "https://g.page/r/upa-do-tenis/review",
      );
    }
  });

  it("normaliza espaços ao redor da URL", () => {
    const parse = configuracaoAvaliacaoSchema.safeParse({
      linkAvaliacaoGoogle: "   https://g.page/r/upa-do-tenis/review   ",
    });
    expect(parse.success).toBe(true);
    if (parse.success) {
      expect(parse.data.linkAvaliacaoGoogle).toBe(
        "https://g.page/r/upa-do-tenis/review",
      );
    }
  });

  it("transforma string vazia ou nula em null (para desativação)", () => {
    const vazios = [
      { linkAvaliacaoGoogle: "" },
      { linkAvaliacaoGoogle: "   " },
      { linkAvaliacaoGoogle: null },
      {},
    ];

    for (const entrada of vazios) {
      const parse = configuracaoAvaliacaoSchema.safeParse(entrada);
      expect(parse.success).toBe(true);
      if (parse.success) {
        expect(parse.data.linkAvaliacaoGoogle).toBeNull();
      }
    }
  });

  it("rejeita URL HTTP ou esquema inválido", () => {
    const invalidos = [
      { linkAvaliacaoGoogle: "http://inseguro.com" },
      { linkAvaliacaoGoogle: "javascript:evil()" },
      { linkAvaliacaoGoogle: "invalid-url" },
    ];

    for (const entrada of invalidos) {
      const parse = configuracaoAvaliacaoSchema.safeParse(entrada);
      expect(parse.success).toBe(false);
    }
  });

  it("ignora campos extras sem afetar a validação da configuração", () => {
    const parse = configuracaoAvaliacaoSchema.safeParse({
      linkAvaliacaoGoogle: "https://g.page/r/upa/review",
      campoExtraNaoRelacionado: "valorMalicioso",
    });
    expect(parse.success).toBe(true);
    if (parse.success) {
      expect(parse.data.linkAvaliacaoGoogle).toBe(
        "https://g.page/r/upa/review",
      );
      expect((parse.data as any).campoExtraNaoRelacionado).toBeUndefined();
    }
  });
});
