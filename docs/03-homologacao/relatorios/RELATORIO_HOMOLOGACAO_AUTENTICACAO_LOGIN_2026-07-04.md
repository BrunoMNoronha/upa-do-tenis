# Relatório de Homologação — Autenticação Básica de Usuários (Login)

## Resumo executivo

A fase Autenticação/Login implementa login por e-mail e senha para os usuários já cadastrados no sistema, sessão assinada em cookie HttpOnly com validade de 8 horas, logout e proteção inicial da tela `/usuarios` e das APIs de usuários. A validação de senha reutiliza o helper `verifyPassword` (scrypt) da fase de Cadastro de Usuários, e o campo `ativo` bloqueia o login e revoga sessões de usuários inativados. Não foi adicionada nenhuma dependência nova, não houve alteração de schema de banco e nenhuma área crítica (financeiro, caixa, estoque, pagamentos, OS, relatórios) foi tocada. Todos os cenários de homologação foram executados com sucesso e lint, testes (163) e build passaram.

## Ambiente

- **Projeto:** UPA do Tênis - Sapataria Alves
- **Branch:** `main`
- **Commit anterior (base da fase):** `561e1b2` — "feat: adicionar cadastro basico de usuarios do sistema"
- **Data da homologação:** 04/07/2026
- **Responsável pela execução:** Claude Code (agente), a pedido de Bruno M Noronha
- **Ambiente:** `npm run dev` local, Next.js 14.2.35, banco PostgreSQL local (banco do `.env`)
- **Método:** Execução guiada via browser automatizado (preview) e chamadas HTTP diretas às APIs; usuário de teste identificável (`teste-auth-claude@exemplo.local`) criado por script direto no Prisma e **removido do banco ao final da homologação**

## Escopo validado

1. Tela de login (`/login`) standalone, com estados de loading e erro.
2. Fluxo de autenticação por e-mail/senha usando a estrutura existente de usuário.
3. Validação de senha com `verifyPassword` (scrypt, comparação em tempo constante).
4. Rejeição de usuário inexistente, senha inválida e usuário inativo.
5. Sessão em cookie `upa_sessao` assinado com HMAC-SHA256 (crypto nativo): `HttpOnly`, `SameSite=Lax`, `Secure` em produção, validade de 8 horas; usuário recarregado do banco a cada verificação (sessão revogada ao inativar).
6. Logout via `POST /api/auth/logout` + botão "Sair" na sidebar.
7. Proteção da rota `/usuarios` (redirect para `/login` sem sessão).
8. Proteção de `POST /api/usuarios` e `PATCH /api/usuarios/[id]` (HTTP 401 sem sessão, antes de qualquer acesso ao banco).
9. Testes automatizados das regras críticas (18 novos testes, Prisma mockado — sem tocar em banco).

## Escopo excluído (por definição da fase)

- Recuperação/redefinição de senha.
- Cadastro público de usuários.
- Perfis e permissões granulares.
- MFA/2FA.
- Auditoria completa de login.
- Proteção dos demais módulos (dashboard, OS, caixa, estoque, relatórios etc.).
- Qualquer alteração em financeiro, estoque, caixa, OS, pagamentos ou relatórios.

---

## Cenários executados — ✅ TODOS APROVADOS

| # | Cenário | Dado usado | Resultado esperado | Resultado obtido |
|---|---|---|---|---|
| 1 | Rota protegida sem sessão | Acesso direto a `/usuarios` deslogado | Redirect para `/login` | ✅ Página "Login \| UPA do Tênis" exibida |
| 2 | Login com usuário inexistente | `inexistente@exemplo.com` / senha qualquer | Mensagem genérica, sem revelar existência | ✅ "E-mail ou senha inválidos." (HTTP 401) |
| 3 | Login com senha incorreta | Usuário de teste ativo / senha errada | Mesma mensagem genérica do cenário 2 | ✅ "E-mail ou senha inválidos." (HTTP 401) |
| 4 | Login válido | Usuário de teste ativo / senha correta | Autenticar e redirecionar para `/dashboard` | ✅ HTTP 200 no `/api/auth/login`, redirect para `/dashboard` |
| 5 | Cookie de sessão inacessível ao JS | `document.cookie` após login | Vazio (cookie HttpOnly) | ✅ `document.cookie` retornou string vazia |
| 6 | Rota protegida com sessão | Acesso a `/usuarios` logado | Página carrega normalmente | ✅ Título "Usuários \| UPA do Tênis", botão "Sair" presente |
| 7 | API protegida sem sessão | `POST /api/usuarios` sem cookie (fora do browser) | HTTP 401, nada gravado no banco | ✅ `401 {"message":"Não autenticado."}` |
| 8 | Logout | Clique no botão "Sair" | Sessão encerrada, volta ao login | ✅ Botão exibiu "Saindo...", redirect para `/login` |
| 9 | Sessão encerrada após logout | Acesso a `/usuarios` após logout | Redirect para `/login` | ✅ Redirecionado |
| 10 | Usuário inativo com senha correta | Usuário de teste inativado / senha correta | Bloqueio com mensagem específica | ✅ "Usuário inativo. Procure o administrador do sistema." (HTTP 403) |
| 11 | Hash de senha não exposto ao frontend | Respostas do login e da listagem | Nenhum campo `senhaHash` em payloads | ✅ Login retorna apenas `id`, `nome`, `email`; listagem usa `select` explícito |
| 12 | Console do browser | Toda a sessão | Sem erros | ✅ Apenas logs de Fast Refresh/DevTools |

