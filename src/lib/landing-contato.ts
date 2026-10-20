import { PRODUTO } from "@/config/landing";

import { formatPhone, whatsappLink } from "./formatters";

/**
 * Contato comercial da landing (`/`), lido de variável de ambiente para ser
 * configurado por escopo (Vercel Production/Preview, Docker local) sem
 * alterar código. Mesmo padrão de `obterConfigCaptcha`: função pura com `env`
 * injetável, lida no servidor (a landing é `force-dynamic`) e entregue como
 * prop, nunca como `NEXT_PUBLIC_*`.
 *
 * `LANDING_WHATSAPP`: telefone brasileiro com DDD (10 ou 11 dígitos), com ou
 * sem máscara e com ou sem o prefixo 55. Ausente ou inválido, a landing não
 * mostra os botões de WhatsApp.
 */

export type EnvLanding = Record<string, string | undefined>;

export type ContatoLanding = {
  /** Só dígitos, com DDD, sem o 55 (ex.: "61985307168"); null se ausente/inválido. */
  whatsappTelefone: string | null;
  /** Link `https://wa.me/55…?text=…` com a mensagem padrão; null se ausente/inválido. */
  whatsappUrl: string | null;
  /** Exibição "(61) 98530-7168"; null se ausente/inválido. */
  whatsappExibicao: string | null;
};

const CONTATO_VAZIO: ContatoLanding = { whatsappTelefone: null, whatsappUrl: null, whatsappExibicao: null };

/** Normaliza para 10 ou 11 dígitos com DDD; null quando não é um telefone brasileiro. */
export function normalizarTelefoneBrasileiro(valor: string | undefined): string | null {
  let digitos = valor?.replace(/\D/g, "") ?? "";
  if ((digitos.length === 12 || digitos.length === 13) && digitos.startsWith("55")) {
    digitos = digitos.slice(2);
  }
  return digitos.length === 10 || digitos.length === 11 ? digitos : null;
}

let avisoInvalidoEmitido = false;

export function obterContatoLanding(env: EnvLanding = process.env): ContatoLanding {
  const bruto = env.LANDING_WHATSAPP?.trim() || null;
  if (!bruto) return CONTATO_VAZIO;

  const telefone = normalizarTelefoneBrasileiro(bruto);
  if (!telefone) {
    if (!avisoInvalidoEmitido) {
      avisoInvalidoEmitido = true;
      console.warn(
        "LANDING_WHATSAPP inválido: esperado telefone brasileiro com DDD (10 ou 11 dígitos). Botões de WhatsApp da landing ocultos.",
      );
    }
    return CONTATO_VAZIO;
  }

  return {
    whatsappTelefone: telefone,
    whatsappUrl: whatsappLink(telefone, PRODUTO.mensagemWhatsapp),
    whatsappExibicao: formatPhone(telefone),
  };
}
