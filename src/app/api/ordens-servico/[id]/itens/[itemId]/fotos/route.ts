import { del, put } from "@vercel/blob";
import { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { exigirSessaoApi } from "@/lib/auth-server";
import { FotoRecebimentoError, FOTO_RECEBIMENTO_TAMANHO_MAXIMO_BYTES, validarFotoRecebimento } from "@/lib/ordens-servico-foto";
import {
  chaveIdempotenciaFotoSchema,
  FotoItemOrdemError,
  LIMITE_FOTOS_POR_ITEM,
  montarPathnameFotoItem,
} from "@/lib/ordens-servico-fotos";
import { prisma } from "@/lib/prisma";

const paramsSchema = z.object({ id: z.string().min(1), itemId: z.string().min(1) });
type RouteProps = { params: Promise<{ id: string; itemId: string }> };

async function obterContexto(props: RouteProps) {
  const params = paramsSchema.safeParse(await props.params);
  if (!params.success) throw new FotoItemOrdemError("Parâmetros inválidos.");

  const item = await prisma.itemOrdemServico.findFirst({
    where: { id: params.data.itemId, ordemServicoId: params.data.id },
    select: { id: true, ordemServicoId: true, ordemServico: { select: { status: true } } },
  });
  if (!item) throw new FotoItemOrdemError("Item da OS não encontrado.", 404);
  return { params: params.data, item };
}

function respostaErro(error: unknown, operacao: string) {
  if (error instanceof FotoRecebimentoError || error instanceof FotoItemOrdemError) {
    return NextResponse.json({ message: error.message }, { status: error.status });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034") {
    return NextResponse.json({ message: "Outro upload alterou a galeria. Tente novamente." }, { status: 409 });
  }
  console.error(`Erro ao ${operacao} galeria de fotos do item da OS.`, error);
  return NextResponse.json({ message: `Não foi possível ${operacao} as fotos do item.` }, { status: 500 });
}

async function compensarBlobSemRegistro(pathname: string) {
  try {
    const persistida = await prisma.fotoItemOrdem.findUnique({
      where: { pathname },
      select: { id: true, itemOrdemServicoId: true },
    });
    if (!persistida) await del(pathname);
  } catch (error) {
    console.error("Não foi possível confirmar a compensação do Blob da foto.", error);
  }
}

export async function GET(req: NextRequest, props: RouteProps) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;
    const { item } = await obterContexto(props);
    const fotos = await prisma.fotoItemOrdem.findMany({
      where: { itemOrdemServicoId: item.id },
      orderBy: [{ criadoEm: "asc" }, { id: "asc" }],
      select: { id: true, criadoEm: true },
    });
    return NextResponse.json({ fotos });
  } catch (error) {
    return respostaErro(error, "carregar");
  }
}

export async function POST(req: NextRequest, props: RouteProps) {
  let pathnameNovo: string | null = null;
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;
    const { params, item } = await obterContexto(props);
    if (item.ordemServico.status !== "ABERTA") {
      throw new FotoItemOrdemError("Fotos só podem ser adicionadas enquanto a OS estiver aberta.", 409);
    }

    const formData = await req.formData();
    const arquivo = formData.get("foto");
    if (!(arquivo instanceof File)) throw new FotoRecebimentoError("Envie a imagem no campo 'foto'.");
    const chave = chaveIdempotenciaFotoSchema.safeParse(formData.get("chaveIdempotencia"));
    if (!chave.success) throw new FotoItemOrdemError("Chave de idempotência inválida.");
    const foto = await validarFotoRecebimento(arquivo);
    pathnameNovo = montarPathnameFotoItem({
      ordemServicoId: params.id,
      itemId: params.itemId,
      chaveIdempotencia: chave.data,
      extensao: foto.extensao,
    });

    const existente = await prisma.fotoItemOrdem.findUnique({
      where: { pathname: pathnameNovo },
      select: { id: true, itemOrdemServicoId: true, criadoEm: true },
    });
    if (existente) {
      if (existente.itemOrdemServicoId !== item.id) throw new FotoItemOrdemError("Chave de foto já utilizada.", 409);
      pathnameNovo = null;
      return NextResponse.json({ foto: { id: existente.id, criadoEm: existente.criadoEm }, repetida: true });
    }

    const blob = await put(pathnameNovo, Buffer.from(foto.bytes), {
      access: "private",
      contentType: foto.contentType,
      addRandomSuffix: false,
      maximumSizeInBytes: FOTO_RECEBIMENTO_TAMANHO_MAXIMO_BYTES,
      cacheControlMaxAge: 60 * 60 * 24 * 30,
    });
    pathnameNovo = blob.pathname;

    const resultado = await prisma.$transaction(async (tx) => {
      const repetida = await tx.fotoItemOrdem.findUnique({
        where: { pathname: blob.pathname },
        select: { id: true, itemOrdemServicoId: true, criadoEm: true },
      });
      if (repetida) {
        if (repetida.itemOrdemServicoId !== item.id) throw new FotoItemOrdemError("Chave de foto já utilizada.", 409);
        return { foto: { id: repetida.id, criadoEm: repetida.criadoEm }, repetida: true };
      }

      const quantidade = await tx.fotoItemOrdem.count({ where: { itemOrdemServicoId: item.id } });
      if (quantidade >= LIMITE_FOTOS_POR_ITEM) {
        throw new FotoItemOrdemError(`Cada item aceita no máximo ${LIMITE_FOTOS_POR_ITEM} fotos.`, 409);
      }
      const criada = await tx.fotoItemOrdem.create({
        data: { itemOrdemServicoId: item.id, pathname: blob.pathname },
        select: { id: true, criadoEm: true },
      });
      return { foto: criada, repetida: false };
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

    pathnameNovo = null;
    return NextResponse.json(resultado, { status: resultado.repetida ? 200 : 201 });
  } catch (error) {
    if (pathnameNovo) await compensarBlobSemRegistro(pathnameNovo);
    return respostaErro(error, "salvar");
  }
}
