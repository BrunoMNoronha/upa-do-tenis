import { describe, expect, it } from "vitest";

import { situacaoNoCatalogo } from "./catalogo-regras";

describe("situacaoNoCatalogo", () => {
  it("produto não marcado fica fora, mesmo ativo e com estoque", () => {
    expect(situacaoNoCatalogo({ publicadoNoCatalogo: false, ativo: true, quantidadeEstoque: 10 })).toBe("FORA_DO_CATALOGO");
  });

  it("publicado, ativo e com estoque é visível", () => {
    expect(situacaoNoCatalogo({ publicadoNoCatalogo: true, ativo: true, quantidadeEstoque: 1 })).toBe("VISIVEL");
  });

  it("publicado e inativo fica oculto", () => {
    expect(situacaoNoCatalogo({ publicadoNoCatalogo: true, ativo: false, quantidadeEstoque: 5 })).toBe("OCULTO_INATIVO");
  });

  it.each([0, -1, Number.NaN])("publicado com estoque %s fica oculto", (quantidadeEstoque) => {
    expect(situacaoNoCatalogo({ publicadoNoCatalogo: true, ativo: true, quantidadeEstoque })).toBe("OCULTO_SEM_ESTOQUE");
  });

  it("estoque fracionário positivo conta como disponível", () => {
    expect(situacaoNoCatalogo({ publicadoNoCatalogo: true, ativo: true, quantidadeEstoque: 0.5 })).toBe("VISIVEL");
  });
});
