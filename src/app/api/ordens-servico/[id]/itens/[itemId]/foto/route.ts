import { randomUUID } from "node:crypto";

import { del, get, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { exigirSessaoApi } from "@/lib/auth-server";
import { FotoRecebimentoError, FOTO_RECEBIMENTO_TAMANHO_MAXIMO_BYTES, validarFotoRecebimento } from "@/lib/ordens-servico-foto";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({ id: z.string().min(1), itemId: z.string().min(1) });
type RouteProps = { params: Promise<{ id: string; itemId: string }> };

async function obterParams(props: RouteProps) {
  return paramsSchema.safeParse(await props.params);
}

async function buscarItem(id: string, itemId: string) {
  return prisma.itemOrdemServico.findFirst({
    where: { id: itemId, ordemServicoId: id },
    select: { id: true, ordemServicoId: true, fotoRecebimentoPathname: true, ordemServico: { select: { status: true } } },
  });
}

function respostaErro(error: unknown, operacao: string) {
  if (error instanceof FotoRecebimentoError) return NextResponse.json({ message: error.message }, { status: error.status });
  console.error(`Erro ao ${operacao} foto de recebimento do item da OS.`, error);
  return NextResponse.json({ message: `Não foi possível ${operacao} a foto do item.` }, { status: 500 });
}

export async function GET(req: NextRequest, props: RouteProps) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;
    const params = await obterParams(props);
    if (!params.success) return NextResponse.json({ message: "Parâmetros inválidos." }, { status: 400 });
    const item = await buscarItem(params.data.id, params.data.itemId);
    if (!item) return NextResponse.json({ message: "Item da OS não encontrado." }, { status: 404 });
    if (!item.fotoRecebimentoPathname) return NextResponse.json({ message: "Este item não possui foto de recebimento." }, { status: 404 });

    const resultado = await get(item.fotoRecebimentoPathname, { access: "private", ifNoneMatch: req.headers.get("if-none-match") ?? undefined });
    if (!resultado) return NextResponse.json({ message: "Foto de recebimento não encontrada." }, { status: 404 });
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

export async function POST(req: NextRequest, props: RouteProps) {
  let novoPathname: string | null = null;
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;
    const params = await obterParams(props);
    if (!params.success) return NextResponse.json({ message: "Parâmetros inválidos." }, { status: 400 });
    const item = await buscarItem(params.data.id, params.data.itemId);
    if (!item) return NextResponse.json({ message: "Item da OS não encontrado." }, { status: 404 });
    if (item.ordemServico.status !== "ABERTA") return NextResponse.json({ message: "A foto só pode ser alterada enquanto a OS estiver aberta." }, { status: 409 });

    const formData = await req.formData();
    const arquivo = formData.get("foto");
    if (!(arquivo instanceof File)) throw new FotoRecebimentoError("Envie a imagem no campo 'foto'.");
    const foto = await validarFotoRecebimento(arquivo);
    novoPathname = `ordens-servico/${params.data.id}/itens/${params.data.itemId}/${randomUUID()}.${foto.extensao}`;
    const blob = await put(novoPathname, Buffer.from(foto.bytes), {
      access: "private", contentType: foto.contentType, addRandomSuffix: false,
      maximumSizeInBytes: FOTO_RECEBIMENTO_TAMANHO_MAXIMO_BYTES, cacheControlMaxAge: 60 * 60 * 24 * 30,
    });
    novoPathname = blob.pathname;
    const atualizado = await prisma.itemOrdemServico.updateMany({
      where: { id: item.id, ordemServicoId: item.ordemServicoId, fotoRecebimentoPathname: item.fotoRecebimentoPathname, ordemServico: { status: "ABERTA" } },
      data: { fotoRecebimentoPathname: blob.pathname },
    });
    if (atualizado.count !== 1) {
      await del(blob.pathname).catch(() => undefined);
      novoPathname = null;
      return NextResponse.json({ message: "A OS ou a foto foi alterada por outro processo. Recarregue e tente novamente." }, { status: 409 });
    }
    novoPathname = null;
    if (item.fotoRecebimentoPathname) await del(item.fotoRecebimentoPathname).catch((error) => console.error("Foto anterior desvinculada, mas não removida do storage.", error));
    return NextResponse.json({ foto: true }, { status: 201 });
  } catch (error) {
    if (novoPathname) await del(novoPathname).catch(() => undefined);
    return respostaErro(error, "salvar");
  }
}

export async function DELETE(req: NextRequest, props: RouteProps) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;
    const params = await obterParams(props);
    if (!params.success) return NextResponse.json({ message: "Parâmetros inválidos." }, { status: 400 });
    const item = await buscarItem(params.data.id, params.data.itemId);
    if (!item) return NextResponse.json({ message: "Item da OS não encontrado." }, { status: 404 });
    if (item.ordemServico.status !== "ABERTA") return NextResponse.json({ message: "A foto só pode ser removida enquanto a OS estiver aberta." }, { status: 409 });
    if (!item.fotoRecebimentoPathname) return new NextResponse(null, { status: 204 });
    const atualizado = await prisma.itemOrdemServico.updateMany({
      where: { id: item.id, ordemServicoId: item.ordemServicoId, fotoRecebimentoPathname: item.fotoRecebimentoPathname, ordemServico: { status: "ABERTA" } },
      data: { fotoRecebimentoPathname: null },
    });
    if (atualizado.count !== 1) return NextResponse.json({ message: "A OS ou a foto foi alterada por outro processo. Recarregue e tente novamente." }, { status: 409 });
    await del(item.fotoRecebimentoPathname).catch((error) => console.error("Foto desvinculada, mas não removida do storage.", error));
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return respostaErro(error, "remover");
  }
}
