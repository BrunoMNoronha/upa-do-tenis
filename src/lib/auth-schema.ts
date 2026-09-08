import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "O e-mail é obrigatório.")
    .email("Informe um e-mail válido."),
  senha: z.string().min(1, "A senha é obrigatória."),
});

export type LoginFormValues = z.infer<typeof loginSchema>;

/**
 * Corpo aceito por `POST /api/auth/login`: o formulário mais o token do
 * reCAPTCHA v3 (issue #123). Opcional no schema porque o captcha pode estar
 * desativado; quando ativo, a rota recusa a ausência do token.
 */
export const loginRequestSchema = loginSchema.extend({
  captchaToken: z.string().max(4096).optional(),
});

export type LoginRequestValues = z.infer<typeof loginRequestSchema>;
