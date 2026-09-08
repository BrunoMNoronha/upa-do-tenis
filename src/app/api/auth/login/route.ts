import { NextRequest, NextResponse } from "next/server";

import { loginRequestSchema } from "@/lib/auth-schema";
import { autenticarUsuario } from "@/lib/auth-service";
import {
  MENSAGEM_CAPTCHA_RECUSADO,
  obterConfigCaptcha,
  verificarCaptcha,
} from "@/lib/captcha";
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
  evento: "login_bloqueado" | "login_falha" | "login_inativo" | "login_captcha_recusado";
  email: string;
  ip: string;
  politica?: string;
  falhasConsecutivas?: number;
  retryAfterSegundos?: number;
  motivo?: string;
  score?: number;
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
    const result = loginRequestSchema.safeParse(body);

    if (!result.success) {
      return NextResponse.json(
        { message: "Dados inválidos.", errors: result.error.flatten() },
        { status: 400 }
      );
    }

    const { email, senha, captchaToken } = result.data;
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

    // Depois do bloqueio (leitura barata) e antes da senha (scrypt): o captcha
    // barra automação distribuída em muitos IPs, cenário que as políticas por
    // IP da #82 não enxergam. Recusa é 403 uniforme e não consome o contador
    // do rate limit — nada aqui revela se o e-mail existe.
    const configCaptcha = obterConfigCaptcha();

    if (configCaptcha.ativo) {
      const captcha = await verificarCaptcha(captchaToken, { ip, config: configCaptcha });

      if (captcha.status === "recusado") {
        registrarEvento({
          evento: "login_captcha_recusado",
          email,
          ip,
          motivo: captcha.motivo,
          score: captcha.score,
        });

        return NextResponse.json({ message: MENSAGEM_CAPTCHA_RECUSADO }, { status: 403 });
      }

      if (captcha.status === "indisponivel") {
        // Mesma filosofia de `tolerarLimitadorIndisponivel`: sem resposta útil
        // do Google, a tentativa segue para a verificação normal de senha,
        // ainda coberta pelo rate limiting. Nunca concede acesso por si só.
        console.error(
          JSON.stringify({
            evento: "captcha_indisponivel",
            motivo: captcha.motivo,
            em: new Date().toISOString(),
          })
        );
      }
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
