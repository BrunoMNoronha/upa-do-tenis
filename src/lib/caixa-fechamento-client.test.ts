import { describe, expect, it, vi } from "vitest";
import { enviarFechamentoCaixa } from "./caixa-fechamento-client";

const json = (data: unknown, status = 200) => Response.json(data, { status });
const payload = { saldoFinalInformado: 90, observacao: "Conferência" };

describe("conferência vinculada ao caixa exibido", () => {
  it.each([null, { id: "novo" }])("não envia fechamento se o atual mudou para %j", async (caixa) => {
    const fetcher = vi.fn().mockResolvedValue(json({ caixa }));
    await expect(enviarFechamentoCaixa("anterior", payload, fetcher)).rejects.toThrow("já foi fechado ou substituído");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("falha de revalidação não permite enviar o fechamento", async () => {
    const fetcher = vi.fn().mockResolvedValue(json({ message: "indisponível" }, 500));
    await expect(enviarFechamentoCaixa("anterior", payload, fetcher)).rejects.toThrow("conferir o caixa atual");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("envia somente ao id conferido, com o valor informado intacto", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json({ caixa: { id: "anterior" } })).mockResolvedValueOnce(json({ status: "FECHADO" }));
    await enviarFechamentoCaixa("anterior", payload, fetcher);
    expect(fetcher).toHaveBeenNthCalledWith(1, "/api/caixa/atual", { cache: "no-store" });
    expect(fetcher).toHaveBeenNthCalledWith(2, "/api/caixa/anterior/fechar", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
    });
  });

  it("propaga fechamento concorrente sem tentar enviar a outro caixa", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json({ caixa: { id: "anterior" } }))
      .mockResolvedValueOnce(json({ message: "Caixa já está fechado." }, 400));
    await expect(enviarFechamentoCaixa("anterior", payload, fetcher)).rejects.toThrow("Caixa já está fechado.");
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("permite tentar novamente após erro do fechamento", async () => {
    const fetcher = vi.fn().mockResolvedValueOnce(json({ caixa: { id: "anterior" } }))
      .mockResolvedValueOnce(json({}, 500)).mockResolvedValueOnce(json({ caixa: { id: "anterior" } }))
      .mockResolvedValueOnce(json({ status: "FECHADO" }));
    await expect(enviarFechamentoCaixa("anterior", payload, fetcher)).rejects.toThrow("Erro ao fechar caixa");
    await expect(enviarFechamentoCaixa("anterior", payload, fetcher)).resolves.toBeUndefined();
  });
});
