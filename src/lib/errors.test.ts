import { describe, expect, it } from "vitest";
import { getErrorCode, getErrorMessage } from "./errors";

describe("errors", () => {
  describe("getErrorMessage", () => {
    it("extrai a mensagem de uma instância de Error", () => {
      expect(getErrorMessage(new Error("Caixa já está fechado."))).toBe("Caixa já está fechado.");
    });

    it("extrai a mensagem de objetos que não são Error (ex.: erros do Prisma)", () => {
      expect(getErrorMessage({ code: "P2025", message: "Registro não encontrado." })).toBe(
        "Registro não encontrado.",
      );
    });

    it("aceita strings lançadas diretamente", () => {
      expect(getErrorMessage("Falha de rede")).toBe("Falha de rede");
    });

    it("usa a mensagem padrão quando não há mensagem utilizável", () => {
      expect(getErrorMessage(undefined)).toBe("Erro desconhecido.");
      expect(getErrorMessage(null)).toBe("Erro desconhecido.");
      expect(getErrorMessage(new Error(""))).toBe("Erro desconhecido.");
      expect(getErrorMessage({ message: 42 })).toBe("Erro desconhecido.");
    });

    it("respeita o fallback informado", () => {
      expect(getErrorMessage({}, "Falha ao buscar relatório.")).toBe("Falha ao buscar relatório.");
    });
  });

  describe("getErrorCode", () => {
    it("extrai o código textual de erros do Prisma", () => {
      expect(getErrorCode({ code: "P2002" })).toBe("P2002");
      expect(getErrorCode({ code: "P2025" })).toBe("P2025");
    });

    it("retorna undefined quando não há código textual", () => {
      expect(getErrorCode(new Error("boom"))).toBeUndefined();
      expect(getErrorCode({ code: 500 })).toBeUndefined();
      expect(getErrorCode(null)).toBeUndefined();
      expect(getErrorCode("P2025")).toBeUndefined();
    });
  });
});
