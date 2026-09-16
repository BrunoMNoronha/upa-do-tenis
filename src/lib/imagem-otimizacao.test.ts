import { describe, expect, it, vi } from "vitest";

import {
  calcularDimensoesAlvo,
  formatarTamanhoArquivo,
  ImagemOtimizacaoError,
  lerDimensoesCabecalho,
  otimizarImagem,
  OTIMIZACAO_FOTO_PADRAO,
  validarDimensoesOriginais,
  validarFotoOriginal,
  type AmbienteImagem,
} from "./imagem-otimizacao";

function cabecalhoPng(largura: number, altura: number) {
  const bytes = new Uint8Array(24);
  bytes.set([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52]);
  new DataView(bytes.buffer).setUint32(16, largura);
  new DataView(bytes.buffer).setUint32(20, altura);
  return bytes;
}

function cabecalhoJpeg(largura: number, altura: number) {
  const app1 = [0xff, 0xe1, 0x00, 0x08, 0x45, 0x78, 0x69, 0x66, 0, 0];
  const sof = [0xff, 0xc0, 0x00, 0x11, 0x08, altura >> 8, altura & 255, largura >> 8, largura & 255, 3];
  return Uint8Array.from([0xff, 0xd8, ...app1, ...sof, ...new Array(12).fill(0)]);
}

/** Arquivo com cabeçalho real (dimensões) completado com zeros até o tamanho desejado. */
function arquivo(tamanho: number, tipo = "image/jpeg", dimensoes = { largura: 4000, altura: 3000 }) {
  const bytes = new Uint8Array(tamanho);
  if (tamanho > 0) bytes.set(cabecalhoJpeg(dimensoes.largura, dimensoes.altura).subarray(0, tamanho));
  return new File([bytes], "IMG_0001.jpg", { type: tipo });
}

function ambienteFalso(params: {
  largura: number;
  altura: number;
  tamanhos?: Record<string, number>;
  tipoWebp?: string;
  falhaDecodificar?: boolean;
}) {
  const fechar = vi.fn();
  const codificar = vi.fn(async (_fonte: unknown, _alvo: unknown, mimeType: string, qualidade: number) => {
    const tipo = mimeType === "image/webp" ? (params.tipoWebp ?? "image/webp") : mimeType;
    const tamanho = params.tamanhos?.[`${tipo}@${qualidade}`] ?? 300_000;
    return new Blob([new Uint8Array(tamanho)], { type: tipo });
  });
  const ambiente: AmbienteImagem = {
    decodificar: vi.fn(async () => {
      if (params.falhaDecodificar) throw new DOMException("The source image could not be decoded.", "InvalidStateError");
      return { largura: params.largura, altura: params.altura, fonte: {}, fechar };
    }),
    codificar,
  };
  return { ambiente, fechar, codificar };
}

describe("calcularDimensoesAlvo", () => {
  it("reduz paisagem 4000×3000 para 1600×1200", () => {
    expect(calcularDimensoesAlvo({ largura: 4000, altura: 3000 }, 1600)).toEqual({ largura: 1600, altura: 1200 });
  });

  it("reduz retrato 3000×4000 para 1200×1600", () => {
    expect(calcularDimensoesAlvo({ largura: 3000, altura: 4000 }, 1600)).toEqual({ largura: 1200, altura: 1600 });
  });

  it("não faz upscale de imagem pequena", () => {
    expect(calcularDimensoesAlvo({ largura: 800, altura: 600 }, 1600)).toEqual({ largura: 800, altura: 600 });
    expect(calcularDimensoesAlvo({ largura: 1600, altura: 900 }, 1600)).toEqual({ largura: 1600, altura: 900 });
  });

  it("preserva a proporção em dimensões não redondas", () => {
    const original = { largura: 4032, altura: 3024 };
    const alvo = calcularDimensoesAlvo(original, 1600);
    expect(alvo).toEqual({ largura: 1600, altura: 1200 });
    const panorama = calcularDimensoesAlvo({ largura: 9000, altura: 1234 }, 1600);
    expect(panorama.largura).toBe(1600);
    const proporcao = 9000 / 1234;
    expect(Math.abs(panorama.largura / panorama.altura - proporcao) / proporcao).toBeLessThan(0.005);
  });
});

