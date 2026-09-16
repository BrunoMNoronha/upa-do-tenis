import { z } from "zod";

export const CHAVE_CONFIG_LINK_AVALIACAO_GOOGLE = "linkAvaliacaoGoogle";

/**
 * Valida se uma string é uma URL HTTPS válida para o link de avaliação.
 * Retorna válido se for vazia/nula (remoção do link permitida).
 * Rejeita qualquer outro protocolo (http:, javascript:, data:, etc.) ou URL malformada.
 */
export function validarUrlHttps(valor: string | null | undefined): {
  valido: boolean;
  mensagem?: string;
  urlLimpa?: string;
} {
  if (valor === null || valor === undefined) {
    return { valido: true, urlLimpa: "" };
  }

  const trimmed = valor.trim();
  if (trimmed === "") {
    return { valido: true, urlLimpa: "" };
  }

  // Bloqueio preventivo explícito contra esquemas inseguros
  const esquemaInseguro = /^(javascript|data|vbscript|file):/i;
  if (esquemaInseguro.test(trimmed)) {
    return {
      valido: false,
      mensagem: "Esquema de URL inseguro não permitido. Utilize apenas links HTTPS.",
    };
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== "https:") {
      return {
        valido: false,
        mensagem: "O link de avaliação deve obrigatoriamente utilizar o protocolo HTTPS.",
      };
    }

    const dominioRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!parsed.hostname || !dominioRegex.test(parsed.hostname)) {
      return {
        valido: false,
        mensagem: "O link de avaliação deve conter um domínio válido.",
      };
    }
    return { valido: true, urlLimpa: parsed.toString() };
  } catch {
    return {
      valido: false,
      mensagem: "A URL informada é inválida.",
    };
  }
}

export const configuracaoAvaliacaoSchema = z.object({
  linkAvaliacaoGoogle: z
    .string()
    .nullish()
    .transform((val) => {
      if (!val) return null;
      const t = val.trim();
      return t.length === 0 ? null : t;
    })
    .refine(
      (val) => {
        if (!val) return true;
        const res = validarUrlHttps(val);
        return res.valido;
      },
      {
        message: "O link de avaliação deve ser uma URL HTTPS válida.",
      },
    ),
});

export type ConfiguracaoAvaliacaoInput = z.infer<typeof configuracaoAvaliacaoSchema>;
