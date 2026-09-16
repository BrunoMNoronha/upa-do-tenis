import { PrismaClient } from "@prisma/client";

import {
  CHAVE_CONFIG_DADOS_EMPRESA,
  DADOS_EMPRESA_PADRAO,
} from "../src/lib/dados-empresa";

const prisma = new PrismaClient();

async function main() {
  const existente = await prisma.configuracaoSistema.findUnique({
    where: { chave: CHAVE_CONFIG_DADOS_EMPRESA },
    select: { chave: true },
  });

  if (existente) {
    console.log("dadosEmpresa já existe; nenhum valor foi alterado.");
    return;
  }

  await prisma.configuracaoSistema.create({
    data: {
      chave: CHAVE_CONFIG_DADOS_EMPRESA,
      valor: JSON.stringify(DADOS_EMPRESA_PADRAO),
    },
  });
  console.log("Carga inicial de dadosEmpresa persistida com sucesso.");
}

main()
  .catch((error) => {
    console.error("Não foi possível persistir a carga inicial de dadosEmpresa.");
    throw error;
  })
  .finally(() => prisma.$disconnect());
