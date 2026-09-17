import { z } from "zod";

export const LIMITE_FOTOS_POR_ITEM = 5;

export const chaveIdempotenciaFotoSchema = z
  .string()
  .trim()
  .min(8)
  .max(120)
  .regex(/^[A-Za-z0-9_-]+$/, "Chave de idempotência inválida.");

export class FotoItemOrdemError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "FotoItemOrdemError";
    this.status = status;
  }
}

export function montarPathnameFotoItem(params: {
  ordemServicoId: string;
  itemId: string;
  chaveIdempotencia: string;
  extensao: string;
}) {
  return `ordens-servico/${params.ordemServicoId}/itens/${params.itemId}/${params.chaveIdempotencia}.${params.extensao}`;
}
