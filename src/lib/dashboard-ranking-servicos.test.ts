import { describe, expect, it } from "vitest";

import { combinarRankingServicos } from "./dashboard-ranking-servicos";

describe("combinarRankingServicos", () => {
  it("soma execuções de OS e de Atendimento Rápido do mesmo serviço", () => {
    const ranking = combinarRankingServicos(
      [
        { servicoId: "higienizacao", quantidade: 4 },
        { servicoId: "pintura", quantidade: 5 },
      ],
      [{ servicoId: "higienizacao", quantidade: 3 }],
    );

    expect(ranking).toEqual([
      { servicoId: "higienizacao", quantidade: 7 },
      { servicoId: "pintura", quantidade: 5 },
    ]);
  });

  it("aplica o Top 5 depois de somar: serviço fora do Top 5 de OS pode entrar pelo AR", () => {
    const os = ["a", "b", "c", "d", "e", "f"].map((servicoId, indice) => ({ servicoId, quantidade: 10 - indice }));
    // f tinha 5 execuções em OS (6º lugar); com 6 no AR passa a 11 e lidera.
    const ranking = combinarRankingServicos(os, [{ servicoId: "f", quantidade: 6 }]);

    expect(ranking.map((item) => item.servicoId)).toEqual(["f", "a", "b", "c", "d"]);
    expect(ranking[0].quantidade).toBe(11);
  });

  it("considera serviços presentes só no AR ou só na OS", () => {
    expect(combinarRankingServicos([], [{ servicoId: "cadarco", quantidade: 2 }])).toEqual([
      { servicoId: "cadarco", quantidade: 2 },
    ]);
    expect(combinarRankingServicos([{ servicoId: "sola", quantidade: 1 }], [])).toEqual([
      { servicoId: "sola", quantidade: 1 },
    ]);
  });

  it("desempata por servicoId e ignora quantidades não positivas", () => {
    const ranking = combinarRankingServicos(
      [
        { servicoId: "b", quantidade: 2 },
        { servicoId: "z", quantidade: 0 },
      ],
      [{ servicoId: "a", quantidade: 2 }],
    );
    expect(ranking).toEqual([
      { servicoId: "a", quantidade: 2 },
      { servicoId: "b", quantidade: 2 },
    ]);
  });
});
