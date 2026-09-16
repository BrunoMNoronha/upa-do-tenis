import { describe, expect, it, vi } from "vitest";

import {
  calcularDimensoesAlvo,
  deveManterOriginal,
  formatarTamanhoArquivo,
  ImagemOtimizacaoError,
  otimizarImagem,
  OTIMIZACAO_FOTO_PADRAO,
  validarDimensoesOriginais,
  validarFotoOriginal,
  type AmbienteImagem,
} from "./imagem-otimizacao";

function arquivo(tamanho: number, tipo = "image/jpeg") {
  return new File([new Uint8Array(tamanho)], "IMG_0001.jpg", { type: tipo });
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

  it("só mantém o original quando não redimensiona e ele já é menor", () => {
    expect(deveManterOriginal({ redimensionou: false, tamanhoOriginal: 100, tamanhoRecodificado: 200 })).toBe(true);
    expect(deveManterOriginal({ redimensionou: false, tamanhoOriginal: 300, tamanhoRecodificado: 200 })).toBe(false);
    expect(deveManterOriginal({ redimensionou: true, tamanhoOriginal: 100, tamanhoRecodificado: 200 })).toBe(false);
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
    expect(resultado.recodificada).toBe(true);
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

  it("mantém imagem pequena que já é menor que a recodificação, sem upscale", async () => {
    const { ambiente } = ambienteFalso({ largura: 800, altura: 600, tamanhos: { "image/webp@0.85": 180_000 } });
    const original = arquivo(150_000);

    const resultado = await otimizarImagem(original, OTIMIZACAO_FOTO_PADRAO, ambiente);

    expect(resultado.file).toBe(original);
    expect(resultado.recodificada).toBe(false);
    expect(resultado.final).toEqual({ largura: 800, altura: 600 });
  });

  it("recodifica imagem pequena quando isso reduz o arquivo, sem upscale", async () => {
    const { ambiente, codificar } = ambienteFalso({ largura: 900, altura: 700, tamanhos: { "image/webp@0.85": 90_000 } });

    const resultado = await otimizarImagem(arquivo(400_000, "image/png"), OTIMIZACAO_FOTO_PADRAO, ambiente);

    expect(resultado.recodificada).toBe(true);
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
