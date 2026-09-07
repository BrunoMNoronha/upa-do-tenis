# Runbook — Rate limiting do login

Referência: issue #82. Cobre o comportamento de `POST /api/auth/login` sob
excesso de tentativas e o procedimento para destravar um operador.

## O que está em vigor

Duas políticas independentes, avaliadas **antes** da verificação de senha:

| Política | Chave | Falhas toleradas | Backoff progressivo |
|---|---|---|---|
| `login:email+ip` | par (IP, e-mail) | 5 | 1 min → 5 min → 15 min → 30 min |
| `login:ip` | IP isolado | 20 | 5 min → 15 min → 30 min |

- O contador zera após **15 minutos** sem novas falhas.
- O contador zera **imediatamente** após um login bem-sucedido.
- Vence a política de liberação mais distante.
- Requisição com corpo inválido (`400`) **não** consome o limite.

### Respostas

| Situação | Status | Corpo |
|---|---|---|
| Dentro do limite, senha errada | `401` | `E-mail ou senha inválidos.` |
| Acima do limite | `429` + `Retry-After` | `Muitas tentativas de login. Tente novamente em N minuto(s).` |
| Senha correta, usuário inativo | `403` | `Usuário inativo. Procure o administrador do sistema.` |

O `429` é idêntico para e-mail cadastrado e não cadastrado — a resposta de
bloqueio não serve para enumerar usuários.

## Por que a chave é o par (IP, e-mail)

Travar apenas por e-mail permitiria que um atacante externo derrubasse o
acesso do operador no balcão só martelando o e-mail dele. Com o par, o
bloqueio atinge somente a origem que está errando: **o operador continua
entrando normalmente de outro IP.** A política por IP isolado, com limite mais
alto, cobre o caso oposto — varredura de senha contra muitos e-mails a partir
da mesma origem.

## Como destravar um operador travado no balcão

Em ordem de preferência:

1. **Aguardar a janela.** O bloqueio expira sozinho — no máximo 30 minutos,
   e 1 minuto no primeiro estouro. O `Retry-After` da resposta diz o tempo
   exato. Na prática é o caminho normal.
2. **Entrar de outra origem.** Como a política principal é por par
   (IP, e-mail), o mesmo login funciona de imediato a partir de outra rede —
   4G do celular, por exemplo. Vale quando o balcão não pode esperar.
3. **Confirmar a senha antes de insistir.** Cada tentativa errada aumenta o
   backoff. Se houver dúvida sobre a senha, o administrador deve redefini-la
   (`pnpm bootstrap:admin` ou a tela de usuários) em vez de tentar de novo.
4. **Remover o bloqueio pelo script**, quando não se pode esperar:

   ```bash
   pnpm run desbloquear:login -- --email operador@exemplo.com --ip 203.0.113.7
   ```

   O IP aparece no log `login_bloqueado` dos Runtime Logs da Vercel. Ele é
   obrigatório porque a tabela guarda apenas hashes — sem o IP não há como
   recompor a chave do operador.

5. **Zerar todos os bloqueios**, como último recurso:

   ```bash
   pnpm run desbloquear:login -- --tudo
   ```

   Afeta todas as chaves, inclusive as de um ataque em andamento.

Não existe endpoint de desbloqueio: um endpoint desses seria, ele mesmo, uma
forma de contornar o limite. O desbloqueio exige acesso ao banco.

## Armazenamento

O contador é persistido no Postgres, na tabela `RegistroRateLimit`
(`RateLimitStorePrisma`), portanto **compartilhado entre todas as instâncias
serverless** — o bloqueio vale globalmente, e não por invocação.

A tabela não é dado de domínio: nada a referencia, cada linha é descartável
depois de `expiraEm`, e apagá-la por inteiro apenas zera os bloqueios em
vigor. A chave é um hash de (IP, e-mail) — e-mail e IP nunca são gravados em
claro. Registros expirados são podados de forma oportunista, no máximo uma vez
a cada 5 minutos, e a poda nunca derruba uma tentativa de login.

**Imprecisão conhecida e aceita:** o motor lê, decide e grava, então
requisições concorrentes sobre a mesma chave podem ler o mesmo contador e
subcontar. O erro é limitado ao número de requisições em voo e não afeta o
objetivo — o bloqueio ainda entra em vigor em poucas tentativas.

A política, a rota e os testes de política são agnósticos de armazenamento:
trocar o store é substituir o retorno de `obterStoreLogin()` em
[`src/lib/login-rate-limit.ts`](../../src/lib/login-rate-limit.ts) por outra
implementação de `RateLimitStore`. Alternativas ainda abertas na #82, se algum
dia a carga justificar:

- **Rate limit na borda (Vercel Firewall)** — sem alteração de código; depende
  do plano da conta. Complementar, não substituto: barra volume antes de
  chegar na função.
- **Store externo (Upstash Redis)** — tira a contagem do banco de domínio,
  adiciona dependência de infraestrutura.

`RateLimitStoreMemoria` continua no código, usado pelos testes de política.
Não é adequado para produção serverless: o estado seria por instância.

## Migration e ordem de deploy

A tabela vem da migration `20260907213732_add_registro_rate_limit`, puramente
aditiva (`CREATE TABLE` + índice em `expiraEm`), sem alterar nenhuma tabela
existente. Rollback é `DROP TABLE "RegistroRateLimit"` — a aplicação volta a
não ter rate limiting, mas nada mais é afetado.

**Aplique a migration antes ou junto do deploy do código:**

```
Actions → Migrations (Neon) → Run workflow
  ambiente: preview (e depois production)
  confirmacao: APLICAR
```

Neste projeto as migrations são **manuais** (`workflow_dispatch`, com
*required reviewers* em `production`), mas o deploy do código na Vercel é
automático no merge. Existe, portanto, uma janela em que a aplicação está no ar
e a tabela ainda não.

Essa janela **não derruba o login**: a rota tolera indisponibilidade do store
(`tolerarLimitadorIndisponivel`), responde normalmente e registra
`rate_limit_indisponivel` nos logs. Durante a janela não há rate limiting —
o mesmo estado de antes da #82 —, mas nenhum acesso é concedido indevidamente:
a verificação de credencial continua igual.

Depois de aplicar a migration, confirme que `rate_limit_indisponivel` parou de
aparecer nos Runtime Logs.

## Auditoria

Tentativas malsucedidas saem em `console.warn` como JSON de uma linha, sem
senha, hash ou token:

```json
{"evento":"login_falha","email":"...","ip":"...","falhasConsecutivas":3,"em":"2026-09-07T12:00:00.000Z"}
{"evento":"login_bloqueado","email":"...","ip":"...","politica":"login:email+ip","retryAfterSegundos":60,"em":"..."}
{"evento":"login_inativo","email":"...","ip":"...","em":"..."}
```

Na Vercel, filtrar os Runtime Logs do projeto por `login_bloqueado` mostra
campanhas de força bruta em andamento.

> O IP só é confiável porque a aplicação fica atrás da borda da Vercel, que
> reescreve `x-real-ip` / `x-forwarded-for`. Em execução exposta diretamente
> (Docker local sem proxy) esses cabeçalhos são forjáveis pelo cliente e a
> política por IP perde valor.
