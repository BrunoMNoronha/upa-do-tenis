import { NextRequest, NextResponse } from "next/server";
import { obterUsuarioSessaoDaRequest, exigirSessaoApi } from "@/lib/auth-server";
import { dataOperacionalHoje } from "@/lib/date-range";
import { ordemServicoFormSchema } from "@/lib/ordens-servico-schema";
import { montarObservacaoRegistroRetroativo } from "@/lib/ordens-servico-rastreabilidade";
import { prisma } from "@/lib/prisma";
import { calcularResumoFinanceiroOS } from "@/lib/ordens-servico-financeiro";
import { listarOrdensServico } from "@/lib/ordens-servico";

export async function GET(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    const ordens = await listarOrdensServico();
    return NextResponse.json(ordens, { status: 200 });
  } catch (error) {
    console.error("Erro ao listar ordens de serviço:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao listar as ordens de serviço." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const usuario = await obterUsuarioSessaoDaRequest(req);
    if (!usuario) {
      return NextResponse.json({ message: "Não autenticado." }, { status: 401 });
    }

    const body = await req.json();
    const result = ordemServicoFormSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const data = result.data;

    // Data operacional da OS: informada pelo operador (retroativa) ou agora.
    // criadoEm permanece como registro técnico imutável.
    const hoje = dataOperacionalHoje();
    const dataOperacional = data.dataEntrada?.trim() ? data.dataEntrada.trim() : hoje;
    const ehRetroativa = dataOperacional !== hoje;
    const dataEntradaPersistida = ehRetroativa
      ? new Date(`${dataOperacional}T12:00:00`)
      : new Date();

    const servicosInformados = data.servicos.length > 0
      ? data.servicos
      : data.servicoId
        ? [{ servicoId: data.servicoId, valor: data.valorEstimado }]
        : [];

    const servicoIds = servicosInformados.map((servico) => servico.servicoId);
    if (new Set(servicoIds).size !== servicoIds.length) {
      return NextResponse.json(
        { message: "Não é possível repetir o mesmo serviço na OS." },
        { status: 400 },
      );
    }

    const servicos = servicoIds.length > 0
      ? await prisma.servico.findMany({
          where: { id: { in: servicoIds } },
          select: { id: true, ativo: true },
        })
      : [];

    if (servicos.length !== servicoIds.length) {
      return NextResponse.json(
        { message: "Um ou mais serviços informados não foram encontrados." },
        { status: 400 },
      );
    }

    if (servicos.some((servico) => !servico.ativo)) {
      return NextResponse.json(
        { message: "Serviços inativos não podem ser adicionados a uma nova OS." },
        { status: 400 },
      );
    }

    const valorTotalServicos = servicosInformados.reduce((total, servico) => total + servico.valor, 0);
    const valorTotal = servicosInformados.length > 0 ? valorTotalServicos : data.valorEstimado;

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
      valorTotal,
      valorDesconto: 0,
      valorSinal: 0,
      valorPago: 0,
      pagamentos: [],
      itens: [],
    });

    const novaOS = await prisma.$transaction(async (tx) => {
      const ordemCriada = await tx.ordemServico.create({
        data: {
          numero: numeroStr,
          clienteId: data.clienteId,
          status: "ABERTA",
          dataEntrada: dataEntradaPersistida,
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
              valor: valorTotal,
              servicos: servicosInformados.length > 0
                ? { create: servicosInformados }
                : undefined,
            }
          }
        },
      });

      if (ehRetroativa) {
        await tx.historicoStatus.create({
          data: {
            ordemServicoId: ordemCriada.id,
            statusAnterior: null,
            statusNovo: "ABERTA",
            observacao: montarObservacaoRegistroRetroativo({
              dataOperacional,
              registradoEm: new Date(),
              usuarioNome: usuario.nome || usuario.email,
              justificativa: data.justificativaDataEntrada ?? "",
            }),
          },
        });
      }

      return ordemCriada;
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
