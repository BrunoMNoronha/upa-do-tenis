import { describe, expect, it } from "vitest";

import { rotuloOrigemMovimentacaoCaixa } from "./caixa-origem";

describe("rotuloOrigemMovimentacaoCaixa", () => {
  it("traduz as origens conhecidas, inclusive o estorno de pagamento (#230)", () => {
    expect(rotuloOrigemMovimentacaoCaixa("ESTORNO_PAGAMENTO_OS")).toBe("Estorno de pagamento de OS");
    expect(rotuloOrigemMovimentacaoCaixa("PAGAMENTO_OS")).toBe("Pagamento de OS");
    expect(rotuloOrigemMovimentacaoCaixa("ATENDIMENTO_RAPIDO")).toBe("Atendimento Rápido");
    expect(rotuloOrigemMovimentacaoCaixa("MANUAL")).toBe("Manual");
  });

  it("origem desconhecida aparece como veio", () => {
    expect(rotuloOrigemMovimentacaoCaixa("OUTRA_ORIGEM")).toBe("OUTRA_ORIGEM");
  });
});
