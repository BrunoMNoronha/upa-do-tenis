import { describe, expect, it } from "vitest";

import { montarObservacaoRegistroRetroativo } from "@/lib/ordens-servico-rastreabilidade";

describe("ordens-servico-rastreabilidade", () => {
  it("monta a observação com data operacional, data técnica, usuário e justificativa", () => {
    const observacao = montarObservacaoRegistroRetroativo({
      dataOperacional: "2026-09-03",
      // 05/09/2026 14:32 em Brasília.
      registradoEm: new Date("2026-09-05T17:32:00Z"),
      usuarioNome: "Bruno Alves",
      justificativa: "OS anotada no caderno durante a queda de energia.",
    });

    expect(observacao).toBe(
      "[REGISTRO RETROATIVO] Data operacional informada: 03/09/2026" +
        " | Registrado no sistema em: 05/09/2026 14:32" +
        " | Usuário: Bruno Alves" +
        " | Justificativa: OS anotada no caderno durante a queda de energia.",
    );
  });

  it("formata a data técnica no fuso da operação, não em UTC", () => {
    const observacao = montarObservacaoRegistroRetroativo({
      dataOperacional: "2026-09-01",
      // 05/09 22:00 em Brasília = 06/09 01:00 em UTC.
      registradoEm: new Date("2026-09-06T01:00:00Z"),
      usuarioNome: "Bruno Alves",
      justificativa: "Registro do caderno de balcão.",
    });

    expect(observacao).toContain("Registrado no sistema em: 05/09/2026 22:00");
  });

  it("colapsa quebras de linha e espaços repetidos da justificativa", () => {
    const observacao = montarObservacaoRegistroRetroativo({
      dataOperacional: "2026-09-01",
      registradoEm: new Date("2026-09-05T17:32:00Z"),
      usuarioNome: "Bruno Alves",
      justificativa: "  Cliente   trouxe\n\nna segunda-feira.  ",
    });

    expect(observacao).toContain("Justificativa: Cliente trouxe na segunda-feira.");
  });

  it("trunca justificativa muito longa", () => {
    const observacao = montarObservacaoRegistroRetroativo({
      dataOperacional: "2026-09-01",
      registradoEm: new Date("2026-09-05T17:32:00Z"),
      usuarioNome: "Bruno Alves",
      justificativa: "a".repeat(600),
    });

    const justificativa = observacao.split("Justificativa: ")[1];

    expect(justificativa).toHaveLength(501);
    expect(justificativa.endsWith("…")).toBe(true);
  });

  it("usa o e-mail quando o nome do usuário está vazio", () => {
    const observacao = montarObservacaoRegistroRetroativo({
      dataOperacional: "2026-09-01",
      registradoEm: new Date("2026-09-05T17:32:00Z"),
      usuarioNome: "operador@sapataria.com",
      justificativa: "Registro do caderno de balcão.",
    });

    expect(observacao).toContain("Usuário: operador@sapataria.com");
  });
});
