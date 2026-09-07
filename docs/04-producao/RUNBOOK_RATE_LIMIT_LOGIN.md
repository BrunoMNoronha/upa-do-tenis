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
4. **Redeploy na Vercel.** O contador vive em memória do processo, então um
   novo deployment descarta todos os bloqueios. É o botão de emergência —
   use só se as opções acima não servirem, porque afeta todas as chaves.

Não existe endpoint de desbloqueio: um endpoint desses seria, ele mesmo, uma
forma de contornar o limite.

## Limitação conhecida do armazenamento

O contador usa `RateLimitStoreMemoria` — memória do processo. Em runtime
serverless (Vercel) o estado é **por instância** e não é compartilhado entre
invocações, portanto a proteção é de **melhor esforço**: reduz muito o
custo/benefício da força bruta, mas não é uma garantia global.

A política, a rota e os testes são agnósticos de armazenamento: trocar o store
é substituir o retorno de `obterStoreLogin()` em
[`src/lib/login-rate-limit.ts`](../../src/lib/login-rate-limit.ts) por outra
implementação de `RateLimitStore`. As opções avaliadas na #82:

- **Contagem persistida no banco** — precisa de migration, portanto de
  autorização explícita (ver `CLAUDE.md`). Dá garantia global.
- **Rate limit na borda (Vercel Firewall)** — sem alteração de código; depende
  do plano da conta.
- **Store externo (Upstash Redis)** — garantia global, adiciona dependência de
  infraestrutura.

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
