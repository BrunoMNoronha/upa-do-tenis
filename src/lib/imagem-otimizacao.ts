import {
  FOTO_RECEBIMENTO_TAMANHO_MAXIMO_BYTES,
  FOTO_RECEBIMENTO_TIPOS_PERMITIDOS,
  type FotoRecebimentoTipo,
} from "@/lib/ordens-servico-foto";

/**
 * Otimização de fotos no navegador antes do upload.
 *
 * A foto original nunca sai do aparelho: ela é decodificada (com a orientação
 * EXIF aplicada), redimensionada sem upscale e recodificada em WebP — ou JPEG
 * quando o navegador não codifica WebP no canvas (Safari). Recodificar pelo
 * canvas descarta os metadados EXIF (inclusive GPS).
 *
 * O backend continua validando MIME, assinatura binária e o limite de 4 MB.
 */

/**
 * Parâmetros medidos com fotos reais de calçados (3–15 MB, até 6000 px):
 * a 0,80 a textura de desgaste da sola fica visivelmente alisada; a 0,85 os
 * arquivos ficam entre ~140 e ~360 KB (PSNR ~38 dB) e preservam manchas,
 * riscos e descolamentos. 1600 px basta para o detalhe da OS.
 */
export const OTIMIZACAO_FOTO_PADRAO = {
  maiorDimensao: 1600,
  qualidade: 0.85,
  /** Acima disto, uma única segunda passada com qualidade menor. */
  tamanhoAlvoBytes: 600_000,
  qualidadeReduzida: 0.75,
  /** Qualidade do fallback JPEG, formato menos eficiente que o WebP. */
  qualidadeJpeg: 0.85,
} as const;

/** Limite da foto ORIGINAL selecionada; o arquivo enviado segue limitado a 4 MB. */
export const FOTO_ORIGINAL_TAMANHO_MAXIMO_BYTES = 25_000_000;
/** Protege a memória do aparelho ao decodificar (48 MP ≈ 192 MB em RGBA). */
export const FOTO_ORIGINAL_MAXIMO_PIXELS = 64_000_000;

export class ImagemOtimizacaoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImagemOtimizacaoError";
  }
}

export type Dimensoes = { largura: number; altura: number };

export type ImagemOtimizada = {
  file: File;
  mimeType: FotoRecebimentoTipo;
  tamanhoOriginal: number;
  tamanhoOtimizado: number;
  original: Dimensoes;
  final: Dimensoes;
};

export function validarFotoOriginal(file: File | null | undefined): string | null {
  if (!file) return "Selecione uma imagem.";
  if (file.size === 0) return "Selecione uma imagem não vazia.";
  if (!FOTO_RECEBIMENTO_TIPOS_PERMITIDOS.includes(file.type as FotoRecebimentoTipo)) {
    return "Formato inválido. Use uma imagem JPEG, PNG ou WebP.";
  }
  if (file.size > FOTO_ORIGINAL_TAMANHO_MAXIMO_BYTES) return "A imagem deve ter no máximo 25 MB.";
  return null;
}

export function validarDimensoesOriginais({ largura, altura }: Dimensoes): string | null {
  if (!Number.isFinite(largura) || !Number.isFinite(altura) || largura < 1 || altura < 1) {
    return "Não foi possível ler as dimensões da imagem.";
  }
  if (largura * altura > FOTO_ORIGINAL_MAXIMO_PIXELS) {
    return "A resolução da imagem é alta demais para processar neste aparelho.";
  }
  return null;
}

/** Limita o maior lado preservando a proporção; nunca amplia. */
export function calcularDimensoesAlvo({ largura, altura }: Dimensoes, maiorDimensao: number): Dimensoes {
  const maior = Math.max(largura, altura);
  if (maior <= maiorDimensao) return { largura, altura };
  const escala = maiorDimensao / maior;
  return {
    largura: Math.max(1, Math.round(largura * escala)),
    altura: Math.max(1, Math.round(altura * escala)),
  };
}

/** Bytes lidos do início do arquivo para achar as dimensões no cabeçalho. */
export const CABECALHO_IMAGEM_BYTES = 2_000_000;

function uint16(bytes: Uint8Array, i: number, littleEndian = false) {
  return littleEndian ? bytes[i] | (bytes[i + 1] << 8) : (bytes[i] << 8) | bytes[i + 1];
}

