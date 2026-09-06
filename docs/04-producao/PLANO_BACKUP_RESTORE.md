# Plano de Backup e Restore — Produção

> [!IMPORTANT]
> Para o **ambiente local em Docker da loja** (container `upa-db`), o
> procedimento automatizado e testado está em
> [RUNBOOK_BACKUP_RESTORE_LOCAL.md](RUNBOOK_BACKUP_RESTORE_LOCAL.md):
> `pg_dump -Fc`, validação com `pg_restore --list`, SHA-256, envio
> criptografado ao Google Drive via `rclone crypt`, verificação remota,
> retenção, tarefa diária do Windows, restore não destrutivo em banco isolado
> e procedimento manual de recuperação com rollback.
>
> O documento abaixo permanece como referência da estratégia geral e do
> ambiente Neon.

## Estratégia de backup

- Ferramenta: `pg_dump` (dump lógico em SQL puro, formato texto).
- Frequência mínima recomendada: **diária**, fora do horário de maior movimento da sapataria, mais um backup manual antes de qualquer deploy ou migration em produção.
- Retenção mínima recomendada: 7 backups diários + 4 semanais, guardados fora do servidor de aplicação (armazenamento separado — bucket externo, storage do provedor de banco gerenciado, ou outro servidor).
- Nomenclatura: `backup_upa_AAAAMMDD_HHMMSS.sql`, para ordenação cronológica natural.

```bash
pg_dump "$DATABASE_URL" > backup_upa_$(date +%Y%m%d_%H%M%S).sql
```

Nunca imprimir `$DATABASE_URL` em log de CI/CD ou console compartilhado — a credencial fica embutida na string de conexão.

## Estratégia de restore

Restore **sempre** primeiro em um banco temporário/separado, nunca diretamente sobre o banco de produção em uso:

```bash
psql "$DATABASE_URL_RESTORE_TEST" < backup_upa_AAAAMMDD_HHMMSS.sql
```

`DATABASE_URL_RESTORE_TEST` deve apontar para um banco criado especificamente para o teste (nome sugerido: `upa_restore_teste` ou `upa_producao_staging`), nunca reaproveitar o banco de produção real nem o de desenvolvimento.

## Validação pós-restore

Checklist mínimo após qualquer restore:

1. Contagem de tabelas do schema restaurado bate com o schema esperado:
   ```sql
   SELECT count(*) FROM information_schema.tables WHERE table_schema='public';
   ```
2. Contagem de registros de pelo menos uma tabela crítica (ex.: `Usuario`, `OrdemServico`, `MovimentacaoCaixa`) bate com o dump de origem.
3. `pnpm exec prisma migrate status` contra o banco restaurado não acusa migration pendente nem divergência de schema.
4. Login funcional contra o banco restaurado (smoke test manual).

## Teste realizado (ambiente local, 2026-07-06)

Executado ciclo completo de backup → restore → validação → limpeza contra um container Postgres 16 local (Docker), usando o banco de desenvolvimento como origem (nenhum dado de produção real existe ainda neste projeto):

| Etapa | Resultado |
|---|---|
| `pg_dump` do banco de origem | OK — dump de 1298 linhas / 48 KB gerado |
| Criação de banco temporário isolado | OK |
| `psql` restore do dump no banco temporário | OK, sem erros |
| Contagem de tabelas (schema `public`) | 19 no original = 19 no restaurado |
| Contagem de registros (`Usuario`) | 1 no original = 1 no restaurado |
| Limpeza do banco temporário e do arquivo de dump | OK — nenhum artefato residual |

Procedimento validado tecnicamente. **Pendência:** repetir este mesmo teste contra o banco de produção real (ou uma cópia dele) assim que ele existir, antes do go-live — o teste acima prova o procedimento, não substitui a validação contra dados de produção reais.

## Scripts automatizados

Os comandos abaixo foram adicionados ao repositório para padronizar backup e restore em desktop Windows com Docker local:

```powershell
# backup local com validação e retenção
pwsh ./scripts/backup/Backup-Database.ps1 -KeepLocalBackups 7

# restore em banco temporário (padrão seguro)
pwsh ./scripts/backup/Restore-Database.ps1 -BackupPath ./backups/database/upa_do_tenis_2026-01-01_02-00-00.dump -AllowProduction:$false

# agendamento diário no Windows
pwsh ./scripts/backup/Install-BackupTask.ps1 -TaskName UPA-Backup-Diario -StartTime "02:00"
```

Observações:

- O backup usa `pg_dump -Fc` dentro do contêiner `upa-db` e valida o archive antes do upload.
- O script gera `.sha256` e preserva o backup local válido caso a etapa de upload falhe.
- O restore padrão exige banco temporário/isolado; `-AllowProduction` é reservado para recuperação explícita do ambiente operacional, com aprovação manual.

