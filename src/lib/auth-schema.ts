import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "O e-mail é obrigatório.")
    .email("Informe um e-mail válido."),
  senha: z.string().min(1, "A senha é obrigatória."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;
