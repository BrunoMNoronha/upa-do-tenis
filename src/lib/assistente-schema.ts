import { z } from "zod";
import { PERSONAS_ASSISTENTE } from "@/lib/assistente-personas";

export const LIMITE_CARACTERES_PERGUNTA = 2000;

const modelo = z.enum(["economico", "inteligente"], {
  errorMap: () => ({ message: "Selecione o modelo econômico ou inteligente." }),
});

const pergunta = z
  .string({ required_error: "Digite uma pergunta." })
  .trim()
  .min(1, "Digite uma pergunta.")
  .max(LIMITE_CARACTERES_PERGUNTA, `A pergunta pode ter no máximo ${LIMITE_CARACTERES_PERGUNTA} caracteres.`);

export const novaConversaSchema = z.object({
  persona: z.enum(PERSONAS_ASSISTENTE, { errorMap: () => ({ message: "Selecione uma personalidade válida." }) }),
  modelo,
  pergunta,
});

export const novaMensagemSchema = z.object({ modelo, pergunta });
