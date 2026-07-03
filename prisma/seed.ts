import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed do banco de dados...");

  // Proteção contra sobrescrita de dados reais/produção
  const countClientes = await prisma.cliente.count();
  if (countClientes > 0) {
    console.warn("⚠️ Banco de dados já possui clientes cadastrados.");
    console.warn("Pulando a execução do seed para proteger dados reais.");
    return;
  }

  // 1. Seed de Formas de Pagamento
  const formasPagamento = [
    { nome: "Dinheiro", tipo: "DINHEIRO", ativo: true },
    { nome: "PIX", tipo: "PIX", ativo: true },
    { nome: "Cartão de Crédito", tipo: "CARTAO_CREDITO", ativo: true },
    { nome: "Cartão de Débito", tipo: "CARTAO_DEBITO", ativo: true },
  ];

  for (const forma of formasPagamento) {
    await prisma.formaPagamento.create({
      data: forma,
    });
  }
  console.log("✅ Formas de pagamento criadas.");

  // 2. Seed de Serviços Básicos
  const servicos = [
    { nome: "Limpeza Simples", descricao: "Limpeza externa do calçado", precoBase: 30.0, ativo: true },
    { nome: "Limpeza Completa", descricao: "Limpeza interna e externa", precoBase: 50.0, ativo: true },
    { nome: "Troca de Sola", descricao: "Substituição completa da sola", precoBase: 120.0, ativo: true },
    { nome: "Costura", descricao: "Costura de reforço em partes soltas", precoBase: 25.0, ativo: true },
    { nome: "Pintura", descricao: "Pintura completa ou retoque", precoBase: 80.0, ativo: true },
    { nome: "Hidratação de Couro", descricao: "Limpeza e hidratação de couro", precoBase: 45.0, ativo: true },
  ];

  for (const servico of servicos) {
    await prisma.servico.create({
      data: servico,
    });
  }
  console.log("✅ Serviços básicos criados.");

  // 3. Seed de Clientes Fictícios
  const cliente1 = await prisma.cliente.create({
    data: {
      nome: "João Silva",
      telefone: "11999999999",
      email: "joao.silva@email.com",
      cpfCnpj: "12345678900",
      observacoes: "Cliente antigo, gosta de avisos via WhatsApp",
    }
  });

  const cliente2 = await prisma.cliente.create({
    data: {
      nome: "Maria Oliveira",
      telefone: "11988888888",
      email: "maria.oliveira@email.com",
      observacoes: "Paga sempre em PIX",
    }
  });
  console.log("✅ Clientes fictícios criados.");

  // 4. Seed de Ordens de Serviço Fictícias
  const os1 = await prisma.ordemServico.create({
    data: {
      numero: "OS-0001",
      clienteId: cliente1.id,
      status: "ABERTA",
      dataEntrada: new Date(),
      dataPrevisao: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000), // 5 dias
      valorTotal: 80.0,
      valorSinal: 0,
      valorPago: 0,
      saldo: 80.0,
      observacoes: "Tênis Nike branco sujo",
    }
  });

  const os2 = await prisma.ordemServico.create({
    data: {
      numero: "OS-0002",
      clienteId: cliente2.id,
      status: "CONCLUIDA",
      dataEntrada: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 dias atrás
      dataPrevisao: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1 dia atrás
      dataConclusao: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
      valorTotal: 120.0,
      valorSinal: 60.0,
      valorPago: 120.0,
      saldo: 0,
      observacoes: "Troca de sola bota de couro",
    }
  });
  console.log("✅ Ordens de Serviço criadas.");

  console.log("🚀 Seed finalizado com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro durante o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
