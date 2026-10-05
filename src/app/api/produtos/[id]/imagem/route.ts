import { del, get, put } from "@vercel/blob";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { exigirSessaoApi } from "@/lib/auth-server";
import { FotoRecebimentoError, FOTO_RECEBIMENTO_TAMANHO_MAXIMO_BYTES, validarFotoRecebimento } from "@/lib/ordens-servico-foto";
import { ImagemProdutoError, montarPathnameImagemProduto, pathnamePertenceAoProduto } from "@/lib/produtos-imagem";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({ id: z.string().min(1) });
type RouteProps = { params: Promise<{ id: string }> };

async function buscarProduto(props: RouteProps) {
  const params = paramsSchema.safeParse(await props.params);
  if (!params.success) throw new ImagemProdutoError("Parâmetros inválidos.");
  const produto = await prisma.produto.findUnique({
    where: { id: params.data.id },
    select: { id: true, imagemPathname: true },
  });
  if (!produto) throw new ImagemProdutoError("Produto não encontrado.", 404);
  return produto;
}

function respostaErro(error: unknown, operacao: string) {
  if (error instanceof ImagemProdutoError || error instanceof FotoRecebimentoError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  console.error(`Erro ao ${operacao} imagem do produto.`, error);
  return NextResponse.json({ message: `Não foi possível ${operacao} a imagem do produto.` }, { status: 500 });
}

async function removerBlobAnterior(pathname: string, produtoId: string) {
  if (!pathnamePertenceAoProduto(pathname, produtoId)) return;
  await del(pathname).catch((error) => console.error("Imagem anterior desvinculada, mas não removida do storage.", error));
}

export async function GET(req: NextRequest, props: RouteProps) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;
    const produto = await buscarProduto(props);
    if (!produto.imagemPathname) return NextResponse.json({ message: "Este produto não possui imagem." }, { status: 404 });

    const resultado = await get(produto.imagemPathname, { access: "private", ifNoneMatch: req.headers.get("if-none-match") ?? undefined });
    if (!resultado) return NextResponse.json({ message: "Arquivo da imagem não encontrado." }, { status: 404 });
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
    const produto = await buscarProduto(props);

    const formData = await req.formData();
    const arquivo = formData.get("imagem");
    if (!(arquivo instanceof File)) throw new ImagemProdutoError("Envie a imagem no campo 'imagem'.");
    const imagem = await validarFotoRecebimento(arquivo);

    novoPathname = montarPathnameImagemProduto(produto.id, imagem.extensao);
    const blob = await put(novoPathname, Buffer.from(imagem.bytes), {
      access: "private", contentType: imagem.contentType, addRandomSuffix: false,
      maximumSizeInBytes: FOTO_RECEBIMENTO_TAMANHO_MAXIMO_BYTES, cacheControlMaxAge: 60 * 60 * 24 * 30,
    });
    novoPathname = blob.pathname;

    // Troca otimista: se outra aba trocou a imagem no meio, nada é sobrescrito.
    const atualizado = await prisma.produto.updateMany({
      where: { id: produto.id, imagemPathname: produto.imagemPathname },
      data: { imagemPathname: blob.pathname },
    });
    if (atualizado.count !== 1) {
      await del(blob.pathname).catch(() => undefined);
      novoPathname = null;
      return NextResponse.json({ message: "A imagem do produto foi alterada por outro processo. Recarregue e tente novamente." }, { status: 409 });
    }
    novoPathname = null;
    if (produto.imagemPathname) await removerBlobAnterior(produto.imagemPathname, produto.id);
    return NextResponse.json({ imagem: true }, { status: 201 });
  } catch (error) {
    if (novoPathname) await del(novoPathname).catch(() => undefined);
    return respostaErro(error, "salvar");
  }
}

export async function DELETE(req: NextRequest, props: RouteProps) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;
    const produto = await buscarProduto(props);
    if (!produto.imagemPathname) return new NextResponse(null, { status: 204 });

    const atualizado = await prisma.produto.updateMany({
      where: { id: produto.id, imagemPathname: produto.imagemPathname },
      data: { imagemPathname: null },
    });
    if (atualizado.count !== 1) {
      return NextResponse.json({ message: "A imagem do produto foi alterada por outro processo. Recarregue e tente novamente." }, { status: 409 });
    }
    await removerBlobAnterior(produto.imagemPathname, produto.id);
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    return respostaErro(error, "remover");
  }
}
