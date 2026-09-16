import { describe, expect, it } from "vitest";

import {
  DADOS_EMPRESA_PADRAO,
  cnpjValido,
  dadosEmpresaSchema,
  nomeExibicaoEmpresa,
} from "./dados-empresa";
import { mensagemAberturaOS, mensagemAvaliacaoOS, mensagemConclusaoOS } from "./formatters";

describe("dadosEmpresaSchema", () => {
  it("aceita e normaliza a carga inicial", () => {
    const resultado = dadosEmpresaSchema.parse({
      ...DADOS_EMPRESA_PADRAO,
      telefone: "(61) 3562-8447",
      whatsapp: "(61) 98449-2002",
      endereco: { ...DADOS_EMPRESA_PADRAO.endereco, uf: "df", cep: "72015-510" },
    });
    expect(resultado.telefone).toBe("6135628447");
    expect(resultado.whatsapp).toBe("61984492002");
    expect(resultado.endereco).toMatchObject({ uf: "DF", cep: "72015510" });
  });

  it("transforma textos opcionais vazios em null", () => {
    const resultado = dadosEmpresaSchema.parse({
      ...DADOS_EMPRESA_PADRAO,
      nomeComplementar: "  ",
      endereco: { ...DADOS_EMPRESA_PADRAO.endereco, complemento: "" },
    });
    expect(resultado.nomeComplementar).toBeNull();
    expect(resultado.endereco.complemento).toBeNull();
  });

  it.each([
    ["nome vazio", { nomeFantasia: " " }],
    ["telefone curto", { telefone: "123" }],
    ["CEP inválido", { endereco: { ...DADOS_EMPRESA_PADRAO.endereco, cep: "123" } }],
    ["UF inválida", { endereco: { ...DADOS_EMPRESA_PADRAO.endereco, uf: "Distrito Federal" } }],
    ["e-mail inválido", { email: "invalido" }],
    ["URL HTTP", { site: "http://example.com" }],
    ["URL javascript", { site: "javascript:alert(1)" }],
    ["CNPJ inválido", { cnpj: "11.111.111/1111-11" }],
    ["versão desconhecida", { versao: 2 }],
    ["campo extra", { inesperado: true }],
  ])("rejeita %s", (_cenario, alteracao) => {
    const entrada = {
      ...DADOS_EMPRESA_PADRAO,
      ...alteracao,
      endereco: "endereco" in alteracao ? alteracao.endereco : { ...DADOS_EMPRESA_PADRAO.endereco },
    };
    expect(dadosEmpresaSchema.safeParse(entrada).success).toBe(false);
  });

  it("valida dígitos verificadores de CNPJ", () => {
    expect(cnpjValido("11.222.333/0001-81")).toBe(true);
    expect(cnpjValido("11.222.333/0001-82")).toBe(false);
  });

  it("monta nome de exibição e mantém fallback", () => {
    expect(nomeExibicaoEmpresa({ nomeFantasia: "Loja", nomeComplementar: "Oficina" })).toBe("Loja - Oficina");
    expect(nomeExibicaoEmpresa({ nomeFantasia: "", nomeComplementar: null })).toBe("UPA do Tênis - Sapataria Alves");
  });

  it("aplica o nome parametrizado às mensagens de OS", () => {
    const nome = "Oficina Exemplo";
    expect(mensagemAberturaOS({ nomeCliente: "Ana", numeroOS: "OS-1", linkAcompanhamento: "https://exemplo.test/os", nomeExibicaoEmpresa: nome })).toContain(nome);
    expect(mensagemConclusaoOS({ nomeCliente: "Ana", numeroOS: "OS-1", nomeExibicaoEmpresa: nome })).toContain(nome);
    expect(mensagemAvaliacaoOS({ nomeCliente: "Ana", numeroOS: "OS-1", linkAvaliacaoGoogle: "https://example.com/review", nomeExibicaoEmpresa: nome })).toContain(nome);
  });
});
