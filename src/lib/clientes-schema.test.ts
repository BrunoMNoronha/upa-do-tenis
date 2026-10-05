import { describe, expect, it } from "vitest";

import { clienteAtualizarSchema, clienteFormSchema } from "./clientes-schema";

const telefone = "11987654321";
const mensagemNome = "Informe pelo menos nome e sobrenome.";

describe.each([
  ["cadastro", clienteFormSchema],
  ["atualização", clienteAtualizarSchema],
] as const)("nome do cliente no %s", (_operacao, schema) => {
  it.each(["Maria", " Maria ", "", " \t\n "])("rejeita nome incompleto %j", (nome) => {
    const result = schema.safeParse({ nome, telefone });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.flatten().fieldErrors.nome).toEqual([mensagemNome]);
    }
  });

  it.each(["Maria Silva", "João da Silva", "Ana-Maria Souza", "Luís D'Ávila"])(
    "aceita e preserva %s",
    (nome) => {
      const result = schema.safeParse({ nome, telefone });

      expect(result.success).toBe(true);
      expect(result.success && result.data.nome).toBe(nome);
    },
  );

  it.each(["  Maria   Silva  ", "\tMaria\nSilva\t", "Maria\u00a0Silva"])(
    "normaliza os espaços em %j",
    (nome) => {
      const result = schema.safeParse({ nome, telefone });

      expect(result.success).toBe(true);
      expect(result.success && result.data.nome).toBe("Maria Silva");
    },
  );
});

describe("presença do nome do cliente", () => {
  it("exige nome no cadastro", () => {
    expect(clienteFormSchema.safeParse({ telefone }).success).toBe(false);
  });

  it("mantém PATCH parcial sem nome", () => {
    expect(clienteAtualizarSchema.parse({ telefone })).toEqual({ telefone });
    expect(clienteAtualizarSchema.parse({ ativo: false })).toEqual({ ativo: false });
  });
});
