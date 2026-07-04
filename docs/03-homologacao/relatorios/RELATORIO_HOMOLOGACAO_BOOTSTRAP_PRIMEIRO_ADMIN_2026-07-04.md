# Relatório de Homologação — Bootstrap do Primeiro Admin

## Resumo executivo

A fase Bootstrap do Primeiro Admin resolve o bootstrap circular criado pela fase de Autenticação/Login: com `/usuarios` e as APIs de usuários exigindo sessão, e o seed não criando usuários, um banco novo ficava sem caminho para o primeiro login. O script `npm run bootstrap:admin` cria o primeiro usuário administrador **somente quando a tabela `Usuario` está vazia**, reutilizando integralmente a validação (`usuarioCriarSchema`), o hash de senha (`hashPassword`/scrypt) e a seleção pública sem hash (`usuarioPublicoSelect`) já homologados na fase anterior. Não há endpoint HTTP público para o bootstrap — apenas CLI. Todos os cenários de homologação foram executados com sucesso, incluindo a criação do admin real via fluxo interativo e login real na aplicação. Lint, testes (171) e build passaram. Nenhuma área crítica (financeiro, caixa, estoque, insumos, OS, dashboard, relatórios) foi tocada, e `schema.prisma` não foi alterado.

## Ambiente

- **Projeto:** UPA do Tênis - Sapataria Alves
- **Branch:** `main`
- **Commit anterior (base da fase):** `d8036cf` — "feat: adicionar autenticacao basica de usuarios"
- **Data da homologação:** 04/07/2026
- **Responsável pela execução:** Claude Code (agente), a pedido de Bruno M Noronha
- **Ambiente:** `npm run dev` local (porta dinâmica via preview, 65139), Next.js 14.2.35, banco PostgreSQL local (banco do `.env`)
- **Estado inicial do banco:** tabela `Usuario` vazia (0 registros) — confirmado antes de iniciar
- **Método:** validação combinada — testes automatizados (Prisma mockado), execução real do CLI em banco de desenvolvimento vazio, e sessão de browser automatizado (preview) para login/navegação
- **Nota de segurança do processo:** a criação do admin real e o login real foram executados **pelo próprio Bruno**, diretamente no terminal e no navegador — o agente não teve acesso à senha em nenhum momento, apenas verificou o resultado (existência do usuário, formato do hash, respostas HTTP, ausência de exposição em tela/log)

## Escopo validado

1. `criarPrimeiroAdmin()` (`src/lib/bootstrap-admin.ts`): valida entrada com o schema homologado, conta usuários, cria somente se a contagem for zero, retorna apenas campos públicos.
2. CLI `scripts/bootstrap-admin.ts` (`npm run bootstrap:admin`): coleta credenciais via prompt interativo (senha sem eco) ou variáveis de ambiente; mensagens de erro/bloqueio claras; exit code 1 em falha/bloqueio.
3. Bloqueio quando já existe usuário cadastrado (idempotência de segurança — não é reset de senha nem criação de usuário adicional).
4. Validação de dados (nome, e-mail, senha) antes de qualquer acesso ao banco.
5. Armazenamento da senha com hash `scrypt:<salt>:<hash>`, nunca em texto puro.
6. Não exposição de senha/hash em resposta de CLI, tela ou log do servidor.
7. Login real do admin criado pelo bootstrap via `/login`.
8. Acesso autenticado a `/usuarios` com o admin criado.
9. Redirecionamento de acesso anônimo a `/usuarios`.

## Escopo excluído (por definição da fase)

- Reset/recuperação de senha de admin existente.
- Criação de usuários adicionais (fluxo já coberto por `/usuarios` autenticado, fase anterior).
- Qualquer alteração em financeiro, estoque, caixa, insumos, OS, dashboard ou relatórios.
- Qualquer alteração em `schema.prisma`.

---

## Cenários executados — ✅ TODOS APROVADOS

| # | Cenário | Dado usado | Resultado esperado | Resultado obtido |
|---|---|---|---|---|
| 1 | Bootstrap em banco vazio (verificação funcional, credenciais descartáveis) | Env vars de teste | Admin criado, exit 0 | ✅ "Administrador criado com sucesso" — usuário removido logo em seguida para reiniciar o cenário real |
| 2 | Bootstrap em banco vazio — admin real | Fluxo interativo, executado por Bruno no próprio terminal | Admin real criado, exit 0, sem exposição de senha | ✅ Usuário `admin@upadotenis.com.br` / "Administrador" criado, `ativo: true`; nenhuma senha/hash exibida na saída |
| 3 | Bloqueio de segunda execução | `npm run bootstrap:admin` com banco já contendo 1 usuário | Bloqueio, exit 1, nada criado | ✅ "Bootstrap bloqueado: o banco já possui 1 usuário(s) cadastrado(s)." (exit code 1); `usuario.create` não é chamado (confirmado em teste automatizado) |
| 4 | Formato do hash no banco | Consulta direta ao registro do admin real | `senhaHash` no formato `scrypt:<salt>:<hash>` | ✅ Hash com 3 partes separadas por `:`, prefixo `scrypt:`, 168 caracteres |
| 5 | Login real do admin criado | `/login`, credenciais definidas por Bruno | Autenticação bem-sucedida, redirect para `/dashboard` | ✅ `POST /api/auth/login → 200`, navegação para `/dashboard` confirmada |
| 6 | Acesso autenticado a `/usuarios` | Sessão do admin real | Página carrega com listagem/formulário | ✅ `GET /usuarios → 200`, título "Usuários \| UPA do Tênis", formulário e listagem renderizados |
| 7 | `/usuarios` sem sessão | Requisição sem cookie de sessão | Redirect (307) para `/login` | ✅ Log do servidor: `GET /usuarios 307`; `fetch` manual confirmou `type: "opaqueredirect"` |
| 8 | Ausência de exposição de senha/hash | HTML renderizado, resposta do login, logs do servidor | Nenhum campo `senhaHash` ou valor de senha em nenhum lugar | ✅ HTML de `/usuarios` não contém `senhaHash` nem `scrypt:`; `POST /api/auth/login` retorna apenas `id`/`nome`/`email` (conferido no código-fonte da rota); logs do servidor não contêm senha nem hash |
| 9 | Validação de dados sem tocar o banco | E-mail inválido, senha curta, nome curto (testes automatizados) | Erros de validação, `count`/`create` não chamados | ✅ 3 testes cobrindo os três casos, todos passando |

