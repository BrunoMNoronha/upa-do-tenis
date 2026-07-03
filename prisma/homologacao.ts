import { PrismaClient } from '@prisma/client';
import { calcularResumoFinanceiroOS } from '../src/lib/ordens-servico-financeiro';
import { registrarPagamentoOrdemServico } from '../src/lib/ordens-servico-pagamentos';
import { registrarInsumoItemOrdemServico } from '../src/lib/ordens-servico-insumos';

const prisma = new PrismaClient();

async function main() {
  console.log("=== INICIANDO HOMOLOGAÇÃO MANUAL GUIADA (SIMULAÇÃO) ===\n");

  // Setup: criar cliente, servico, formaPagamento e insumo base para teste
  console.log("1. SETUP DE DADOS BASE");
  const cliente = await prisma.cliente.create({
    data: { nome: "Cliente Homologacao", telefone: "11999999999", email: "teste@homologacao.com" }
  });
  
  const servico = await prisma.servico.create({
    data: { nome: "Serviço Homologação", precoBase: 150 }
  });

  const formaPagamento = await prisma.formaPagamento.create({
    data: { nome: "PIX", tipo: "PIX" }
  });

  const insumo = await prisma.insumo.create({
    data: { nome: "Solado Borracha", unidadeMedida: "PAR", custoUnitario: 30 }
  });

  console.log("-> Cliente, Serviço, Forma de Pagamento e Insumo de teste criados.\n");

  // 1. Criar nova OS
  console.log("2. CRIAR NOVA OS");
  const os = await prisma.ordemServico.create({
    data: {
      numero: `OS-HOMOL-${Date.now()}`,
      clienteId: cliente.id,
      dataEntrada: new Date(),
      dataPrevisao: new Date(Date.now() + 86400000 * 3), // +3 dias
      valorTotal: 150,
      itens: {
        create: [
          {
            tipoItem: "TENIS",
            descricao: "Tenis de Teste",
            valor: 150,
            servicos: {
              create: [{ servicoId: servico.id, valor: 150 }]
            }
          }
        ]
      }
    },
    include: { itens: true }
  });
  console.log(`-> OS ${os.numero} criada com sucesso. (ID: ${os.id})\n`);

  // 2. Acessar detalhe da OS e validar resumo
  console.log("3. ACESSAR DETALHE DA OS");
  const detalheOS = await prisma.ordemServico.findUnique({
    where: { id: os.id },
    include: { pagamentos: true, itens: { include: { servicos: { include: { servico: true } } } } }
  });
  let resumo = calcularResumoFinanceiroOS(detalheOS as any);
  console.log(`-> Resumo Financeiro Inicial: Valor Total: R$ ${resumo.valorTotal}, Valor Pago: R$ ${resumo.valorPago}, Saldo: R$ ${resumo.saldo}, Status: ${resumo.statusFinanceiro}\n`);

  // 3. Registrar pagamento parcial
  console.log("4. REGISTRAR PAGAMENTO PARCIAL (R$ 50,00)");
  await registrarPagamentoOrdemServico(os.id, {
    formaPagamentoId: formaPagamento.id,
    valor: 50,
    dataPagamento: new Date(),
    tipo: "PAGAMENTO",
    observacoes: "Pagamento parcial PIX"
  });
  
  // 4. Validar valor pago, saldo e status PARCIAL
  const detalheParcial = await prisma.ordemServico.findUnique({
    where: { id: os.id },
    include: { pagamentos: true, itens: { include: { servicos: { include: { servico: true } } } } }
  });
  resumo = calcularResumoFinanceiroOS(detalheParcial as any);
  console.log(`-> Resumo Financeiro Atualizado: Valor Pago: R$ ${resumo.valorPago}, Saldo: R$ ${resumo.saldo}, Status: ${resumo.statusFinanceiro}`);
  if (resumo.saldo === 100 && resumo.statusFinanceiro === 'PARCIAL') {
    console.log("-> SUCESSO: Saldo correto e Status PARCIAL.\n");
  }

  // 5. Tentar registrar pagamento acima do saldo
  console.log("5. TENTAR REGISTRAR PAGAMENTO ACIMA DO SALDO (R$ 150,00 para saldo de R$ 100,00)");
  try {
    await registrarPagamentoOrdemServico(os.id, {
      formaPagamentoId: formaPagamento.id,
      valor: 150,
      dataPagamento: new Date(),
      tipo: "PAGAMENTO"
    });
  } catch (error: any) {
    console.log(`-> BLOQUEIO CONFIRMADO: ${error.message}\n`);
  }

  // 6. Registrar pagamento total
  console.log("6. REGISTRAR PAGAMENTO TOTAL (R$ 100,00)");
  await registrarPagamentoOrdemServico(os.id, {
    formaPagamentoId: formaPagamento.id,
    valor: 100,
    dataPagamento: new Date(),
    tipo: "PAGAMENTO"
  });

  // 7. Validar saldo zerado e status PAGO
  const detalheTotal = await prisma.ordemServico.findUnique({
    where: { id: os.id },
    include: { pagamentos: true, itens: { include: { servicos: { include: { servico: true } } } } }
  });
  resumo = calcularResumoFinanceiroOS(detalheTotal as any);
  console.log(`-> Resumo Financeiro Atualizado: Valor Pago: R$ ${resumo.valorPago}, Saldo: R$ ${resumo.saldo}, Status: ${resumo.statusFinanceiro}`);
  if (resumo.saldo === 0 && resumo.statusFinanceiro === 'PAGO') {
    console.log("-> SUCESSO: Saldo zerado e Status PAGO.\n");
  }

  // 8. Registrar insumo em item da OS
  console.log("7. REGISTRAR INSUMO NO ITEM DA OS");
  const insumoRegistrado = await registrarInsumoItemOrdemServico(os.id, {
    itemOrdemServicoId: os.itens[0].id,
    insumoId: insumo.id,
    quantidade: 1,
    custoUnitarioAplicado: 30,
    observacoes: "Insumo de teste"
  } as any);
  console.log(`-> Insumo registrado: ${insumo.nome}, Qtde: 1, Custo Unitário: R$ ${insumoRegistrado.insumoAplicado.custoUnitarioAplicado}, Custo Total: R$ ${insumoRegistrado.insumoAplicado.custoTotalAplicado}`);

  // 9. Validar que o custo do insumo não altera financeiro
  const detalheInsumo = await prisma.ordemServico.findUnique({
    where: { id: os.id },
    include: { pagamentos: true, itens: { include: { servicos: { include: { servico: true } } } } }
  });
  resumo = calcularResumoFinanceiroOS(detalheInsumo as any);
  console.log(`-> Resumo Financeiro Final: Valor Total: R$ ${resumo.valorTotal}, Valor Pago: R$ ${resumo.valorPago}, Saldo: R$ ${resumo.saldo}`);
  if (resumo.valorTotal === 150 && resumo.saldo === 0) {
    console.log("-> SUCESSO: Insumo não alterou Valor Total nem Saldo da OS.\n");
  }

  // Teardown (limpar dados de teste)
  console.log("=== LIMPANDO DADOS DE TESTE ===");
  await prisma.ordemServico.delete({ where: { id: os.id } });
  await prisma.cliente.delete({ where: { id: cliente.id } });
  await prisma.servico.delete({ where: { id: servico.id } });
  await prisma.formaPagamento.delete({ where: { id: formaPagamento.id } });
  await prisma.insumo.delete({ where: { id: insumo.id } });
  console.log("-> Limpeza concluída.\n");
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
