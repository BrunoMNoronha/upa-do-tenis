import { z } from "zod";

export const CHAVE_CONFIG_DADOS_EMPRESA = "dadosEmpresa";
export const NOME_EMPRESA_FALLBACK = "UPA do Tênis - Sapataria Alves";

const textoOpcional = (maximo: number) =>
  z
    .string()
    .max(maximo)
    .nullish()
    .transform((valor) => {
      const limpo = valor?.trim() ?? "";
      return limpo === "" ? null : limpo;
    });

const somenteDigitosOpcional = (quantidades: number[], mensagem: string) =>
  z
    .string()
    .nullish()
    .transform((valor) => {
      const digitos = valor?.replace(/\D/g, "") ?? "";
      return digitos === "" ? null : digitos;
    })
    .refine((valor) => valor === null || quantidades.includes(valor.length), mensagem);

const telefoneBrasileiroOpcional = z
  .string()
  .nullish()
  .transform((valor) => {
    let digitos = valor?.replace(/\D/g, "") ?? "";
    if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
      digitos = digitos.slice(2);
    }
    return digitos === "" ? null : digitos;
  })
  .refine(
    (valor) => valor === null || valor.length === 10 || valor.length === 11,
    "O telefone deve conter 10 ou 11 dígitos, com DDD.",
  );

export function cnpjValido(valor: string): boolean {
  const cnpj = valor.replace(/\D/g, "");
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;

  const calcularDigito = (base: string, pesos: number[]) => {
    const soma = base
      .split("")
      .reduce((total, digito, indice) => total + Number(digito) * pesos[indice], 0);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const primeiro = calcularDigito(cnpj.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  const segundo = calcularDigito(cnpj.slice(0, 12) + primeiro, [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
  return cnpj.endsWith(`${primeiro}${segundo}`);
}

const urlHttpsOpcional = z
  .string()
  .max(500)
  .nullish()
  .transform((valor, contexto) => {
    const limpo = valor?.trim() ?? "";
    if (!limpo) return null;

    try {
      const url = new URL(limpo);
      if (url.protocol !== "https:" || !url.hostname.includes(".")) {
        contexto.addIssue({ code: z.ZodIssueCode.custom, message: "Informe uma URL HTTPS válida." });
        return z.NEVER;
      }
      return url.toString();
    } catch {
      contexto.addIssue({ code: z.ZodIssueCode.custom, message: "Informe uma URL HTTPS válida." });
      return z.NEVER;
    }
  });

const emailOpcional = z
  .string()
  .max(254)
  .nullish()
  .transform((valor) => valor?.trim() ?? "")
  .refine((valor) => valor === "" || z.string().email().safeParse(valor).success, "Informe um e-mail válido.")
  .transform((valor) => {
    if (!valor) return null;
    const separador = valor.lastIndexOf("@");
    return `${valor.slice(0, separador)}@${valor.slice(separador + 1).toLowerCase()}`;
  });

const cnpjOpcional = somenteDigitosOpcional([14], "O CNPJ deve conter 14 dígitos.").refine(
  (valor) => valor === null || cnpjValido(valor),
  "Informe um CNPJ válido.",
);

export const dadosEmpresaSchema = z
  .object({
    versao: z.literal(1),
    nomeFantasia: z.string().trim().min(1, "Informe o nome fantasia.").max(120),
    nomeComplementar: textoOpcional(120),
    razaoSocial: textoOpcional(180),
    cnpj: cnpjOpcional,
    telefone: telefoneBrasileiroOpcional,
    whatsapp: telefoneBrasileiroOpcional,
    email: emailOpcional,
    site: urlHttpsOpcional,
    endereco: z
      .object({
        logradouro: textoOpcional(180),
        numero: textoOpcional(40),
        complemento: textoOpcional(120),
        bairro: textoOpcional(120),
        cidade: textoOpcional(120),
        uf: z
          .string()
          .max(2)
          .nullish()
          .transform((valor) => valor?.trim().toUpperCase() ?? "")
          .refine((valor) => valor === "" || /^[A-Z]{2}$/.test(valor), "A UF deve conter duas letras.")
          .transform((valor) => valor || null),
        cep: somenteDigitosOpcional([8], "O CEP deve conter 8 dígitos."),
      })
      .strict(),
    horarioAtendimento: textoOpcional(1000),
    instagramUrl: urlHttpsOpcional,
    facebookUrl: urlHttpsOpcional,
  })
  .strict();

export type DadosEmpresa = z.output<typeof dadosEmpresaSchema>;
export type DadosEmpresaEntrada = z.input<typeof dadosEmpresaSchema>;

export const DADOS_EMPRESA_PADRAO: Readonly<DadosEmpresa> = Object.freeze({
  versao: 1,
  nomeFantasia: "UPA do Tênis",
  nomeComplementar: "Sapataria Alves",
  razaoSocial: null,
  cnpj: null,
  telefone: "6135628447",
  whatsapp: "6184492002",
  email: "upadotenis@gmail.com",
  site: "https://www.upadotenis.com.br/",
  endereco: Object.freeze({
    logradouro: "C12 Bloco O",
    numero: "Lote 07/14",
    complemento: "Loja 05",
    bairro: "Taguatinga Centro",
    cidade: "Brasília",
    uf: "DF",
    cep: "72010120",
  }),
  horarioAtendimento:
    "Segunda a sexta, das 09:00 às 17:00; sábado, das 09:00 às 13:00; domingo, fechado.",
  instagramUrl: "https://www.instagram.com/upa.do.tenis/",
  facebookUrl: "https://www.facebook.com/upadotenis/",
});

export function nomeExibicaoEmpresa(dados: Pick<DadosEmpresa, "nomeFantasia" | "nomeComplementar">): string {
  return [dados.nomeFantasia?.trim(), dados.nomeComplementar?.trim()].filter(Boolean).join(" - ") || NOME_EMPRESA_FALLBACK;
}

export function clonarDadosEmpresa(dados: DadosEmpresa): DadosEmpresa {
  return { ...dados, endereco: { ...dados.endereco } };
}
