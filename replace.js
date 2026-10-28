const fs = require('fs');
let content = fs.readFileSync('src/lib/ordens-servico-pagamentos.ts', 'utf8');
const search = `    const ordemComPagamento = await tx.ordemServico.findUnique({
      where: { id: ordemServicoId },
      include: {
        pagamentos: { include: INCLUDE_ESTORNO_PAGAMENTO },
        itens: {
          include: {
            servicos: {
              include: {
                servico: true,
              },
            },
          },
        },
      },
    });

    if (!ordemComPagamento) {
      throw new PagamentoOrdemServicoError("Ordem de serviço não encontrada.", 404);
    }

    const resumoAtualizado = calcularResumoFinanceiroOS({
      statusOperacional: ordemComPagamento.status,
      valorTotal: ordemComPagamento.valorTotal,
      valorDesconto: ordemComPagamento.valorDesconto,
      valorSinal: ordemComPagamento.valorSinal,
      valorPago: ordemComPagamento.valorPago,
      pagamentos: ordemComPagamento.pagamentos,
      itens: ordemComPagamento.itens,
    });`;
const replace = `    // Performance Optimization (Bolt):
    // Evita a segunda query findUnique que carregava pagamentos/itens novamente.
    // Usamos a 'ordem' (Order) já carregada no início da transação, mantendo as
    // mesmas propriedades de relacionamentos aninhados para que calcularResumoFinanceiroOS
    // calcule o saldo corretamente. Como pagamento.create retorna as propriedades escalares
    // mas não as relações, mapeamos isso para não quebrar a lógica de negócio.
    const pagamentoSimulado = {
      ...pagamento,
      estorno: null // Novo pagamento nunca tem estorno no momento da criação
    };

    const pagamentosAtualizados = [...(ordem.pagamentos || []), pagamentoSimulado];

    const resumoAtualizado = calcularResumoFinanceiroOS({
      statusOperacional: ordem.status,
      valorTotal: ordem.valorTotal,
      valorDesconto: ordem.valorDesconto,
      valorSinal: ordem.valorSinal,
      valorPago: ordem.valorPago,
      pagamentos: pagamentosAtualizados,
      itens: ordem.itens,
    });`;
content = content.replace(search, replace);
fs.writeFileSync('src/lib/ordens-servico-pagamentos.ts', content);
