import { del, get } from "@vercel/blob";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { exigirSessaoApi } from "@/lib/auth-server";
import { FotoItemOrdemError } from "@/lib/ordens-servico-fotos";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({ id: z.string().min(1), itemId: z.string().min(1), fotoId: z.string().min(1) });
type RouteProps = { params: Promise<{ id: string; itemId: string; fotoId: string }> };

async function buscarFoto(props: RouteProps) {
  const params = paramsSchema.safeParse(await props.params);
  if (!params.success) throw new FotoItemOrdemError("Parâmetros inválidos.");
  const foto = await prisma.fotoItemOrdem.findFirst({
    where: {
      id: params.data.fotoId,
      itemOrdemServicoId: params.data.itemId,
      itemOrdemServico: { ordemServicoId: params.data.id },
    },
    select: {
      id: true,
      itemOrdemServicoId: true,
      pathname: true,
      criadoEm: true,
      itemOrdemServico: { select: { ordemServico: { select: { status: true } } } },
    },
  });
  if (!foto) throw new FotoItemOrdemError("Foto do item não encontrada.", 404);
  return foto;
}

function respostaErro(error: unknown, operacao: string) {
  if (error instanceof FotoItemOrdemError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  console.error(`Erro ao ${operacao} foto da galeria do item da OS.`, error);
  return NextResponse.json({ message: `Não foi possível ${operacao} a foto do item.` }, { status: 500 });
}

async function removerBlobSeSemReferencia(pathname: string) {
  try {
    const [fotos, itensLegados] = await Promise.all([
      prisma.fotoItemOrdem.count({ where: { pathname } }),
      prisma.itemOrdemServico.count({ where: { fotoRecebimentoPathname: pathname } }),
    ]);
    if (fotos === 0 && itensLegados === 0) await del(pathname);
  } catch (error) {
    console.error("Foto desvinculada, mas não foi possível confirmar sua remoção do storage.", error);
  }
}

export async function GET(req: NextRequest, props: RouteProps) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;
    const foto = await buscarFoto(props);
    const resultado = await get(foto.pathname, {
      access: "private",
      ifNoneMatch: req.headers.get("if-none-match") ?? undefined,
    });
    if (!resultado) return NextResponse.json({ message: "Arquivo da foto não encontrado." }, { status: 404 });
    if (resultado.statusCode === 304) {
      return new NextResponse(null, { status: 304, headers: { ETag: resultado.blob.etag, "Cache-Control": "private, no-cache" } });
    }
    return new NextResponse(resultado.stream, { headers: {
      "Content-Type": resultado.blob.contentType,
      "Content-Length": String(resultado.blob.size),
      "Content-Disposition": "inline",
      "X-Content-Type-Options": "nosniff",
      ETag: resultado.blob.etag,
      "Cache-Control": "private, no-cache",
    } });
  } catch (error) {
    return respostaErro(error, "carregar");
  }
}

export async function DELETE(req: NextRequest, props: RouteProps) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;
    const foto = await buscarFoto(props);
    if (foto.itemOrdemServico.ordemServico.status !== "ABERTA") {
      throw new FotoItemOrdemError("Fotos só podem ser removidas enquanto a OS estiver aberta.", 409);
    }
    await prisma.$transaction(async (tx) => {
      const removida = await tx.fotoItemOrdem.deleteMany({
        where: {
          id: foto.id,
          itemOrdemServicoId: foto.itemOrdemServicoId,
          itemOrdemServico: { ordemServico: { status: "ABERTA" } },
        },
      });
      if (removida.count !== 1) throw new FotoItemOrdemError("A OS ou a galeria foi alterada. Recarregue e tente novamente.", 409);
      await tx.itemOrdemServico.updateMany({
        where: {
          id: foto.itemOrdemServicoId,
          fotoRecebimentoPathname: foto.pathname,
          ordemServico: { status: "ABERTA" },
        },
        data: { fotoRecebimentoPathname: null },
      });
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    await removerBlobSeSemReferencia(foto.pathname);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return respostaErro(error, "remover");
  }
}
