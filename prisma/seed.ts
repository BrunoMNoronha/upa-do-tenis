import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Iniciando seed do banco de dados...");

  // Seed de Formas de Pagamento
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
  console.log("Formas de pagamento criadas.");

  // Seed de Serviços Básicos
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
  console.log("Serviços criados.");

  console.log("Seed finalizado com sucesso!");
}

main()
  .catch((e) => {
    console.error("Erro durante o seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
