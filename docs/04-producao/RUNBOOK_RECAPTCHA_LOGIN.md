# Runbook — reCAPTCHA v3 no login

Referência: issue #123. Cobre o comportamento de `POST /api/auth/login` com o
reCAPTCHA v3 ativo, a configuração das chaves e o caminho de rollback.
Complementa o [runbook de rate limiting](RUNBOOK_RATE_LIMIT_LOGIN.md) (#82).

## O que está em vigor

Toda tentativa de login envia um token do reCAPTCHA v3 (ação `login`),
validado no servidor contra o `siteverify` do Google. A verificação roda
**depois** do bloqueio do rate limit e **antes** da verificação de senha:

```
corpo válido? ──não──▶ 400
      │
bloqueado pelo rate limit? ──sim──▶ 429 (não consulta o Google)
      │
captcha ativo? ──não──▶ segue
      │ sim
Google recusou (token ausente/inválido, ação errada, score baixo)? ──sim──▶ 403
      │
Google indisponível? ──sim──▶ log `captcha_indisponivel`, segue
      │
verificação de senha (scrypt) ──▶ 401 / 403 inativo / 200
```

### Respostas

| Situação | Status | Corpo |
|---|---|---|
| Captcha recusado | `403` | `Não foi possível validar sua tentativa. Recarregue a página e tente novamente.` |
| Acima do limite do rate limit | `429` + `Retry-After` | `Muitas tentativas de login. Tente novamente em N minuto(s).` |
| Senha errada | `401` | `E-mail ou senha inválidos.` |
| Senha correta, usuário inativo | `403` | `Usuário inativo. Procure o administrador do sistema.` |

O `403` do captcha é idêntico para e-mail cadastrado e não cadastrado, e
acontece antes de qualquer consulta ao usuário — não serve para enumeração.

### Por que a recusa não conta no rate limit

Um bot barrado pelo captcha nunca chega à verificação de senha; contar essa
recusa no par (IP, e-mail) permitiria que um atacante sem token bloqueasse o
operador legítimo daquele IP. O custo de uma recusa é uma chamada ao Google,
sem scrypt e sem banco — barato o bastante para não precisar do contador.

### Por que falha aberto quando o Google está fora

Mesma filosofia de `tolerarLimitadorIndisponivel`: derrubar o login do balcão
por indisponibilidade de um serviço externo é pior do que operar
temporariamente sem a camada. Falhar aberto **nunca concede acesso** — a
tentativa apenas segue para a verificação normal de senha, que continua
coberta pelo rate limiting. O evento `captcha_indisponivel` fica nos logs.

Só é "indisponível" o que não teve resposta útil: erro de rede, timeout (5 s),
HTTP não-2xx ou corpo ilegível. Quando o Google responde e recusa, é `403`.

### O captcha existe só na página de login

O script do Google é carregado pelo formulário de login e em nenhum outro
lugar. Após o login bem-sucedido o formulário faz **navegação completa**
(`window.location.assign`) para o dashboard, e não troca client-side: uma
troca client-side manteria o script e o iframe do badge vivos em todas as
telas seguintes. Nenhuma outra rota envia ou valida `captchaToken`.

## Variáveis de ambiente

| Variável | Onde | Descrição |
|---|---|---|
| `RECAPTCHA_SITE_KEY` | Vercel Production e Preview | chave pública; entregue ao formulário como prop da página (não é `NEXT_PUBLIC_*`) |
| `RECAPTCHA_SECRET_KEY` | Vercel Production e Preview | chave secreta do `siteverify`; nunca chega ao cliente |
| `RECAPTCHA_SCORE_MINIMO` | opcional | score mínimo em `[0, 1]`; padrão `0.5`; valor inválido cai no padrão |

**Sem as duas chaves o captcha fica desligado** e o login se comporta como
antes da #123. É o estado de desenvolvimento, testes e CI.

## Criando as chaves

1. Console do reCAPTCHA (Google Cloud → reCAPTCHA, ou
   `https://www.google.com/recaptcha/admin`): criar chave do tipo
   **reCAPTCHA v3** (score-based).
2. Domínios: o domínio oficial de produção. Para o Preview, registrar
   `vercel.app` (o console aceita o domínio raiz e cobre os subdomínios de
   deployment).
3. Preferir **um par de chaves por escopo** (Production ≠ Preview), seguindo
   a mesma regra de separação usada para `AUTH_SESSION_SECRET`.
4. Cadastrar na Vercel, uma variável por escopo, **nunca** em "All
   Environments". Escopo Development permanece vazio.
5. Redeploy não é necessário para as variáveis de runtime, mas o próximo
   deployment é que passa a lê-las — confirmar no Preview antes de Production.

## Ajustando o score

O v3 devolve um score de `0.0` (provável bot) a `1.0` (provável humano). O
padrão `0.5` é o recomendado pelo Google. Sinais para ajustar:

- operadores legítimos recebendo `403` repetido → os logs mostram
  `login_captcha_recusado` com `motivo: "score_baixo"` e o score obtido;
  reduzir `RECAPTCHA_SCORE_MINIMO` (por exemplo `0.3`) e observar;
- volume de `login_falha` alto com scores baixos passando → subir o mínimo.

A alteração é só de variável de ambiente; não há deploy de código.

## Como destravar um operador recusado pelo captcha

1. **Recarregar a página.** O token do v3 expira em 2 minutos; formulário
   deixado aberto produz `timeout-or-duplicate`.
2. **Confirmar que o script carregou.** Bloqueadores de conteúdo ou rede
   corporativa podem barrar `www.google.com/recaptcha`; nesse caso o
   formulário envia sem token e o servidor responde `403`. Liberar o domínio
   ou entrar de outra rede.
3. **Baixar temporariamente o score mínimo**, se o log mostrar `score_baixo`
   com score consistente (VPN, navegador atípico).
4. **Desligar o captcha**, como último recurso: remover
   `RECAPTCHA_SECRET_KEY` (ou as duas chaves) do escopo na Vercel. O login
   volta a depender só do rate limiting. Sem deploy de código.

## Rollback

Remover as chaves do escopo é o rollback completo: o módulo detecta a
ausência e desliga. Nenhuma tabela, migration ou dado é afetado — o captcha
não persiste nada.

## Auditoria

Recusas saem em `console.warn` como JSON de uma linha, sem senha, hash ou
token:

```json
{"evento":"login_captcha_recusado","email":"...","ip":"...","motivo":"score_baixo","score":0.2,"em":"2026-09-08T12:00:00.000Z"}
{"evento":"login_captcha_recusado","email":"...","ip":"...","motivo":"token_ausente","em":"..."}
{"evento":"login_captcha_recusado","email":"...","ip":"...","motivo":"invalid-input-response,timeout-or-duplicate","em":"..."}
```

Indisponibilidade sai em `console.error`:

```json
{"evento":"captcha_indisponivel","motivo":"TimeoutError","em":"..."}
```

Na Vercel, filtrar os Runtime Logs por `login_captcha_recusado` mostra
tentativas automatizadas barradas; por `captcha_indisponivel`, períodos em que
a camada esteve inativa.

## Código

| Arquivo | Papel |
|---|---|
| `src/lib/captcha.ts` | configuração por env, `verificarCaptcha` com timeout e injeção de `fetch` |
| `src/app/api/auth/login/route.ts` | ordem bloqueio → captcha → senha; eventos de log |
| `src/app/login/page.tsx` | entrega a site key ao formulário |
| `src/app/login/login-form.tsx` | carrega o script v3 e envia `captchaToken` |
| `src/lib/captcha.test.ts` | unidade do módulo, sem rede |
| `src/app/api/auth/login/login-captcha-api.test.ts` | integração da rota com `fetch` simulado |
