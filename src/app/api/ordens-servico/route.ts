import { NextRequest, NextResponse } from "next/server";
import { ordemServicoFormSchema } from "@/lib/ordens-servico-schema";
import { prisma } from "@/lib/prisma";
import { calcularResumoFinanceiroOS } from "@/lib/ordens-servico-financeiro";

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

    // Generate a unique number OS-DDMMAAAA-XXXX
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const aaaa = now.getFullYear();
    const numeroStr = `OS-${dd}${mm}${aaaa}-${data.numeroSufixo}`;

    const existingOs = await prisma.ordemServico.findUnique({
      where: { numero: numeroStr },
    });

    if (existingOs) {
      return NextResponse.json(
        { message: `Já existe uma Ordem de Serviço com o número ${numeroStr}.` },
        { status: 409 }
      );
    }

    const resumoFinanceiro = calcularResumoFinanceiroOS({
      statusOperacional: "ABERTA",
      valorTotal: data.valorEstimado,
      valorDesconto: 0,
      valorSinal: 0,
      valorPago: 0,
      pagamentos: [],
      itens: [],
    });

    const novaOS = await prisma.ordemServico.create({
      data: {
        numero: numeroStr,
        clienteId: data.clienteId,
        status: "ABERTA",
        dataEntrada: new Date(),
        dataPrevisao: new Date(`${data.prazoPrevisto}T12:00:00`),
        valorTotal: resumoFinanceiro.valorTotal,
        valorDesconto: resumoFinanceiro.valorDesconto,
        valorSinal: resumoFinanceiro.valorSinal,
        valorPago: resumoFinanceiro.valorPago,
        saldo: resumoFinanceiro.saldo,
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
