import { NextRequest, NextResponse } from "next/server";
import { obterUsuarioSessaoDaRequest, exigirSessaoApi } from "@/lib/auth-server";
import { dataOperacionalHoje } from "@/lib/date-range";
import { ordemServicoFormSchema } from "@/lib/ordens-servico-schema";
import { montarObservacaoRegistroRetroativo } from "@/lib/ordens-servico-rastreabilidade";
import { prisma } from "@/lib/prisma";
import { calcularResumoFinanceiroOS } from "@/lib/ordens-servico-financeiro";
import {
  calcularSubtotalItem,
  calcularTotalItens,
  encontrarItemComServicoRepetido,
  listarServicoIdsDosItens,
  normalizarItensOrdemServico,
} from "@/lib/ordens-servico-itens";
import { listarOrdensServicoPaginado } from "@/lib/ordens-servico";
import { normalizarFiltrosListagemOrdensServico } from "@/lib/ordens-servico-listagem";
import { lerPaginacaoDeSearchParams } from "@/lib/paginacao";
import { formatarNumeroOS } from "@/lib/ordens-servico-numero";
import { montarCaminhoAcompanhamento } from "@/lib/os-acompanhamento-token";
import { Prisma } from "@prisma/client";

export async function GET(req: NextRequest) {
  try {
    const naoAutenticado = await exigirSessaoApi(req);
    if (naoAutenticado) return naoAutenticado;

    // Paginação server-side: ?page=2&pageSize=20 combinada com os filtros
    // da tela (statusOp, statusFin, busca, atrasadas). Resposta no contrato
    // padrão { data, pagination }.
    const searchParams = req.nextUrl.searchParams;
    const resultado = await listarOrdensServicoPaginado({
      filtros: normalizarFiltrosListagemOrdensServico(searchParams),
      paginacao: lerPaginacaoDeSearchParams(searchParams),
    });
    return NextResponse.json(resultado, { status: 200 });
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

    // Itens recebidos (issue #205): contrato novo `itens[]` ou o antigo
    // (item único + serviços), ambos normalizados para a mesma lista.
    const itens = normalizarItensOrdemServico(data);
    if (itens.length === 0) {
      return NextResponse.json(
        { message: "Informe pelo menos um item recebido." },
        { status: 400 },
      );
    }

    const indiceComRepeticao = encontrarItemComServicoRepetido(itens);
    if (indiceComRepeticao >= 0) {
      return NextResponse.json(
        { message: `Não é possível repetir o mesmo serviço no item ${indiceComRepeticao + 1}.` },
        { status: 400 },
      );
    }

    // Uma única consulta para todos os serviços de todos os itens.
    const servicoIds = listarServicoIdsDosItens(itens);
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

    // Subtotal por item (soma dos serviços) e total da OS (soma dos subtotais).
    const itensComSubtotal = itens.map((item) => ({ ...item, subtotal: calcularSubtotalItem(item) }));
    const valorTotal = calcularTotalItens(itens);

    // Identificador operacional: OS-<DDMMAAAA da Data de Entrada>-<número informado
    // pelo operador>. Não há geração automática; a data usada é a operacional
    // (retroativa ou não), nunca a data técnica de criação.
    const numeroStr = formatarNumeroOS(dataOperacional, data.numeroOS);

    const osExistente = await prisma.ordemServico.findUnique({
      where: { numero: numeroStr },
      select: { id: true },
    });

    if (osExistente) {
      return NextResponse.json(
        { message: `Já existe uma ordem de serviço com o número ${numeroStr}.` },
        { status: 409 },
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
        },
      });

      // Itens criados um a um, na ordem informada, para devolver ao navegador
      // o mapeamento clientKey → id (as fotos só podem ser enviadas depois).
      // Qualquer falha desfaz a OS inteira junto com a transação.
      const itensCriados: Array<{ id: string; clientKey: string; descricao: string }> = [];
      for (const item of itensComSubtotal) {
        const itemCriado = await tx.itemOrdemServico.create({
          data: {
            ordemServicoId: ordemCriada.id,
            tipoItem: item.tipoItem,
            descricao: item.descricao,
            observacoes: item.observacoes,
            valor: item.subtotal,
            servicos: item.servicos.length > 0
              ? { create: item.servicos }
              : undefined,
          },
          select: { id: true },
        });
        itensCriados.push({ id: itemCriado.id, clientKey: item.clientKey, descricao: item.descricao });
      }

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

      return { ...ordemCriada, itens: itensCriados };
    });

    // Caminho público de acompanhamento (token assinado) para a sugestão de
    // WhatsApp; só é devolvido depois que a criação foi confirmada.
    return NextResponse.json(
      { ...novaOS, caminhoAcompanhamento: montarCaminhoAcompanhamento(novaOS.id) },
      { status: 201 },
    );
  } catch (error) {
    // Corrida entre a verificação prévia e o insert: a unicidade de `numero`
    // é garantida pelo banco; devolve conflito de negócio em vez de 500.
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return NextResponse.json(
        { message: "Já existe uma ordem de serviço com o número informado." },
        { status: 409 },
      );
    }

    console.error("Erro ao criar ordem de serviço:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao criar a ordem de serviço." },
      { status: 500 }
    );
  }
}
