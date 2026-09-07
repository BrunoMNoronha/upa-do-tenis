/**
 * Destrava um operador bloqueado pelo rate limiting do login (issue #82).
 *
 * Uso:
 *   pnpm run desbloquear:login -- --email bruno@exemplo.com --ip 203.0.113.7
 *   pnpm run desbloquear:login -- --tudo    # zera todos os bloqueios
 *
 * A chave gravada é um hash de (IP, e-mail): a tabela não guarda e-mail nem
 * IP em claro, então não há como localizar a linha do operador sem recompor o
 * hash — é o que este script faz. O IP aparece no log `login_bloqueado`.
 */
import { prisma } from "../src/lib/prisma";
import {
  POLITICA_LOGIN_EMAIL_IP,
  POLITICA_LOGIN_IP,
  derivarChave,
} from "../src/lib/login-rate-limit";

type Argumentos = {
  email?: string;
  ip?: string;
  tudo: boolean;
};

function lerArgumentos(argv: string[]): Argumentos {
  const args: Argumentos = { tudo: false };

  for (let i = 0; i < argv.length; i += 1) {
    const atual = argv[i];

    if (atual === "--tudo") {
      args.tudo = true;
    } else if (atual === "--email") {
      args.email = argv[i + 1];
      i += 1;
    } else if (atual === "--ip") {
      args.ip = argv[i + 1];
      i += 1;
    }
  }

  return args;
}

function usoEErro(mensagem: string): never {
  console.error(`Erro: ${mensagem}\n`);
  console.error("Uso:");
  console.error("  pnpm run desbloquear:login -- --email <e-mail> [--ip <ip>]");
  console.error("  pnpm run desbloquear:login -- --tudo");
  process.exit(1);
}

async function desbloquearTudo(): Promise<void> {
  const { count } = await prisma.registroRateLimit.deleteMany();

  console.log(`✅ ${count} registro(s) de rate limiting removido(s).`);
  console.log("Todos os bloqueios de login em vigor foram zerados.");
}

async function desbloquearPorIp(email: string, ip: string): Promise<void> {
  const chaves = [
    derivarChave(POLITICA_LOGIN_EMAIL_IP, ip, email.trim().toLowerCase()),
    derivarChave(POLITICA_LOGIN_IP, ip),
  ];

  const { count } = await prisma.registroRateLimit.deleteMany({
    where: { chave: { in: chaves } },
  });

  console.log(`✅ ${count} registro(s) removido(s) para ${email} em ${ip}.`);

  if (count === 0) {
    console.log("Nenhum bloqueio ativo para esse par — o operador já está liberado.");
  }
}

async function main() {
  const args = lerArgumentos(process.argv.slice(2));

  if (args.tudo) {
    await desbloquearTudo();
    return;
  }

  if (!args.email) {
    usoEErro("informe --email <e-mail> ou --tudo.");
  }

  if (!args.ip) {
    usoEErro(
      "sem --ip não é possível recompor a chave, porque a tabela guarda apenas hashes.\n" +
        "O IP do operador aparece no log `login_bloqueado` dos Runtime Logs da Vercel.\n" +
        "Se não houver como descobri-lo, use --tudo para zerar todos os bloqueios."
    );
  }

  await desbloquearPorIp(args.email, args.ip);
}

main()
  .catch((erro) => {
    console.error("Erro ao desbloquear login:", erro);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
