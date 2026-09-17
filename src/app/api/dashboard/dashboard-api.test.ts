import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { GET } from "./route";

const { mockGetDashboardMetrics, mockExigirSessaoApi } = vi.hoisted(() => {
  return {
    mockGetDashboardMetrics: vi.fn(),
    mockExigirSessaoApi: vi.fn(),
  };
});

vi.mock("@/lib/dashboard-service", () => ({
  getDashboardMetrics: mockGetDashboardMetrics,
}));

vi.mock("@/lib/auth-server", () => ({
  exigirSessaoApi: mockExigirSessaoApi,
}));

function criarRequest(url: string = "http://localhost/api/dashboard") {
  return new NextRequest(url, { method: "GET" });
}

describe("GET /api/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("retorna 401 se naoAutenticado for retornado de exigirSessaoApi", async () => {
    const errorResponse = NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    mockExigirSessaoApi.mockResolvedValueOnce(errorResponse);

    const response = await GET(criarRequest());
    expect(response.status).toBe(401);
    expect(mockGetDashboardMetrics).not.toHaveBeenCalled();
  });

  it("retorna métricas com datas padrão se não houver query params", async () => {
    mockExigirSessaoApi.mockResolvedValueOnce(null);
    const mockMetrics = {
      totalRecebido: 1000,
      totalPendente: 500,
      osAbertas: 2,
      osEmAndamento: 1,
      osConcluidas: 3,
      osEntregues: 5,
      osPendentesPagamento: 1,
      osParcialmentePagas: 0,
      osPagas: 4,
      ticketMedio: 200,
      topServicos: [],
      topInsumos: [],
    };
    mockGetDashboardMetrics.mockResolvedValueOnce(mockMetrics);

    const dataAtual = new Date("2024-05-15T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(dataAtual);

    const response = await GET(criarRequest());
    expect(response.status).toBe(200);

    const responseData = await response.json();
    expect(responseData).toEqual(mockMetrics);

    expect(mockGetDashboardMetrics).toHaveBeenCalledTimes(1);
    expect(mockGetDashboardMetrics).toHaveBeenCalledWith("2024-05-01", "2024-05-15");

    vi.useRealTimers();
  });

  it("usa o mês atual de São Paulo quando em UTC já é o mês seguinte", async () => {
    mockExigirSessaoApi.mockResolvedValueOnce(null);
    mockGetDashboardMetrics.mockResolvedValueOnce({});

    // 31/05 23:30 em São Paulo = 01/06 02:30 UTC.
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-06-01T02:30:00.000Z"));

    const response = await GET(criarRequest());
    expect(response.status).toBe(200);
    expect(mockGetDashboardMetrics).toHaveBeenCalledWith("2024-05-01", "2024-05-31");

    vi.useRealTimers();
  });

  it("retorna métricas usando as datas enviadas por query params", async () => {
    mockExigirSessaoApi.mockResolvedValueOnce(null);
    const mockMetrics = { totalRecebido: 200 };
    mockGetDashboardMetrics.mockResolvedValueOnce(mockMetrics);

    const url = "http://localhost/api/dashboard?inicio=2023-01-01&fim=2023-01-31";
    const response = await GET(criarRequest(url));

    expect(response.status).toBe(200);
    expect(mockGetDashboardMetrics).toHaveBeenCalledWith("2023-01-01", "2023-01-31");
  });

  it("retorna datas padrão se strings passadas forem inválidas", async () => {
    mockExigirSessaoApi.mockResolvedValueOnce(null);
    mockGetDashboardMetrics.mockResolvedValueOnce({});

    const dataAtual = new Date("2024-05-15T12:00:00.000Z");
    vi.useFakeTimers();
    vi.setSystemTime(dataAtual);

    const url = "http://localhost/api/dashboard?inicio=invalido&fim=invalido2";
    const response = await GET(criarRequest(url));
    expect(response.status).toBe(200);

    expect(mockGetDashboardMetrics).toHaveBeenCalledWith("2024-05-01", "2024-05-15");

    vi.useRealTimers();
  });

  it("retorna 500 se ocorrer um erro em getDashboardMetrics", async () => {
    mockExigirSessaoApi.mockResolvedValueOnce(null);
    mockGetDashboardMetrics.mockRejectedValueOnce(new Error("Erro de banco de dados"));

    const consoleErrorMock = vi.spyOn(console, "error").mockImplementation(() => {});

    const response = await GET(criarRequest());
    expect(response.status).toBe(500);

    const responseData = await response.json();
    expect(responseData).toEqual({ error: "Falha ao buscar métricas." });

    expect(consoleErrorMock).toHaveBeenCalled();
    consoleErrorMock.mockRestore();
  });
});
