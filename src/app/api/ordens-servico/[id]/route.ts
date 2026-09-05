import { NextRequest, NextResponse } from "next/server";
import { exigirSessaoApi } from "@/lib/auth-server";
import { prisma } from "@/lib/prisma";

import { ordemServicoIdParamsSchema } from "@/lib/ordens-servico-schema";
import {
  obterDetalheOrdemServico,
  OrdemServicoDetalheError,
} from "@/lib/ordens-servico";
import { calcularResumoFinanceiroOS } from "@/lib/ordens-servico-financeiro";
import { ordemServicoServicosAtualizarSchema } from "@/lib/ordens-servico-schema";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const parsedParams = ordemServicoIdParamsSchema.safeParse(params);

    if (!parsedParams.success) {
      return NextResponse.json(
        {
          message: "Parâmetros inválidos.",
          errors: parsedParams.error.flatten(),
        },
        { status: 400 },
      );
    }

    const ordemServico = await obterDetalheOrdemServico(parsedParams.data.id);

    return NextResponse.json({ ordemServico });
  } catch (error) {
    if (error instanceof OrdemServicoDetalheError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error("Erro ao buscar detalhe da OS:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao buscar o detalhe da OS." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const parsedParams = ordemServicoIdParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json({ message: "Parâmetros inválidos." }, { status: 400 });
    }

    const osId = parsedParams.data.id;

    const countPagamentos = await prisma.pagamento.count({ where: { ordemServicoId: osId } });
    const countMovEstoque = await prisma.movimentacaoEstoqueInsumo.count({ where: { ordemServicoId: osId } });
    const countMovCaixa = await prisma.movimentacaoCaixa.count({ where: { ordemServicoId: osId } });

    const countHistory = await prisma.historicoStatus.count({
      where: {
        ordemServicoId: osId,
        statusAnterior: { not: null }
      }
    });

    if (countPagamentos > 0 || countMovEstoque > 0 || countMovCaixa > 0 || countHistory > 0) {
      return NextResponse.json(
        { message: "Esta ordem de serviço não pode ser excluída fisicamente pois possui histórico, pagamentos ou movimentações vinculadas." },
        { status: 409 }
      );
    }

    await prisma.ordemServico.delete({
      where: { id: osId }
    });

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Erro ao excluir OS:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao excluir a OS." },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const parsedParams = ordemServicoIdParamsSchema.safeParse(params);
    if (!parsedParams.success) {
      return NextResponse.json({ message: "Parâmetros inválidos." }, { status: 400 });
    }

    const result = ordemServicoServicosAtualizarSchema.safeParse(await req.json());
    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 },
      );
    }

    const { itemOrdemServicoId, servicos } = result.data;
    const ids = servicos.map((servico) => servico.servicoId);
    if (new Set(ids).size !== ids.length) {
      return NextResponse.json({ message: "Não é possível repetir o mesmo serviço na OS." }, { status: 400 });
    }

    const atualizado = await prisma.$transaction(async (tx) => {
      const item = await tx.itemOrdemServico.findFirst({
        where: { id: itemOrdemServicoId, ordemServicoId: parsedParams.data.id },
        select: { id: true, servicos: { select: { servicoId: true } } },
      });

      if (!item) {
        throw new OrdemServicoDetalheError("Item da OS não encontrado.", 404);
      }

      const servicosDisponiveis = await tx.servico.findMany({
        where: { id: { in: ids } },
        select: { id: true, ativo: true },
      });

      if (servicosDisponiveis.length !== ids.length) {
        throw new OrdemServicoDetalheError("Um ou mais serviços informados não foram encontrados.", 400);
      }

      const servicosJaVinculados = new Set(item.servicos.map((servico) => servico.servicoId));
      if (servicosDisponiveis.some((servico) => !servico.ativo && !servicosJaVinculados.has(servico.id))) {
        throw new OrdemServicoDetalheError("Serviços inativos não podem ser adicionados à OS.", 400);
      }

      await tx.servicoItemOrdem.deleteMany({ where: { itemOrdemServicoId: item.id } });
      if (servicos.length > 0) {
        await tx.servicoItemOrdem.createMany({
          data: servicos.map((servico) => ({
            itemOrdemServicoId: item.id,
            servicoId: servico.servicoId,
            valor: servico.valor,
          })),
        });
      }

      const valorTotalItem = servicos.reduce((total, servico) => total + servico.valor, 0);
      await tx.itemOrdemServico.update({
        where: { id: item.id },
        data: { valor: valorTotalItem },
      });

      const ordem = await tx.ordemServico.findUnique({
        where: { id: parsedParams.data.id },
        include: { pagamentos: true, itens: { include: { servicos: true } } },
      });

      if (!ordem) {
        throw new OrdemServicoDetalheError("Ordem de serviço não encontrada.", 404);
      }

      const novoTotal = ordem.itens.reduce((total, itemAtual) => {
        const totalServicos = itemAtual.servicos.reduce((subtotal, servico) => subtotal + Number(servico.valor), 0);
        return total + (itemAtual.servicos.length > 0 ? totalServicos : Number(itemAtual.valor));
      }, 0);
      const resumo = calcularResumoFinanceiroOS({
        statusOperacional: ordem.status,
        valorTotal: novoTotal,
        valorDesconto: ordem.valorDesconto,
        valorSinal: ordem.valorSinal,
        valorPago: ordem.valorPago,
        pagamentos: ordem.pagamentos,
        itens: ordem.itens,
      });

      if (resumo.valorTotal < resumo.valorPago) {
        throw new OrdemServicoDetalheError(
          "Não é possível reduzir o total da OS abaixo do valor já pago.",
          409,
        );
      }

      return tx.ordemServico.update({
        where: { id: ordem.id },
        data: {
          valorTotal: resumo.valorTotal,
          valorPago: resumo.valorPago,
          saldo: resumo.saldo,
        },
      });
    });

    return NextResponse.json(atualizado);
  } catch (error) {
    if (error instanceof OrdemServicoDetalheError) {
      return NextResponse.json({ message: error.message }, { status: error.status });
    }

    console.error("Erro ao atualizar serviços da OS:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao atualizar os serviços da OS." },
      { status: 500 },
    );
  }
}