function uint24le(bytes: Uint8Array, i: number) {
  return bytes[i] | (bytes[i + 1] << 8) | (bytes[i + 2] << 16);
}

/**
 * Lê largura/altura do cabeçalho (JPEG SOF, PNG IHDR, WebP VP8/VP8L/VP8X)
 * sem decodificar pixels, para recusar resoluções excessivas antes de
 * `createImageBitmap` alocar a imagem inteira. Retorna null se não achar.
 */
export function lerDimensoesCabecalho(bytes: Uint8Array): Dimensoes | null {
  // PNG: assinatura + IHDR
  if (bytes.length >= 24 && bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[12] === 0x49 && bytes[13] === 0x48) {
    const largura = ((bytes[16] << 24) >>> 0) + (bytes[17] << 16) + (bytes[18] << 8) + bytes[19];
    const altura = ((bytes[20] << 24) >>> 0) + (bytes[21] << 16) + (bytes[22] << 8) + bytes[23];
    return { largura, altura };
  }
  // WebP: RIFF....WEBP + primeiro chunk
  if (bytes.length >= 30 && bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57 && bytes[9] === 0x45) {
    const chunk = String.fromCharCode(bytes[12], bytes[13], bytes[14], bytes[15]);
    if (chunk === "VP8X") return { largura: uint24le(bytes, 24) + 1, altura: uint24le(bytes, 27) + 1 };
    if (chunk === "VP8L" && bytes[20] === 0x2f) {
      const b = bytes.subarray(21, 25);
      return { largura: 1 + (b[0] | ((b[1] & 0x3f) << 8)), altura: 1 + (((b[1] >> 6) | (b[2] << 2) | ((b[3] & 0x0f) << 10))) };
    }
    if (chunk === "VP8 " && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      return { largura: uint16(bytes, 26, true) & 0x3fff, altura: uint16(bytes, 28, true) & 0x3fff };
    }
    return null;
  }
  // JPEG: percorre segmentos até um SOFn
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let i = 2;
    while (i + 9 < bytes.length) {
      if (bytes[i] !== 0xff) return null;
      const marcador = bytes[i + 1];
      if (marcador === 0xff) { i += 1; continue; }
      if (marcador === 0xd8 || marcador === 0x01 || (marcador >= 0xd0 && marcador <= 0xd7)) { i += 2; continue; }
      const tamanho = uint16(bytes, i + 2);
      const ehSof = marcador >= 0xc0 && marcador <= 0xcf && marcador !== 0xc4 && marcador !== 0xc8 && marcador !== 0xcc;
      if (ehSof) return { largura: uint16(bytes, i + 7), altura: uint16(bytes, i + 5) };
      if (marcador === 0xda || marcador === 0xd9 || tamanho < 2) return null;
      i += 2 + tamanho;
    }
  }
  return null;
}

export function nomeArquivoOtimizado(mimeType: FotoRecebimentoTipo) {
  const extensao = mimeType === "image/webp" ? "webp" : mimeType === "image/png" ? "png" : "jpg";
  return `foto-recebimento.${extensao}`;
}

/** Operações de navegador isoladas para permitir testes em Node. */
export type AmbienteImagem = {
  decodificar(file: File): Promise<{ largura: number; altura: number; fechar(): void; fonte: unknown }>;
  codificar(fonte: unknown, alvo: Dimensoes, mimeType: string, qualidade: number): Promise<Blob>;
};

export const ambienteNavegador: AmbienteImagem = {
  async decodificar(file) {
    if (typeof createImageBitmap !== "function") {
      throw new ImagemOtimizacaoError("Este navegador não consegue processar a imagem.");
    }
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    return { largura: bitmap.width, altura: bitmap.height, fonte: bitmap, fechar: () => bitmap.close() };
  },
  async codificar(fonte, alvo, mimeType, qualidade) {
    const canvas = document.createElement("canvas");
    canvas.width = alvo.largura;
    canvas.height = alvo.altura;
    try {
      const contexto = canvas.getContext("2d", { alpha: false });
      if (!contexto) throw new ImagemOtimizacaoError("Este navegador não consegue processar a imagem.");
      // Fundo branco: fotos não precisam de transparência e WebP/JPEG sem alpha ficam menores.
      contexto.fillStyle = "#ffffff";
      contexto.fillRect(0, 0, alvo.largura, alvo.altura);
      contexto.imageSmoothingEnabled = true;
      contexto.imageSmoothingQuality = "high";
      contexto.drawImage(fonte as ImageBitmap, 0, 0, alvo.largura, alvo.altura);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, mimeType, qualidade));
      if (!blob) throw new ImagemOtimizacaoError("Não foi possível gerar a imagem otimizada.");
      return blob;
    } finally {
      // Libera o buffer do canvas imediatamente (importante em aparelhos móveis).
      canvas.width = 0;
      canvas.height = 0;
    }
  },
};

