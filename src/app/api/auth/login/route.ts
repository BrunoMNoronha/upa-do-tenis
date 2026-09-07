import { NextRequest, NextResponse } from "next/server";

import { loginSchema } from "@/lib/auth-schema";
import { autenticarUsuario } from "@/lib/auth-service";
import {
  consultarBloqueioLogin,
  derivarChavesLogin,
  extrairIpCliente,
  mensagemBloqueio,
  obterStoreLogin,
  registrarFalhaLogin,
  registrarSucessoLogin,
} from "@/lib/login-rate-limit";
import {
  SESSAO_COOKIE_NOME,
  SESSAO_DURACAO_SEGUNDOS,
  criarTokenSessao,
} from "@/lib/auth-session";

type EventoLogin = {
  evento: "login_bloqueado" | "login_falha" | "login_inativo";
  email: string;
  ip: string;
  politica?: string;
  falhasConsecutivas?: number;
  retryAfterSegundos?: number;
};

/**
 * Log estruturado de tentativa malsucedida, para auditoria de campanhas de
 * força bruta. Registra apenas e-mail, IP e contadores — nunca senha, hash
 * ou token de sessão.
 */
function registrarEvento(evento: EventoLogin): void {
  console.warn(JSON.stringify({ ...evento, em: new Date().toISOString() }));
}

/**
 * Executa uma operação do limitador tolerando indisponibilidade do store.
 *
 * As migrations deste projeto são aplicadas manualmente, mas o deploy do
 * código é automático: existe uma janela real em que a aplicação está no ar e
 * a tabela `RegistroRateLimit` ainda não. Sem esta tolerância, essa janela
 * derrubaria o login inteiro com 500 e travaria a operação do balcão.
 *
 * Perder o rate limiting temporariamente devolve o sistema ao estado anterior
 * à #82; derrubar o login é muito pior. Tolerar aqui **nunca concede acesso**:
 * apenas deixa a tentativa seguir para a verificação normal de credencial.
 */
async function tolerarLimitadorIndisponivel<T>(
  operacao: () => Promise<T>,
  padrao: T
): Promise<T> {
  try {
    return await operacao();
  } catch (error) {
    console.error(
      JSON.stringify({
        evento: "rate_limit_indisponivel",
        motivo: error instanceof Error ? error.message : "erro desconhecido",
        em: new Date().toISOString(),
      })
    );

    return padrao;
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const result = loginSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const { email, senha } = result.data;
    const store = obterStoreLogin();
    const ip = extrairIpCliente(req.headers);
    const chaves = derivarChavesLogin(email, ip);
    const agora = Date.now();

    // Antes de autenticar: verificar credencial custa CPU de scrypt, então o
    // bloqueio precisa ser aplicado antes para não virar vetor de DoS.
    const bloqueio = await tolerarLimitadorIndisponivel(
      () => consultarBloqueioLogin(store, chaves, agora),
      null
    );

    if (bloqueio) {
      registrarEvento({
        evento: "login_bloqueado",
        email,
        ip,
        politica: bloqueio.politica,
        retryAfterSegundos: bloqueio.retryAfterSegundos,
      });

      return NextResponse.json(
        { message: mensagemBloqueio(bloqueio.retryAfterSegundos) },
        {
          status: 429,
          headers: { "Retry-After": String(bloqueio.retryAfterSegundos) },
        }
      );
    }

    const resultado = await autenticarUsuario(email, senha);

    if (resultado.status === "credenciais_invalidas") {
      const { falhasEmailIp } = await tolerarLimitadorIndisponivel(
        () => registrarFalhaLogin(store, chaves, agora),
        { bloqueioArmado: false, falhasEmailIp: 0 }
      );

      registrarEvento({
        evento: "login_falha",
        email,
        ip,
        falhasConsecutivas: falhasEmailIp,
      });

      return NextResponse.json(
        { message: "E-mail ou senha inválidos." },
        { status: 401 }
      );
    }

    if (resultado.status === "usuario_inativo") {
      // A senha estava correta: não é sinal de força bruta e não conta como
      // falha, mas fica registrado para auditoria.
      registrarEvento({ evento: "login_inativo", email, ip });

      return NextResponse.json(
        { message: "Usuário inativo. Procure o administrador do sistema." },
        { status: 403 }
      );
    }

    await tolerarLimitadorIndisponivel(
      () => registrarSucessoLogin(store, chaves),
      undefined
    );

    const response = NextResponse.json(
      {
        usuario: {
          id: resultado.usuario.id,
          nome: resultado.usuario.nome,
          email: resultado.usuario.email,
        },
      },
      { status: 200 }
    );

    response.cookies.set(SESSAO_COOKIE_NOME, criarTokenSessao(resultado.usuario.id), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: SESSAO_DURACAO_SEGUNDOS,
    });

    return response;
  } catch (error) {
    console.error("Erro ao autenticar usuário:", error);
    return NextResponse.json(
      { message: "Ocorreu um erro interno ao autenticar." },
      { status: 500 }
    );
  }
}