describe("validações", () => {
  it("rejeita arquivo ausente, vazio, MIME não permitido e acima do limite", () => {
    expect(validarFotoOriginal(null)).toMatch(/Selecione/);
    expect(validarFotoOriginal(arquivo(0))).toMatch(/não vazia/);
    expect(validarFotoOriginal(arquivo(10, "application/pdf"))).toMatch(/Formato inválido/);
    expect(validarFotoOriginal(arquivo(10, "image/heic"))).toMatch(/Formato inválido/);
    expect(validarFotoOriginal(arquivo(25_000_001))).toMatch(/25 MB/);
    expect(validarFotoOriginal(arquivo(5_000_000))).toBeNull();
  });

  it("rejeita dimensões inválidas ou grandes demais para a memória", () => {
    expect(validarDimensoesOriginais({ largura: 0, altura: 100 })).toMatch(/dimensões/);
    expect(validarDimensoesOriginais({ largura: 10_000, altura: 8_000 })).toMatch(/resolução/);
    expect(validarDimensoesOriginais({ largura: 8000, altura: 6000 })).toBeNull();
  });

  it("lê dimensões do cabeçalho JPEG (após APP1), PNG e WebP sem decodificar", () => {
    expect(lerDimensoesCabecalho(cabecalhoJpeg(4032, 3024))).toEqual({ largura: 4032, altura: 3024 });
    expect(lerDimensoesCabecalho(cabecalhoPng(800, 600))).toEqual({ largura: 800, altura: 600 });
    const vp8x = new Uint8Array(30);
    vp8x.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x58]);
    vp8x.set([0x3f, 0x06, 0x00, 0xaf, 0x04, 0x00], 24); // 1600 × 1200 (valores - 1)
    expect(lerDimensoesCabecalho(vp8x)).toEqual({ largura: 1600, altura: 1200 });
    const riff = (chunk: string) => Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50, ...[...chunk].map((c) => c.charCodeAt(0))]);
    const vp8 = new Uint8Array(30);
    vp8.set(riff("VP8 "));
    vp8.set([0x9d, 0x01, 0x2a, 0x40, 0x06, 0xb0, 0x04], 23); // 1600 × 1200 (LE, 14 bits)
    expect(lerDimensoesCabecalho(vp8)).toEqual({ largura: 1600, altura: 1200 });
    const vp8l = new Uint8Array(30);
    vp8l.set(riff("VP8L"));
    const bits = (1600 - 1) + (1200 - 1) * 2 ** 14;
    vp8l.set([0x2f, bits & 255, (bits >> 8) & 255, (bits >> 16) & 255, (bits >> 24) & 255], 20);
    expect(lerDimensoesCabecalho(vp8l)).toEqual({ largura: 1600, altura: 1200 });
    expect(lerDimensoesCabecalho(Uint8Array.from([1, 2, 3, 4]))).toBeNull();
    expect(lerDimensoesCabecalho(Uint8Array.from([0xff, 0xd8, 0xff, 0xda, 0, 4, 0, 0, 0, 0, 0, 0]))).toBeNull();
  });

  it("formata tamanhos em pt-BR", () => {
    expect(formatarTamanhoArquivo(4_820_000)).toBe("4,8 MB");
    expect(formatarTamanhoArquivo(347_400)).toBe("347 KB");
  });
});