### Cobertura automatizada (executada em `npm run test`)

- `src/lib/auth-session.test.ts` — token válido, expirado, payload adulterado, assinatura adulterada, malformado.
- `src/lib/auth-service.test.ts` — login válido, senha incorreta, usuário inexistente (mesma resposta de senha incorreta), usuário inativo, não revelação de inatividade com senha errada, revogação de sessão de usuário inativado.
- `src/app/api/usuarios/usuarios-api-auth.test.ts` — POST/PATCH sem sessão → 401; token adulterado → 401; sessão de usuário inativado → 401; sessão válida prossegue para validação do corpo.

## Comandos executados e resultados

| Comando | Resultado |
|---|---|
| `git status` / `git diff --stat` / `git diff --name-status` | 7 arquivos modificados + 9 novos; 52 inserções, 3 remoções; sem arquivos temporários |
| `npm run lint` | ✔ Sem erros ou warnings |
| `npm run test` | ✔ 20 arquivos, 163 testes aprovados |
| `npm run build` | ✔ Build de produção completo; rotas `/login`, `/api/auth/login` e `/api/auth/logout` presentes |

## Evidências esperadas (para re-execução manual)

1. `/usuarios` deslogado → redirect para `/login`.
2. Senha errada e e-mail inexistente → mesma mensagem genérica nos dois casos (aba de rede: HTTP 401).
3. Login válido → HTTP 200 com cookie `upa_sessao` (`HttpOnly`, `SameSite=Lax`) e redirect para `/dashboard`; `document.cookie` vazio no console.
4. `POST /api/usuarios` sem cookie (ex.: via curl/Invoke-WebRequest) → `401 {"message":"Não autenticado."}`.
5. Botão "Sair" → volta ao login; `/usuarios` exige login novamente.
6. Usuário inativado com senha correta → HTTP 403 "Usuário inativo. Procure o administrador do sistema."; em sessão já aberta, recarregar página protegida expulsa para `/login`.

## Registro técnico

### 1. Ajuste de tooling em `.claude/launch.json`

Adicionado `"autoPort": true` à configuração do dev server usado pelo preview do Claude Code, para permitir porta alternativa quando a 3000 está ocupada por outra sessão. O arquivo não é lido pela aplicação (apenas pelo tooling local de desenvolvimento) — mudança sem impacto em runtime, mantida no commit como ajuste de tooling.

### 2. Variável de ambiente nova

`AUTH_SESSION_SECRET` (mínimo 16 caracteres) documentada em `.env.example` e `.env.production.example`. Em desenvolvimento/teste há fallback fixo; **em produção a variável é obrigatória** — sem ela, criação/verificação de sessão lança erro.

### 3. Sem alteração de schema

Nenhuma mudança em `prisma/schema.prisma` ou migrações. A fase usa exclusivamente o model `Usuario` existente.

### 4. Incidente de ambiente durante a validação final (sem relação com o código)

Na segunda execução de `npm run test` (fechamento da fase), 13 testes pré-existentes de estoque falharam com `Can't reach database server at localhost:5432`: o Docker Desktop (que hospeda o container `upa-postgres`) havia sido encerrado entre as sessões. Após reiniciar o Docker Desktop (o container subiu sozinho via `restart: always`), a suíte completa passou novamente (163/163). Nenhum teste de autenticação depende do banco (todos usam Prisma mockado).

## Riscos remanescentes

- **Bootstrap circular:** o seed não cria usuários e `/usuarios` agora exige login — em banco novo, o primeiro usuário precisa ser criado fora da UI (script direto no Prisma). Não resolvido nesta fase por decisão de escopo.
- **`AUTH_SESSION_SECRET` obrigatório em produção:** deploy sem a variável impede login. Deve constar no checklist de deploy.
- **Demais módulos sem proteção:** caixa, OS, dashboard, relatórios etc. continuam acessíveis sem login (intencional nesta fase).
- **Sem rate limiting no login:** força bruta é mitigada apenas pelo custo do scrypt; aceitável para sistema interno, revisar antes de exposição externa.
- A suíte de testes (`npm run test`) continua apagando dados de insumos do banco do `.env` — condição pré-existente do projeto, já documentada.

## Pendências (registradas para próxima fase)

1. Resolver o bootstrap do primeiro usuário/admin (script ou seed autorizado).
2. Incluir `AUTH_SESSION_SECRET` no `CHECKLIST_DEPLOY.md` e no procedimento de deploy.
3. Planejar a proteção gradual dos demais módulos (com plano aprovado, módulo a módulo).
4. Avaliar rate limiting / bloqueio temporário após tentativas falhas de login.

## Veredito

```markdown
# Veredito — Autenticação Básica de Usuários (Login)

[x] Aprovado
[ ] Aprovado com ressalvas
[ ] Reprovado

Observações:
- Todos os critérios de aceite da fase atendidos.
- Pendências registradas acima são itens de fases futuras, não defeitos desta entrega.
```

## Recomendação

Fase apta para commit e fechamento. Antes do próximo deploy em produção, gerar e configurar `AUTH_SESSION_SECRET` e garantir que exista ao menos um usuário ativo no banco de produção (criado na fase de Cadastro de Usuários).
