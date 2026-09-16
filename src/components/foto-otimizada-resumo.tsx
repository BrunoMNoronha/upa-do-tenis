import { formatarTamanhoArquivo, type ImagemOtimizada } from "@/lib/imagem-otimizacao";

export function FotoOtimizadaResumo({ resultado }: { resultado: ImagemOtimizada }) {
  const { original, final } = resultado;
  if (!resultado.recodificada) {
    return <p className="text-xs text-slate-500">Imagem já otimizada: {formatarTamanhoArquivo(resultado.tamanhoOtimizado)} ({final.largura}×{final.altura}).</p>;
  }
  return (
    <p className="text-xs text-slate-500">
      Otimizada para envio: {formatarTamanhoArquivo(resultado.tamanhoOriginal)} → {formatarTamanhoArquivo(resultado.tamanhoOtimizado)}
      {" "}({original.largura}×{original.altura} → {final.largura}×{final.altura}).
    </p>
  );
}
