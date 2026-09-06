/**
 * Bootstrap do primeiro usuário administrador.
 *
 * Uso:
 *   pnpm run bootstrap:admin
 *
 * Credenciais via variáveis de ambiente (BOOTSTRAP_ADMIN_NOME,
 * BOOTSTRAP_ADMIN_EMAIL, BOOTSTRAP_ADMIN_SENHA) ou, na ausência delas,
 * via prompt interativo (senha digitada sem eco no terminal).
 *
 * Só cria usuário se o banco não tiver NENHUM usuário cadastrado.
 */
import { createInterface } from "node:readline";

import { prisma } from "../src/lib/prisma";
import { criarPrimeiroAdmin } from "../src/lib/bootstrap-admin";

function perguntar(pergunta: string, ocultar = false): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout });

    if (ocultar) {
      const originalWrite = (rl as unknown as { _writeToOutput: (texto: string) => void })
        ._writeToOutput;
      (rl as unknown as { _writeToOutput: (texto: string) => void })._writeToOutput = function (
        texto: string
      ) {
        if (texto.includes(pergunta)) {
          originalWrite.call(this, pergunta);
        }
      };
    }

    rl.question(pergunta, (resposta) => {
      rl.close();
      if (ocultar) {
        process.stdout.write("\n");
      }
      resolve(resposta);
    });
  });
}

async function obterCredenciais() {
  const nomeEnv = process.env.BOOTSTRAP_ADMIN_NOME;
  const emailEnv = process.env.BOOTSTRAP_ADMIN_EMAIL;
  const senhaEnv = process.env.BOOTSTRAP_ADMIN_SENHA;

  if (nomeEnv && emailEnv && senhaEnv) {
    return { nome: nomeEnv, email: emailEnv, senha: senhaEnv };
  }

  if (!process.stdin.isTTY) {
    console.error(
      "Erro: informe BOOTSTRAP_ADMIN_NOME, BOOTSTRAP_ADMIN_EMAIL e BOOTSTRAP_ADMIN_SENHA " +
        "como variáveis de ambiente, ou execute em um terminal interativo."
    );
    process.exit(1);
  }

  const nome = nomeEnv ?? (await perguntar("Nome do administrador: "));
  const email = emailEnv ?? (await perguntar("E-mail do administrador: "));
  const senha = senhaEnv ?? (await perguntar("Senha (mínimo 6 caracteres): ", true));

  return { nome, email, senha };
}

async function main() {
  console.log("Bootstrap do primeiro administrador — UPA do Tênis");

  const credenciais = await obterCredenciais();
  const resultado = await criarPrimeiroAdmin(credenciais);

  if (resultado.status === "bloqueado") {
    console.error(
      `Bootstrap bloqueado: o banco já possui ${resultado.totalUsuarios} usuário(s) cadastrado(s).`
    );
    console.error("Use a tela /usuarios (com um usuário existente) para criar novos usuários.");
    process.exit(1);
  }

  if (resultado.status === "dados_invalidos") {
    console.error("Dados inválidos:");
    for (const erro of resultado.erros) {
      console.error(`  - ${erro}`);
    }
    process.exit(1);
  }

  console.log("✅ Administrador criado com sucesso:");
  console.log(`  Nome:   ${resultado.usuario.nome}`);
  console.log(`  E-mail: ${resultado.usuario.email}`);
  console.log("Faça login em /login com a senha informada.");
}

main()
  .catch((erro) => {
    console.error("Erro ao executar bootstrap:", erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
