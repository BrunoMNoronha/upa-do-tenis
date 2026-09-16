import { formatarTamanhoArquivo, type ImagemOtimizada } from "@/lib/imagem-otimizacao";

export function FotoOtimizadaResumo({ resultado }: { resultado: ImagemOtimizada }) {
  const { original, final } = resultado;
  return (
    <p className="text-xs text-slate-500">
      Otimizada para envio: {formatarTamanhoArquivo(resultado.tamanhoOriginal)} → {formatarTamanhoArquivo(resultado.tamanhoOtimizado)}
      {" "}({original.largura}×{original.altura} → {final.largura}×{final.altura}).
    </p>
  );
}
