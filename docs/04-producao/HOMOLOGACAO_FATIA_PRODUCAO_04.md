# Homologação — Fatia Produção 04 (Vercel + Neon)

Registro de evidências da execução do [WALKTHROUGH_FATIA_PRODUCAO_04.md](WALKTHROUGH_FATIA_PRODUCAO_04.md).

| Campo | Valor |
|---|---|
| Data da execução | `____-__-__` |
| Executor | |
| Commit homologado | |
| Issue | [#10](https://github.com/BrunoMNoronha/upa-do-tenis/issues/10) |
| Status | ☐ Aprovado ☐ Aprovado com ressalvas ☐ Reprovado |

> [!CAUTION]
> Este documento é versionado. Registrar apenas **hostnames** e e-mails. Nenhuma connection string completa, senha, token ou secret.

---

## 1. Decisões efetivas

| Item | Planejado | Executado | Observação |
|---|---|---|---|
| Região Neon | AWS sa-east-1 (São Paulo) | | |
| Região Vercel Functions | `gru1` | | |
| Plano Neon | — | | |
| Plano Vercel | — | | |
| Retenção / PITR do Neon | ler no console | | valor **real**, não estimado |
| Branch de Preview | `preview` fixa e vazia | | |

---

## 2. Endpoints

| Ambiente | Branch Neon | Endpoint (host, sem credenciais) |
|---|---|---|
| Production | `production` | |
| Preview | `preview` | |

- [ ] Os dois endpoints são **diferentes**.

---

## 3. Gates locais

| Comando | Resultado |
|---|---|
| `corepack pnpm install --frozen-lockfile` | |
| `corepack pnpm run typecheck` | |
| `corepack pnpm run lint` | |
| `corepack pnpm run test` | |
| `corepack pnpm exec prisma validate` | |
| `corepack pnpm exec prisma generate` | |
| `corepack pnpm run build` | |
| `git grep -nE "postgres(ql)?://" -- . ':!*.example' ':!docs/**' ':!*.yml'` | esperado: sem hosts/credenciais reais |

---

## 4. Migrations

### 4.1 Production

Run do workflow `Migrations (Neon)`: `____________`

- Aprovado por (required reviewer): `____________`
- `Datasource "db"` do passo **Status antes** — host: `____________`
- Resultado do **Status depois**:

```
(colar aqui — esperado: Database schema is up to date! com 4 migrations)
```

### 4.2 Preview

Run: `____________`

- Host do `Status antes`: `____________`
- Resultado do `Status depois`:

```
```

- [ ] O host da Preview é **diferente** do host de Production.

---

## 5. Build e deploy na Vercel

| Item | Evidência |
|---|---|
| URL de Production | |
| URL de Preview usada na validação | |
| `Detected package manager` | |
| Versão do Node no build | |
| `Generated Prisma Client` presente no log | ☐ |
| Status do deployment | ☐ Ready |
| Contingência aplicada (se houve) | ☐ nenhuma ☐ `ENABLE_EXPERIMENTAL_COREPACK` ☐ Install Command override ☐ `output: standalone` ☐ outra: |

---

## 6. Variáveis de ambiente

- [ ] `DATABASE_URL` de Production = URL **pooled** da branch `production`, com `pgbouncer=true`
- [ ] `DATABASE_URL` de Preview = URL **pooled** da branch `preview`
- [ ] `AUTH_SESSION_SECRET` distinto entre Production e Preview
- [ ] Nenhuma variável no escopo **All Environments**
- [ ] Escopo **Development** da Vercel vazio
- [ ] `DATABASE_URL_DIRECT` **ausente** da Vercel; presente apenas nos GitHub Environments
- [ ] Nenhum `BOOTSTRAP_ADMIN_*` cadastrado como secret permanente em nenhum provedor
- [ ] Environment `production` do GitHub com **required reviewers**

Saída de `vercel env ls` (valores mascarados):

```
```

---

## 7. Bootstrap do administrador

| Item | Evidência |
|---|---|
| E-mail do admin de Production | |
| Primeira execução | esperado `Administrador criado com sucesso` |
| **Segunda execução (obrigatória)** | esperado `Bootstrap bloqueado: o banco já possui 1 usuário(s)`, exit 1 |
| `BOOTSTRAP_ADMIN_*` removidos do `.env.neon.prod` | ☐ |
| `.env.neon*` confirmado como ignorado (`git status --short`) | ☐ |
| Login em `/login` bem-sucedido | ☐ |
| Nenhum seed de dados fictícios rodado em Production | ☐ |

---

## 8. Prova de isolamento Preview × Production

### 8.1 Direta

- Cliente criado no Preview: `ISOLAMENTO-PREVIEW-____________`
- Busca `/clientes?busca=ISOLAMENTO` em Production: `____ resultados` (esperado **0**)
- `select nome, "criadoEm" from "Cliente" where nome like 'ISOLAMENTO-%'` na branch `preview`:

```
```

- Mesma query na branch `production`:

```
(esperado: 0 linhas)
```

### 8.2 Inversa

- Cliente criado em Production: `ISOLAMENTO-PROD-____________`
- Mesma query na branch `preview`: `____ linhas` (esperado **0**)

### 8.3 Configuração

- [ ] `vercel env ls` mostra `DATABASE_URL` e `AUTH_SESSION_SECRET` duas vezes cada, em escopos distintos, sem "All Environments" (seção 6)
- [ ] `vercel env pull` **não** foi executado

### 8.4 Infraestrutura

- [ ] Console do Neon com duas branches de endpoints distintos
- [ ] Atividade na branch `preview` correlacionada ao passo 8.1; nenhuma atividade correspondente na `production`
- [ ] Deployment Protection com Vercel Authentication ativa no Preview

**Conclusão do isolamento:** ☐ comprovado ☐ não comprovado — justificativa:

---

## 9. Validação funcional em cloud

| Passo | Resultado |
|---|---|
| Login do admin | |
| Criar cliente | |
| Criar serviço | |
| Criar ordem de serviço | |
| Persistência após reload | |
| Persistência após redeploy | |
| Runtime Logs sem `P1001` | ☐ |
| Runtime Logs sem `P2024` | ☐ |
| Runtime Logs sem erro de prepared statement | ☐ (se houver, falta `pgbouncer=true`) |
| Registros sintéticos removidos ou documentados | ☐ |

---

## 10. Backup e rollback

- [ ] Retenção/PITR real registrada em [PLANO_BACKUP_RESTORE.md](PLANO_BACKUP_RESTORE.md)
- [ ] `pg_dump` da branch `production` executado com sucesso — arquivo: `____________`
- [ ] Drill de PITR executado em branch `restore-test-________`
- [ ] Drill do **dump lógico** executado: `pg_restore` do arquivo offsite em branch vazia `restore-dump-________`, com contagens conferidas e `migrate status` coerente
- [ ] As duas branches de teste foram removidas
- [ ] Procedimento de Instant Rollback da Vercel conferido em [PLANO_ROLLBACK.md](PLANO_ROLLBACK.md)

---

## 11. Ressalvas e pendências

| # | Descrição | Severidade | Encaminhamento |
|---|---|---|---|
| 1 | | | |
| 2 | | | |

---

## 12. Critérios de aceite

- [ ] Projeto Vercel criado, vinculado ao repositório, Production Branch `main`
- [ ] Projeto Neon criado com branches `production` e `preview` de endpoints distintos
- [ ] 4 migrations aplicadas nas duas branches via workflow manual aprovado
- [ ] Nenhuma execução de `migrate dev`, `db push`, `migrate reset` ou `seed` contra Production
- [ ] Secrets somente nos provedores; nada versionado
- [ ] Deployment Protection ativa no Preview
- [ ] Bootstrap executado uma vez e bloqueado na segunda
- [ ] **Isolamento Preview × Production comprovado pelas quatro provas**
- [ ] Fluxo principal validado em Production com dados sintéticos
- [ ] Gates locais verdes
- [ ] `prisma/schema.prisma` não alterado
- [ ] Nenhuma regra de negócio, cálculo financeiro, estoque, insumo ou caixa alterado
