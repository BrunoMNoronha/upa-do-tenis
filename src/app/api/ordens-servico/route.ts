import { NextRequest, NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import { ordemServicoFormSchema } from "@/lib/ordens-servico-schema";

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = ordemServicoFormSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;

    // Generate a unique number
    const count = await prisma.ordemServico.count();
    const numeroStr = `OS-${String(count + 1001).padStart(4, "0")}`;

    const novaOS = await prisma.ordemServico.create({
      data: {
        numero: numeroStr,
        clienteId: data.clienteId,
        status: "ABERTA",
        dataEntrada: new Date(),
        dataPrevisao: new Date(`${data.prazoPrevisto}T12:00:00`),
        valorTotal: data.valorEstimado,
        observacoes: data.observacoes,
        itens: {
          create: {
            tipoItem: "CALCADO", // Default for now
            descricao: data.itemRecebido,
            valor: data.valorEstimado,
            servicos: data.servicoId ? {
              create: {
                servicoId: data.servicoId,
                valor: data.valorEstimado,
              }
            } : undefined
          }
        }
      },
    });

    return NextResponse.json(novaOS, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar ordem de serviço:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao criar a ordem de serviço." },
      { status: 500 }
    );
  }
}
