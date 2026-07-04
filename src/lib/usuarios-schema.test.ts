import { describe, expect, it } from "vitest";

import {
  usuarioAtualizarSchema,
  usuarioCriarSchema,
  usuarioEditarFormSchema,
} from "./usuarios-schema";

describe("usuarioCriarSchema", () => {
  it("aceita dados válidos", () => {
    const result = usuarioCriarSchema.safeParse({
      nome: "Maria Silva",
      email: "maria@exemplo.com",
      senha: "123456",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita nome vazio", () => {
    const result = usuarioCriarSchema.safeParse({
      nome: "",
      email: "maria@exemplo.com",
      senha: "123456",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita e-mail inválido", () => {
    const result = usuarioCriarSchema.safeParse({
      nome: "Maria Silva",
      email: "nao-e-email",
      senha: "123456",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita e-mail vazio", () => {
    const result = usuarioCriarSchema.safeParse({
      nome: "Maria Silva",
      email: "",
      senha: "123456",
    });

    expect(result.success).toBe(false);
  });

  it("rejeita senha ausente ou curta", () => {
    expect(
      usuarioCriarSchema.safeParse({ nome: "Maria Silva", email: "maria@exemplo.com" }).success
    ).toBe(false);
    expect(
      usuarioCriarSchema.safeParse({ nome: "Maria Silva", email: "maria@exemplo.com", senha: "123" }).success
    ).toBe(false);
  });
});

describe("usuarioEditarFormSchema", () => {
  it("aceita senha em branco na edição (mantém a atual)", () => {
    const result = usuarioEditarFormSchema.safeParse({
      nome: "Maria Silva",
      email: "maria@exemplo.com",
      senha: "",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita senha curta na edição", () => {
    const result = usuarioEditarFormSchema.safeParse({
      nome: "Maria Silva",
      email: "maria@exemplo.com",
      senha: "123",
    });

    expect(result.success).toBe(false);
  });
});

describe("usuarioAtualizarSchema", () => {
  it("aceita apenas alteração de status", () => {
    const result = usuarioAtualizarSchema.safeParse({ ativo: false });

    expect(result.success).toBe(true);
  });

  it("aceita atualização parcial sem senha", () => {
    const result = usuarioAtualizarSchema.safeParse({
      nome: "Maria Souza",
      email: "maria@exemplo.com",
    });

    expect(result.success).toBe(true);
  });

  it("rejeita payload vazio", () => {
    const result = usuarioAtualizarSchema.safeParse({});

    expect(result.success).toBe(false);
  });

  it("rejeita senha curta", () => {
    const result = usuarioAtualizarSchema.safeParse({ senha: "123" });

    expect(result.success).toBe(false);
  });
});
