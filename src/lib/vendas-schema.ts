import { z } from "zod";

const itemVendaSchema = z.object({
  produtoId: z.string().min(1, "O produto é obrigatório."),
  quantidade: z
    .number({ invalid_type_error: "A quantidade deve ser um número." })
    .positive("A quantidade deve ser maior que zero."),
});

export const registrarVendaBalcaoSchema = z
  .object({
    formaPagamentoId: z.string().min(1, "A forma de pagamento é obrigatória."),
    clienteId: z.string().optional(),
    observacoes: z.string().optional(),
    itens: z
      .array(itemVendaSchema)
      .min(1, "A venda deve conter ao menos um item."),
  })
  .superRefine((data, ctx) => {
    // O preço unitário nunca vem do frontend: é sempre recalculado no
    // backend a partir de Produto.precoVenda. Aqui apenas garantimos que
    // não há produto duplicado no mesmo payload (evita baixas divididas
    // e ambiguidade de total).
    const vistos = new Set<string>();
    data.itens.forEach((item, index) => {
      if (vistos.has(item.produtoId)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Produto repetido na venda. Some as quantidades em um único item.",
          path: ["itens", index, "produtoId"],
        });
      }
      vistos.add(item.produtoId);
    });
  });

export type RegistrarVendaBalcaoValues = z.infer<typeof registrarVendaBalcaoSchema>;