async function recodificar(ambiente: AmbienteImagem, fonte: unknown, alvo: Dimensoes, opcoes: typeof OTIMIZACAO_FOTO_PADRAO) {
  let blob = await ambiente.codificar(fonte, alvo, "image/webp", opcoes.qualidade);
  if (blob.type !== "image/webp") {
    // O canvas devolve PNG quando não sabe codificar WebP: usa JPEG.
    return ambiente.codificar(fonte, alvo, "image/jpeg", opcoes.qualidadeJpeg);
  }
  if (blob.size > opcoes.tamanhoAlvoBytes) {
    const reduzido = await ambiente.codificar(fonte, alvo, "image/webp", opcoes.qualidadeReduzida);
    if (reduzido.type === "image/webp" && reduzido.size < blob.size) blob = reduzido;
  }
  return blob;
}

export async function otimizarImagem(
  file: File,
  opcoes: typeof OTIMIZACAO_FOTO_PADRAO = OTIMIZACAO_FOTO_PADRAO,
  ambiente: AmbienteImagem = ambienteNavegador,
): Promise<ImagemOtimizada> {
  const erroArquivo = validarFotoOriginal(file);
  if (erroArquivo) throw new ImagemOtimizacaoError(erroArquivo);

  // Valida a resolução pelo cabeçalho antes de alocar a imagem decodificada.
  const cabecalho = lerDimensoesCabecalho(new Uint8Array(await file.slice(0, CABECALHO_IMAGEM_BYTES).arrayBuffer()));
  if (!cabecalho) throw new ImagemOtimizacaoError("Não foi possível ler a imagem. O arquivo pode estar corrompido.");
  const erroCabecalho = validarDimensoesOriginais(cabecalho);
  if (erroCabecalho) throw new ImagemOtimizacaoError(erroCabecalho);

  let imagem: Awaited<ReturnType<AmbienteImagem["decodificar"]>>;
  try {
    imagem = await ambiente.decodificar(file);
  } catch (error) {
    if (error instanceof ImagemOtimizacaoError) throw error;
    throw new ImagemOtimizacaoError("Não foi possível ler a imagem. O arquivo pode estar corrompido.");
  }

  try {
    const original = { largura: imagem.largura, altura: imagem.altura };
    const erroDimensoes = validarDimensoesOriginais(original);
    if (erroDimensoes) throw new ImagemOtimizacaoError(erroDimensoes);

    const alvo = calcularDimensoesAlvo(original, opcoes.maiorDimensao);
    const blob = await recodificar(ambiente, imagem.fonte, alvo, opcoes);
    const mimeType = blob.type as FotoRecebimentoTipo;
    if (mimeType !== "image/webp" && mimeType !== "image/jpeg") {
      throw new ImagemOtimizacaoError("Não foi possível gerar a imagem otimizada.");
    }

    if (blob.size > FOTO_RECEBIMENTO_TAMANHO_MAXIMO_BYTES) {
      throw new ImagemOtimizacaoError("A imagem otimizada excede 4 MB.");
    }
    const otimizado = new File([blob], nomeArquivoOtimizado(mimeType), { type: mimeType, lastModified: Date.now() });
    return {
      file: otimizado, mimeType, tamanhoOriginal: file.size, tamanhoOtimizado: otimizado.size,
      original, final: alvo,
    };
  } catch (error) {
    if (error instanceof ImagemOtimizacaoError) throw error;
    throw new ImagemOtimizacaoError("Não foi possível otimizar a imagem. Tente outra foto.");
  } finally {
    imagem.fechar();
  }
}

export function formatarTamanhoArquivo(bytes: number) {
  if (bytes >= 1_000_000) return `${(bytes / 1_000_000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} MB`;
  return `${Math.max(1, Math.round(bytes / 1000)).toLocaleString("pt-BR")} KB`;
}
