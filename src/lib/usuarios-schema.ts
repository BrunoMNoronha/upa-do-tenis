import { z } from "zod";

const nomeSchema = z.string().min(2, "O nome deve ter pelo menos 2 caracteres.");
const emailSchema = z
  .string()
  .min(1, "O e-mail é obrigatório.")
  .email("Informe um e-mail válido.");

export const usuarioCriarSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres."),
});

export const usuarioEditarFormSchema = z.object({
  nome: nomeSchema,
  email: emailSchema,
  senha: z
    .string()
    .refine((valor) => valor === "" || valor.length >= 6, "A senha deve ter pelo menos 6 caracteres."),
});

export const usuarioAtualizarSchema = z
  .object({
    nome: nomeSchema.optional(),
    email: emailSchema.optional(),
    senha: z.string().min(6, "A senha deve ter pelo menos 6 caracteres.").optional(),
    ativo: z.boolean().optional(),
  })
  .refine(
    (data) => data.nome !== undefined || data.email !== undefined || data.senha !== undefined || data.ativo !== undefined,
    { message: "Informe ao menos um campo para atualizar." }
  );

export type UsuarioFormValues = z.infer<typeof usuarioCriarSchema>;
export type UsuarioAtualizarValues = z.infer<typeof usuarioAtualizarSchema>;
