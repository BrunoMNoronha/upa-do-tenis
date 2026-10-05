import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { criarControladorFiltrosUrl } from "@/lib/filtros-url";

const DEBOUNCE_MS = 350;
const FILTROS_OS = ["statusOp", "statusFin", "busca", "atrasadas"];

function criar(inicial = "") {
  const navegar = vi.fn<(queryString: string) => void>();
  const controlador = criarControladorFiltrosUrl({ inicial, debounceMs: DEBOUNCE_MS, navegar });
  return { controlador, navegar };
}

describe("criarControladorFiltrosUrl", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("aplica o filtro na hora, volta para a página 1 e preserva os demais parâmetros", () => {
    const { controlador, navegar } = criar("pageSize=50&page=3&statusFin=PAGO");

    controlador.aplicar("statusOp", "ABERTA");

    expect(navegar).toHaveBeenCalledExactlyOnceWith("pageSize=50&statusFin=PAGO&statusOp=ABERTA");
  });

  it("remove o filtro quando o valor é vazio ou nulo", () => {
    const { controlador, navegar } = criar("statusOp=ABERTA&busca=joao");

    controlador.aplicar("busca", "");
    controlador.aplicar("statusOp", null);

    expect(navegar).toHaveBeenNthCalledWith(1, "statusOp=ABERTA");
    expect(navegar).toHaveBeenNthCalledWith(2, "");
  });

  it("só navega depois do debounce e considera apenas o último termo digitado", () => {
    const { controlador, navegar } = criar();

    controlador.agendar("busca", "jo");
    vi.advanceTimersByTime(DEBOUNCE_MS - 1);
    controlador.agendar("busca", "joao");
    vi.advanceTimersByTime(DEBOUNCE_MS - 1);
    expect(navegar).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(navegar).toHaveBeenCalledExactlyOnceWith("busca=joao");
  });

  it("não reaplica a busca pendente nem os filtros antigos depois de limpar", () => {
    const { controlador, navegar } = criar("statusOp=ABERTA&pageSize=50");

    controlador.agendar("busca", "joao");
    controlador.limpar(FILTROS_OS);
    vi.advanceTimersByTime(DEBOUNCE_MS * 2);

    expect(navegar).toHaveBeenCalledExactlyOnceWith("pageSize=50");
  });

  it("mantém o filtro aplicado enquanto a busca estava pendente", () => {
    const { controlador, navegar } = criar();

    controlador.agendar("busca", "joao");
    controlador.aplicar("statusOp", "ABERTA");
    vi.advanceTimersByTime(DEBOUNCE_MS);

    expect(navegar).toHaveBeenLastCalledWith("statusOp=ABERTA&busca=joao");
  });

  it("parte da URL sincronizada por fora", () => {
    const { controlador, navegar } = criar("statusOp=ABERTA");

    controlador.sincronizar("statusOp=PRONTA&nova=1");
    controlador.aplicar("busca", "tenis");

    expect(navegar).toHaveBeenCalledExactlyOnceWith("statusOp=PRONTA&nova=1&busca=tenis");
  });

  it("cancelar descarta o agendamento pendente", () => {
    const { controlador, navegar } = criar();

    controlador.agendar("busca", "joao");
    controlador.cancelar();
    vi.advanceTimersByTime(DEBOUNCE_MS * 2);

    expect(navegar).not.toHaveBeenCalled();
  });
});
