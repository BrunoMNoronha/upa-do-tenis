export const FOTO_RECEBIMENTO_TAMANHO_MAXIMO_BYTES = 4_000_000;

export const FOTO_RECEBIMENTO_TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
] as const;

export type FotoRecebimentoTipo = (typeof FOTO_RECEBIMENTO_TIPOS_PERMITIDOS)[number];

type FotoRecebimentoValidada = {
  bytes: Uint8Array;
  contentType: FotoRecebimentoTipo;
  extensao: "jpg" | "png" | "webp";
};

export class FotoRecebimentoError extends Error {
  status: number;

  constructor(message: string, status = 400) {
    super(message);
    this.name = "FotoRecebimentoError";
    this.status = status;
  }
}

function bytesIguais(bytes: Uint8Array, assinatura: number[], inicio = 0) {
  return assinatura.every((byte, indice) => bytes[inicio + indice] === byte);
}

export function identificarTipoRealImagem(bytes: Uint8Array): FotoRecebimentoValidada["contentType"] | null {
  if (bytes.length >= 3 && bytesIguais(bytes, [0xff, 0xd8, 0xff])) return "image/jpeg";
  if (bytes.length >= 8 && bytesIguais(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) return "image/png";
  if (bytes.length >= 12 && bytesIguais(bytes, [0x52, 0x49, 0x46, 0x46]) && bytesIguais(bytes, [0x57, 0x45, 0x42, 0x50], 8)) return "image/webp";
  return null;
}

export async function validarFotoRecebimento(file: File): Promise<FotoRecebimentoValidada> {
  if (file.size === 0) throw new FotoRecebimentoError("Selecione uma imagem não vazia.");
  if (file.size > FOTO_RECEBIMENTO_TAMANHO_MAXIMO_BYTES) throw new FotoRecebimentoError("A imagem deve ter no máximo 4 MB.", 413);
  if (!FOTO_RECEBIMENTO_TIPOS_PERMITIDOS.includes(file.type as FotoRecebimentoTipo)) {
    throw new FotoRecebimentoError("Formato inválido. Use uma imagem JPEG, PNG ou WebP.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const contentType = identificarTipoRealImagem(bytes);
  if (!contentType || contentType !== file.type) {
    throw new FotoRecebimentoError("O conteúdo do arquivo não corresponde a uma imagem JPEG, PNG ou WebP válida.");
  }

  const extensao = contentType === "image/jpeg" ? "jpg" : contentType === "image/png" ? "png" : "webp";
  return { bytes, contentType, extensao };
}