## Pendências

- Definir e documentar o destino de armazenamento externo dos backups (fora do servidor de aplicação).
- Automatizar a rotina de backup diário (cron/scheduler do provedor) quando o ambiente de produção estiver definido.
- Repetir o teste de restore contra o banco de produção real antes do go-live.

---

## Neon (ambiente cloud)

Aplica-se ao ambiente descrito em [FATIA_PRODUCAO_04_VERCEL_NEON.md](FATIA_PRODUCAO_04_VERCEL_NEON.md). Todos os comandos usam a URL **direct/unpooled** do Neon — o pooler não é adequado para `pg_dump`/`pg_restore`.

### Camada 1 — recursos nativos do Neon

O Neon oferece *branch restore* e *point-in-time restore* (PITR) sobre a janela de history do plano contratado.

> [!IMPORTANT]
> A retenção real depende do plano e deve ser **lida no console do Neon**, nunca estimada. Registrar aqui:
>
> - Plano contratado: `____________`
> - Janela de history/PITR: `____________`
> - Data da verificação: `____-__-__`

Recursos nativos **não substituem backup**: eles não protegem contra exclusão do projeto Neon, perda de acesso à conta ou incidente do provedor.

### Camada 2 — dump lógico offsite

Cadência: **semanal**, mais um dump **imediatamente antes de cada `migrate deploy`** em Production.

Usando a imagem Postgres que o projeto já utiliza, sem exigir `pg_dump` instalado na máquina:

```bash
mkdir -p backups
docker run --rm postgres:16 pg_dump --no-owner --format=custom "<url DIRECT da branch production>" \
  > backups/neon_prod_$(date +%Y%m%d_%H%M).dump
```

`backups/` já está no `.gitignore`, mas não existe em um clone limpo — daí o `mkdir -p`, sem o qual o shell falha ao abrir o destino da redireção antes mesmo de subir o container. Guardar os arquivos fora da máquina de operação.

> [!CAUTION]
> A connection string carrega a credencial. Nunca ecoar o comando em log de CI, print ou canal compartilhado. Preferir carregar a URL de `.env.neon.prod` (ignorado pelo git) em vez de digitá-la.

Restore de um dump lógico em uma branch nova:

```bash
docker run --rm -i postgres:16 pg_restore --no-owner -d "<url DIRECT da branch alvo>" < <arquivo.dump>
```

### Drill de restore (obrigatório antes do go-live cloud)

1. No console do Neon, criar a branch `restore-test-<AAAAMMDD>` a partir de um timestamp de alguns minutos atrás.
2. Copiar a URL **direct** dessa branch.
3. Validar coerência de schema:
   ```bash
   DATABASE_URL="<url DIRECT da restore-test>" corepack pnpm exec prisma migrate status
   ```
4. Rodar as contagens da seção "Validação pós-restore" no SQL Editor do Neon, comparando com a branch `production`.

Os passos 1 a 4 validam apenas o **PITR nativo**. O drill só está completo quando o **dump lógico** também é restaurado — sem isso, um arquivo vazio, truncado ou incompatível passa por todo o checklist de go-live e só é descoberto no incidente em que o próprio projeto Neon estiver indisponível, que é exatamente o cenário para o qual a camada offsite existe:

5. Criar uma segunda branch `restore-dump-<AAAAMMDD>` **vazia** (não a partir de `production`) e restaurar nela o arquivo gerado na camada 2:
   ```bash
   docker run --rm -i postgres:16 pg_restore --no-owner -d "<url DIRECT da restore-dump>" < backups/neon_prod_<AAAAMMDDHHMM>.dump
   ```
6. Validar o resultado com os mesmos critérios da seção "Validação pós-restore": contagem de tabelas, contagem de registros de `Usuario`, `OrdemServico` e `MovimentacaoCaixa` conferindo com a origem, e schema coerente:
   ```bash
   DATABASE_URL="<url DIRECT da restore-dump>" corepack pnpm exec prisma migrate status
   ```
   Um `pg_restore` que termina com erro, ou contagens zeradas, **reprova o drill**: significa que o backup offsite não existe de fato.
7. **Excluir as duas branches de teste** — elas consomem quota e mantêm uma cópia dos dados reais.

Registrar o resultado em [HOMOLOGACAO_FATIA_PRODUCAO_04.md](HOMOLOGACAO_FATIA_PRODUCAO_04.md), seção 10.

### Pendências específicas do Neon

- Automatizar o dump semanal offsite (hoje é manual).
- Confirmar a retenção real do plano e reavaliá-la se o plano mudar.