describe("otimizarImagem", () => {
  it("redimensiona e converte foto grande para WebP, liberando o bitmap", async () => {
    const { ambiente, fechar, codificar } = ambienteFalso({ largura: 4000, altura: 3000 });

    const resultado = await otimizarImagem(arquivo(4_800_000), OTIMIZACAO_FOTO_PADRAO, ambiente);

    expect(resultado.mimeType).toBe("image/webp");
    expect(resultado.file.type).toBe("image/webp");
    expect(resultado.file.name).toBe("foto-recebimento.webp");
    expect(resultado.final).toEqual({ largura: 1600, altura: 1200 });
    expect(resultado.tamanhoOriginal).toBe(4_800_000);
    expect(resultado.tamanhoOtimizado).toBe(300_000);
    expect(codificar).toHaveBeenCalledWith(expect.anything(), { largura: 1600, altura: 1200 }, "image/webp", 0.85);
    expect(fechar).toHaveBeenCalledOnce();
  });

  it("usa JPEG quando o navegador não codifica WebP no canvas", async () => {
    const { ambiente } = ambienteFalso({ largura: 3000, altura: 4000, tipoWebp: "image/png" });

    const resultado = await otimizarImagem(arquivo(3_500_000), OTIMIZACAO_FOTO_PADRAO, ambiente);

    expect(resultado.mimeType).toBe("image/jpeg");
    expect(resultado.file.name).toBe("foto-recebimento.jpg");
    expect(resultado.final).toEqual({ largura: 1200, altura: 1600 });
  });

  it("faz uma única segunda passada quando o WebP fica acima do tamanho-alvo", async () => {
    const { ambiente, codificar } = ambienteFalso({
      largura: 4000, altura: 3000,
      tamanhos: { "image/webp@0.85": 900_000, "image/webp@0.75": 650_000 },
    });

    const resultado = await otimizarImagem(arquivo(6_000_000), OTIMIZACAO_FOTO_PADRAO, ambiente);

    expect(codificar).toHaveBeenCalledTimes(2);
    expect(resultado.tamanhoOtimizado).toBe(650_000);
  });

  it("recodifica imagem pequena mesmo se o original for menor, para não enviar EXIF", async () => {
    const { ambiente } = ambienteFalso({ largura: 800, altura: 600, tamanhos: { "image/webp@0.85": 180_000 } });
    const original = arquivo(150_000, "image/jpeg", { largura: 800, altura: 600 });

    const resultado = await otimizarImagem(original, OTIMIZACAO_FOTO_PADRAO, ambiente);

    expect(resultado.file).not.toBe(original);
    expect(resultado.file.type).toBe("image/webp");
    expect(resultado.final).toEqual({ largura: 800, altura: 600 });
  });

  it("recusa resolução excessiva pelo cabeçalho sem decodificar a imagem", async () => {
    const { ambiente } = ambienteFalso({ largura: 12_000, altura: 9_000 });

    await expect(
      otimizarImagem(arquivo(5_000, "image/jpeg", { largura: 12_000, altura: 9_000 }), OTIMIZACAO_FOTO_PADRAO, ambiente),
    ).rejects.toThrow(/resolução/);
    expect(ambiente.decodificar).not.toHaveBeenCalled();
  });

  it("recusa arquivo sem cabeçalho de imagem reconhecível sem decodificar", async () => {
    const { ambiente } = ambienteFalso({ largura: 10, altura: 10 });
    const falso = new File([new Uint8Array(1000)], "falsa.jpg", { type: "image/jpeg" });

    await expect(otimizarImagem(falso, OTIMIZACAO_FOTO_PADRAO, ambiente)).rejects.toThrow(/corrompido/);
    expect(ambiente.decodificar).not.toHaveBeenCalled();
  });

  it("recodifica imagem pequena quando isso reduz o arquivo, sem upscale", async () => {
    const { ambiente, codificar } = ambienteFalso({ largura: 900, altura: 700, tamanhos: { "image/webp@0.85": 90_000 } });

    const resultado = await otimizarImagem(arquivo(400_000, "image/png", { largura: 900, altura: 700 }), OTIMIZACAO_FOTO_PADRAO, ambiente);

    expect(resultado.tamanhoOtimizado).toBe(90_000);
    expect(codificar).toHaveBeenCalledWith(expect.anything(), { largura: 900, altura: 700 }, "image/webp", 0.85);
  });

  it("rejeita MIME não permitido sem decodificar", async () => {
    const { ambiente } = ambienteFalso({ largura: 10, altura: 10 });

    await expect(otimizarImagem(arquivo(100, "application/pdf"), OTIMIZACAO_FOTO_PADRAO, ambiente)).rejects.toThrow(ImagemOtimizacaoError);
    expect(ambiente.decodificar).not.toHaveBeenCalled();
  });

  it("converte erro de decodificação em mensagem compreensível", async () => {
    const { ambiente } = ambienteFalso({ largura: 10, altura: 10, falhaDecodificar: true });

    await expect(otimizarImagem(arquivo(100), OTIMIZACAO_FOTO_PADRAO, ambiente)).rejects.toThrow(/corrompido/);
  });

  it("libera o bitmap quando as dimensões são inválidas", async () => {
    const { ambiente, fechar, codificar } = ambienteFalso({ largura: 12_000, altura: 9_000 });

    await expect(otimizarImagem(arquivo(100), OTIMIZACAO_FOTO_PADRAO, ambiente)).rejects.toThrow(/resolução/);
    expect(codificar).not.toHaveBeenCalled();
    expect(fechar).toHaveBeenCalledOnce();
  });

  it("libera o bitmap e padroniza a mensagem quando a codificação falha", async () => {
    const { ambiente, fechar } = ambienteFalso({ largura: 4000, altura: 3000 });
    ambiente.codificar = vi.fn(async () => { throw new Error("canvas perdido"); });

    await expect(otimizarImagem(arquivo(100), OTIMIZACAO_FOTO_PADRAO, ambiente)).rejects.toThrow(/Não foi possível otimizar/);
    expect(fechar).toHaveBeenCalledOnce();
  });
});
