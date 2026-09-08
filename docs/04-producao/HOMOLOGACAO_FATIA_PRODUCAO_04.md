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

- [x] Retenção/PITR real registrada em [PLANO_BACKUP_RESTORE.md](PLANO_BACKUP_RESTORE.md) — plano `launch_v3`, janela de 24 h (`history_retention_seconds = 86400`), **sem** agendamento de snapshots; lido via API do Neon em 2026-09-08
- [x] `pg_dump` da branch `production` executado com sucesso — arquivo: `neon_prod_20260908T030627Z.dump` (formato custom, 63.042 bytes, endpoint **direct**), validado com `pg_restore --list`
- [ ] Drill de PITR executado em branch `restore-test-________` — **não executado** (ver ressalva abaixo)
- [x] Drill do **dump lógico** executado a partir do artefato **recuperado do armazenamento offsite**, não do dump local
- [x] Ambiente de restore descartável destruído após a coleta de evidências
- [x] Procedimento de Instant Rollback da Vercel conferido em [PLANO_ROLLBACK.md](PLANO_ROLLBACK.md)

### 10.1 Execução de 2026-09-08 — backup offsite e restore

Cadeia exercitada de ponta a ponta, com Production em **somente leitura**
(`written_data_bytes = 0` na branch ao fim da execução):

```text
production → pg_dump (direct) → GPG AES256 → Google Drive
          → download do Drive → SHA-256 → decrypt → restore isolado → conferência
```

| Item | Valor |
|---|---|
| Origem | Neon, branch `production`, database `upa-do-tenis`, PostgreSQL 18.6, `aws-sa-east-1` |
| Artefato offsite | `neon_prod_20260908T030627Z.dump.gpg`, 14.598 bytes, Google Drive |
| Integridade | SHA-256 do cifrado idêntico antes do upload e após o download; SHA-256 do dump decifrado idêntico ao original |
| Ambiente de restore | container PostgreSQL 18 descartável, **isolado do Neon** — nunca `production` nem `preview` |
| `pg_restore` | concluído com `--exit-on-error`, sem erros e sem warnings, após filtrar `pg_session_jwt` do TOC |

Conferência contra o baseline colhido antes do dump:

| Entidade | Production | Restore |
|---|---:|---:|
| Usuario | 2 | 2 |
| Cliente | 1 | 1 |
| Servico | 35 | 35 |
| Produto | 35 | 35 |
| Insumo | 35 | 35 |
| OrdemServico, ItemOrdemServico, Pagamento | 0 | 0 |
| Venda, ItemVenda | 0 | 0 |
| Caixa, MovimentacaoCaixa | 0 | 0 |
| FormaPagamento | 4 | 4 |
| RegistroRateLimit | 2 | 2 |
| migrations | 6 | 6 |

Estrutura: 20 tabelas, 75 índices, 23 chaves estrangeiras e 20 chaves
primárias nos dois lados. O hash conjunto de nomes e checksums das seis
migrations é idêntico. O diff de schema entre origem e restaurado acusa
**apenas** a linha do `CREATE EXTENSION pg_session_jwt`.

Constraints foram exercitadas ativamente, não só contadas: inserções
propositais foram rejeitadas por chave estrangeira em `Pagamento` e em
`MovimentacaoCaixa`, e por unicidade em `Usuario`. Nenhuma escrita de teste
permaneceu no banco restaurado.

Limpeza: dump em claro, artefato baixado e arquivo com a connection string
removidos; container de restore destruído. Preservados o artefato offsite e as
evidências não sensíveis.

### 10.2 Ressalvas desta homologação

1. **Passphrase fora de cofre.** Vive apenas no disco da máquina de operação.
   Perdê-la torna o backup irrecuperável; comprometer a máquina pode expor
   artefato e segredo juntos. **Bloqueia** considerar a estratégia de DR madura.
2. **Execução manual, sem recorrência.** O que está provado é capacidade
   técnica. Sem automação semanal não existe RPO offsite garantido.
3. **Drill de PITR nativo não executado** nesta rodada. Foi validada a camada
   offsite, que é a que protege contra indisponibilidade do próprio Neon.
4. **RTO de desastre não medido.** O tempo apurado cobre apenas o restore
   técnico contra um PostgreSQL já disponível.
5. **Rotina `rclone` do runbook local não é executável** na máquina atual; o
   upload validado usou outro caminho.

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
