import { FUSO_OPERACIONAL, dataOperacionalHoje } from "./date-range";

/**
 * Classificação do estado operacional do caixa para os alertas do Dashboard.
 *
 * Apenas leitura: deriva o estado de `status` e `dataAbertura` já persistidos,
 * sem tocar em saldo, divergência ou movimentações.
 */
export type EstadoOperacionalCaixa = "FECHADO" | "ABERTO_HOJE" | "FECHAMENTO_PENDENTE";

export interface CaixaAbertoResumo {
  id: string;
  dataAbertura: Date;
}

export interface AlertaCaixa {
  estado: EstadoOperacionalCaixa;
  caixaId: string | null;
  /** Data civil de abertura no fuso da operação ("DD/MM/AAAA"). */
  dataAbertura: string | null;
  /** Hora de abertura no fuso da operação ("HH:mm"). */
  horaAbertura: string | null;
}

function formatarPartesOperacionais(data: Date): { data: string; hora: string } {
  const partes = new Intl.DateTimeFormat("pt-BR", {
    timeZone: FUSO_OPERACIONAL,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(data);

  const buscar = (tipo: string) => partes.find((parte) => parte.type === tipo)?.value ?? "";

  return {
    data: `${buscar("day")}/${buscar("month")}/${buscar("year")}`,
    hora: `${buscar("hour")}:${buscar("minute")}`,
  };
}

/**
 * Compara a data civil de abertura com a data civil de `agora`, ambas no fuso
 * da operação. Caixa aberto em dia operacional anterior → fechamento pendente.
 */
export function classificarEstadoCaixa(
  caixa: CaixaAbertoResumo | null,
  agora: Date = new Date()
): AlertaCaixa {
  if (!caixa) {
    return { estado: "FECHADO", caixaId: null, dataAbertura: null, horaAbertura: null };
  }

  const diaAbertura = dataOperacionalHoje(caixa.dataAbertura);
  const diaAtual = dataOperacionalHoje(agora);
  const { data, hora } = formatarPartesOperacionais(caixa.dataAbertura);

  return {
    estado: diaAbertura < diaAtual ? "FECHAMENTO_PENDENTE" : "ABERTO_HOJE",
    caixaId: caixa.id,
    dataAbertura: data,
    horaAbertura: hora,
  };
}
