# Autenticação e Enforcement de Sessão

Regra vigente desde a Fatia Segurança 01 (2026-07-06).

## Mecanismo

- Sessão baseada em cookie `upa_sessao`, assinado com HMAC-SHA256 (`AUTH_SESSION_SECRET`), validade de 8 horas.
- Cookie emitido por `POST /api/auth/login` com `httpOnly`, `sameSite: lax`, `secure` em produção e `maxAge` de 8h.
- `POST /api/auth/logout` expira o cookie (`maxAge: 0`).
- Em produção, `AUTH_SESSION_SECRET` (mínimo 16 caracteres) é obrigatório; sem ele o servidor lança erro. Em desenvolvimento há um segredo de fallback. O segredo nunca é exposto em variável `NEXT_PUBLIC_*`.

## Enforcement em duas camadas

1. **Middleware (`src/middleware.ts`)** — roda no Edge runtime para toda requisição, exceto assets (`_next/static`, `_next/image`, favicon e arquivos estáticos):
   - página privada sem token válido → redirect `307` para `/login`;
   - API privada sem token válido → `401 { "message": "Não autenticado." }`;
   - a validação usa Web Crypto (`src/lib/auth-edge.ts`), verificando assinatura e expiração do token — sem acesso ao banco.
2. **Route handlers** — toda API privada chama `exigirSessaoApi(req)` (`src/lib/auth-server.ts`) como primeira instrução: valida o token **e** confirma no banco que o usuário existe e está ativo. Sem sessão válida, responde `401` padronizado antes de qualquer acesso a dados. Essa camada vale mesmo se o middleware for contornado e é a coberta pelos testes unitários.

Páginas que renderizam dados no servidor dependem do middleware; `/usuarios` adicionalmente chama `exigirSessao()` (redirect server-side).

## Proteções do login

`POST /api/auth/login` avalia, nesta ordem, antes de verificar a senha:

1. **Rate limiting** (#82) — políticas por par (IP, e-mail) e por IP, persistidas em `RegistroRateLimit`. Bloqueio responde `429` + `Retry-After` sem consultar o Google nem o banco de usuários. Runbook: [`RUNBOOK_RATE_LIMIT_LOGIN.md`](../04-producao/RUNBOOK_RATE_LIMIT_LOGIN.md).
2. **reCAPTCHA v3** (#123) — token da ação `login` enviado pelo formulário em `captchaToken` e validado em `src/lib/captcha.ts`. Recusa (token ausente/inválido, ação errada, score abaixo de `RECAPTCHA_SCORE_MINIMO`) responde `403` uniforme e **não** consome o contador do rate limit. Google indisponível registra `captcha_indisponivel` e deixa a tentativa seguir (fail-open; nunca concede acesso). Sem `RECAPTCHA_SITE_KEY` + `RECAPTCHA_SECRET_KEY` o captcha fica desligado — estado de dev/test/CI. Runbook: [`RUNBOOK_RECAPTCHA_LOGIN.md`](../04-producao/RUNBOOK_RECAPTCHA_LOGIN.md).

Só depois disso roda `autenticarUsuario` (scrypt), que é o custo mais alto da rota.

## Rotas públicas

- `/login` (a página redireciona para `/dashboard` se já houver sessão);
- `POST /api/auth/login`;
- `POST /api/auth/logout`;
- assets estáticos do Next.

Qualquer rota nova é **privada por padrão** (o middleware bloqueia tudo que não estiver na lista acima). Para expor uma rota pública nova, inclua-a explicitamente em `PAGINAS_PUBLICAS`/`APIS_PUBLICAS` no `src/middleware.ts` — e justifique.

## Regras para novas APIs

1. Aceitar `req: NextRequest` como primeiro parâmetro.
2. Chamar `exigirSessaoApi(req)` antes de ler body, params ou tocar o banco:

   ```ts
   const naoAutenticado = await exigirSessaoApi(req);
   if (naoAutenticado) return naoAutenticado;
   ```

3. Adicionar o handler ao teste `src/__tests__/api-auth-enforcement.test.ts`.

## Módulos

| Arquivo | Papel |
|---|---|
| `src/lib/auth-constants.ts` | Nome do cookie, duração e segredo (compatível com Edge e Node) |
| `src/lib/auth-session.ts` | Criação/verificação do token (Node, usado no login) |
| `src/lib/auth-edge.ts` | Verificação do token via Web Crypto (usada no middleware) |
| `src/lib/auth-server.ts` | `obterUsuarioSessao`, `exigirSessao` (páginas), `exigirSessaoApi` (APIs) |
| `src/lib/login-rate-limit.ts` | Políticas e chaves do rate limiting do login |
| `src/lib/captcha.ts` | Configuração e verificação do reCAPTCHA v3 |
| `src/middleware.ts` | Enforcement central de páginas e APIs |

## Testes

- `src/middleware.test.ts` — redirect, 401 e rotas públicas;
- `src/lib/auth-edge.test.ts` — equivalência do verificador Edge com o assinador Node;
- `src/__tests__/api-auth-enforcement.test.ts` — toda API privada responde 401 sem sessão, sem tocar o banco;
- `src/app/api/usuarios/usuarios-api-auth.test.ts` — sessão válida, token adulterado e usuário inativado;
- `src/app/api/auth/login/login-rate-limit-api.test.ts` — limite, bloqueio, expiração e reset após sucesso;
- `src/app/api/auth/login/login-captcha-api.test.ts` e `src/lib/captcha.test.ts` — token válido/ausente/inválido, score, ação, Google indisponível e precedência do `429`.

## Fora do escopo desta fatia

Permissões por perfil (RBAC), auditoria por usuário e multiusuário avançado ficam para fatia futura.