### Cobertura automatizada (executada em `npm run test`)

- `src/lib/bootstrap-admin.test.ts` (8 testes, Prisma mockado): criação com banco vazio; normalização de nome/e-mail; senha salva como hash scrypt verificável e nunca em texto puro; ausência de `senhaHash`/`senha` no resultado (inclusive via serialização JSON); bloqueio com usuário existente sem chamar `create`; rejeição de e-mail inválido, senha curta e nome curto sem consultar o banco.

## Comandos executados e resultados

| Comando | Resultado |
|---|---|
| `git status` / `git diff --stat` | Árvore limpa na base (`d8036cf`); ao final: `package.json` modificado (+1 linha) e 4 novos itens (`scripts/`, `src/lib/bootstrap-admin.ts`, `src/lib/bootstrap-admin.test.ts`, `docs/02-fases/bootstrap-admin/`) — nada commitado |
| `npm run lint` | ✔ Sem erros ou warnings |
| `npm run test` | ✔ 21 arquivos, 171 testes aprovados |
| `npm run build` | ✔ Build de produção completo; todas as 26 rotas geradas, incluindo `/usuarios` e `/login` inalteradas |
| `npm run bootstrap:admin` (1ª vez, banco vazio, credenciais reais) | ✔ Admin criado (exit 0) |
| `npm run bootstrap:admin` (2ª vez, banco com 1 usuário) | ✔ Bloqueado corretamente (exit 1) |

## Evidências (para re-execução manual)

1. Banco vazio → `npm run bootstrap:admin` interativo → mensagem de sucesso com nome/e-mail, sem senha/hash.
2. `/login` com as credenciais criadas → HTTP 200 em `POST /api/auth/login`, redirect para `/dashboard`.
3. `/usuarios` autenticado → HTTP 200, página renderizada.
4. `/usuarios` sem sessão → redirect (307) para `/login`.
5. `npm run bootstrap:admin` novamente → "Bootstrap bloqueado: o banco já possui 1 usuário(s) cadastrado(s)." (exit 1).
6. Prisma Studio ou consulta direta → `senhaHash` inicia com `scrypt:` e não contém a senha em texto puro.

## Registro técnico

### 1. Sem alteração de schema

Nenhuma mudança em `prisma/schema.prisma` ou migrações. A fase usa exclusivamente o model `Usuario` já existente.

### 2. Sem endpoint HTTP novo

O bootstrap é exclusivamente CLI (`scripts/bootstrap-admin.ts`); não há rota de API nova nem alteração nas rotas existentes de `/api/usuarios` ou `/api/auth`.

### 3. Modo não interativo documentado com ressalva

O CLI aceita `BOOTSTRAP_ADMIN_NOME/EMAIL/SENHA` via variáveis de ambiente para uso em automação/deploy. Isso foi usado apenas uma vez, com credenciais descartáveis, para validar a lógica funcional antes da criação do admin real (que foi feita via prompt interativo pelo próprio Bruno). A documentação técnica (`docs/02-fases/bootstrap-admin/DOCUMENTO_TECNICO_BOOTSTRAP_PRIMEIRO_ADMIN.md`) já alerta que o modo interativo é o recomendado por não deixar a senha no histórico do shell.

## Riscos remanescentes

- **Sem fluxo de reset de senha:** se o único admin esquecer a senha, a única saída é intervenção direta no banco — fora do escopo desta fase.
- **`AUTH_SESSION_SECRET` obrigatório em produção:** requisito já registrado na fase anterior, continua valendo; sem ele, sessão não funciona.
- **Modo não interativo expõe a senha na linha de comando/histórico do shell:** aceitável para uso pontual em deploy controlado, mas deve ser evitado em ambientes compartilhados — já documentado.
- Suite de testes (`npm run test`) continua com a condição pré-existente de apagar dados de insumos no banco do `.env` — não relacionado a esta fase.

## Pendências (registradas para próxima fase)

1. Nenhuma pendência funcional aberta para esta fase.
2. Avaliar, em fase futura, um fluxo de redefinição de senha para administradores.

## Veredito

```markdown
# Veredito — Bootstrap do Primeiro Admin

[x] Aprovado
[ ] Aprovado com ressalvas
[ ] Reprovado

Observações:
- Todos os critérios de aceite da fase foram atendidos e verificados com o admin real (não apenas com dados de teste).
- Bloqueio de segunda execução, hash em scrypt, login real e proteção de /usuarios confirmados de ponta a ponta.
- Nenhuma área crítica ou schema alterados.
```

## Recomendação

Fase apta para commit e fechamento. O banco de desenvolvimento já está com o admin real (`admin@upadotenis.com.br`) criado e funcional — não é necessário rodar o bootstrap novamente neste ambiente. Nenhum commit foi realizado até a conclusão deste relatório, conforme solicitado.
