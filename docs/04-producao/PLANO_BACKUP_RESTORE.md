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
> A retenção real depende do plano e deve ser **lida no console do Neon**, nunca estimada. Verificado via API do Neon em 2026-09-08:
>
> - Plano contratado: `launch_v3`
> - Janela de history/PITR: **24 h** (`history_retention_seconds = 86400`)
> - Snapshots: **1 manual** (`production` em 2026-09-07 01:34 UTC). Nenhum agendamento de snapshot configurado (`get_snapshot_schedule` retorna vazio).
> - Data da verificação: 2026-09-08

A janela de 24 h é o limite duro do PITR nativo: um dano detectado depois desse
prazo não é mais recuperável por branch restore. Isso torna a camada offsite
obrigatória, não opcional.

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

### Extensão `pg_session_jwt` — tratamento obrigatório no restore

O dump de `production` inclui `CREATE EXTENSION IF NOT EXISTS pg_session_jwt`,
extensão **exclusiva do Neon** (usada pelo Neon Auth / Data API, hoje
desativado no projeto). Um `pg_restore --exit-on-error` contra PostgreSQL
padrão **falha na primeira instrução**:

```text
pg_restore: error: extension "pg_session_jwt" is not available
```

Este é exatamente o cenário de desastre em que a camada offsite existe: o Neon
indisponível. O restore só funciona filtrando a extensão do TOC:

```bash
# filtra SOMENTE pg_session_jwt; qualquer outra extensão continua no TOC
pg_restore -l <arquivo>.dump   | grep -vE '(EXTENSION - pg_session_jwt|COMMENT - EXTENSION pg_session_jwt)' > toc.list
pg_restore --no-owner --no-privileges --exit-on-error -L toc.list -d "<url alvo>" <arquivo>.dump
```

> [!WARNING]
> Não use um filtro genérico por `EXTENSION`. Ele removeria **todas** as
> extensões do TOC, e não apenas a incompatível — um restore assim pode falhar
> em objetos dependentes ou, pior, concluir sem funcionalidade que a aplicação
> espera. Confira antes o que o dump traz:
>
> ```bash
> pg_restore -l <arquivo>.dump | grep 'EXTENSION'
> ```
>
> Se aparecer alguma extensão além de `pg_session_jwt`, decida caso a caso e
> atualize esta seção.

Nenhuma tabela, índice, constraint ou dado da aplicação depende dessa extensão:
o diff de schema entre origem e restaurado acusa apenas a própria linha do
`CREATE EXTENSION`.

### Procedimento offsite validado ponta a ponta (2026-09-08)

Executado contra `production` real, somente leitura. Cadeia completa provada:
Production → dump → criptografia → Google Drive → download → checksum →
descriptografia → restore isolado → integridade.

```bash
# 1. dump pelo endpoint DIRECT (nunca o -pooler), sem instalar pg_dump no host
mkdir -p backups/database
TS=$(date -u +%Y%m%dT%H%M%SZ)
docker run --rm -e PGURL="$PGURL_DIRECT" postgres:18-alpine   sh -c 'pg_dump --no-owner --no-privileges --format=custom "$PGURL"'   > backups/database/neon_prod_$TS.dump

# 2. validar o archive e gerar o checksum do dump
docker run --rm -i postgres:18-alpine pg_restore --list < backups/database/neon_prod_$TS.dump
sha256sum backups/database/neon_prod_$TS.dump | awk '{print $1}' > backups/database/neon_prod_$TS.dump.sha256

# 3. criptografar (a senha vive fora do repositório, nunca em log ou doc)
gpg --batch --pinentry-mode loopback --passphrase-file "$PASSFILE"   --symmetric --cipher-algo AES256 --s2k-digest-algo SHA512 --s2k-count 65011712   --output backups/database/neon_prod_$TS.dump.gpg backups/database/neon_prod_$TS.dump
sha256sum backups/database/neon_prod_$TS.dump.gpg | awk '{print $1}' > backups/database/neon_prod_$TS.dump.gpg.sha256

# 4. manifesto: metadados que permitem validar o restore sem consultar a origem
cat > backups/database/neon_prod_$TS.dump.manifest.json <<JSON
{
  "gerado_utc": "$(date -u +%FT%TZ)",
  "origem": {"provedor": "neon", "branch": "production", "endpoint": "direct"},
  "dump":    {"formato": "custom", "bytes": $(stat -c%s backups/database/neon_prod_$TS.dump),
              "sha256": "$(cat backups/database/neon_prod_$TS.dump.sha256)"},
  "cifrado": {"bytes": $(stat -c%s backups/database/neon_prod_$TS.dump.gpg),
              "sha256": "$(cat backups/database/neon_prod_$TS.dump.gpg.sha256)"},
  "contagens": $(CONTAGENS_JSON)
}
JSON

# 5. REMOVER o dump em claro — só depois de confirmar que o .gpg existe e é íntegro
if [ -s backups/database/neon_prod_$TS.dump.gpg ]    && gpg --batch --pinentry-mode loopback --passphrase-file "$PASSFILE"           --decrypt backups/database/neon_prod_$TS.dump.gpg       | sha256sum -c <(echo "$(cat backups/database/neon_prod_$TS.dump.sha256)  -"); then
  shred -u backups/database/neon_prod_$TS.dump 2>/dev/null     || rm -f backups/database/neon_prod_$TS.dump
else
  echo "ARTEFATO CIFRADO INVÁLIDO — o dump em claro foi mantido para nova tentativa" >&2
  exit 1
fi

# 6. enviar ao Drive o TRIO: .gpg + .gpg.sha256 + .manifest.json
#    (nunca o .dump em claro)
# 7. baixar de volta, conferir o SHA-256 contra o .gpg.sha256 do próprio destino,
#    e só então descriptografar
# 8. restaurar em ambiente descartável, com o TOC filtrado (ver seção acima)
```

> [!IMPORTANT]
> **Suba o trio, não só o artefato.** Num desastre que leve a máquina de
> operação junto com o Neon, um Drive contendo apenas o `.gpg` é insuficiente:
> não haveria checksum confiável para validar o download nem contagens de
> referência para conferir o restore, já que a origem está indisponível. O
> `.gpg.sha256` e o `.manifest.json` precisam viver ao lado do artefato.

> [!CAUTION]
> **O dump em claro é uma cópia sem proteção dos dados de produção.** Ele só
> pode ser removido depois que o `.gpg` estiver criado e verificado, e nunca
> pode ser enviado ao armazenamento offsite. Se a verificação falhar, mantenha
> o `.dump` e repita a criptografia — apagar antes de ter artefato válido
> destrói o backup daquela execução.

> [!CAUTION]
> **A senha de criptografia é o backup.** Sem ela o artefato é irrecuperável.
> Ela não entra em repositório, Issue, PR, documento ou log — deve ficar no
> gerenciador de senhas da loja e numa segunda cópia física separada.

#### Política de retenção — Neon offsite

| Item | Definição |
|---|---|
| Frequência | Semanal, mais um dump imediatamente antes de cada `migrate deploy` em Production |
| Retenção | 8 semanais + 6 mensais no Drive |
| Cópias | 1 offsite (Google Drive) + PITR nativo de 24 h como camada independente |
| Expiração | Remoção manual só depois de confirmar que o backup seguinte foi validado |
| Responsável | Operador do repositório (hoje: mantenedor único) |
| Falha | Backup não gerado, checksum divergente ou upload não confirmado ⇒ **nada é apagado** e a execução é repetida antes de qualquer migration |

#### Tempos medidos, RPO e RTO

> [!IMPORTANT]
> Os números abaixo são de **uma execução manual comprovada**, não de um
> processo em regime. Enquanto a rotina semanal não estiver automatizada ou
> formalmente operacionalizada, o que existe é **capacidade técnica provada**,
> não garantia de recorrência — e sem recorrência não há RPO offsite.

Medido em 2026-09-08 contra a base real (9 MB lógicos, 20 tabelas, 6 migrations):

| Etapa | Duração |
|---|---|
| `pg_dump` (Neon → host, endpoint direct) | 5 s |
| Criptografia GPG | 1 s |
| Upload ao Google Drive | < 5 s |
| Download + verificação de checksum | < 5 s |
| Descriptografia | < 1 s |
| `pg_restore` em ambiente isolado | 1 s |
| Validação estrutural e de contagens | 1 s |

**PITR do Neon — não confundir retenção com RPO.** São duas grandezas
diferentes, e tratá-las como uma só cria expectativa errada na hora do
incidente:

| Grandeza | Valor | O que significa |
|---|---|---|
| Granularidade de recuperação (RPO alcançável) | segundos | Dentro da janela, restaura-se um ponto imediatamente anterior ao dano. A perda tende a zero, não a 24 h. |
| Horizonte de recuperação (retenção) | 24 h | Por quanto tempo esse ponto continua disponível. |

A consequência prática é abrupta, não gradual: um dano **detectado dentro de
24 h** é recuperado com perda de segundos; um dano **detectado depois** não é
recuperável por PITR de forma alguma — o recurso deixa de existir, em vez de
impor uma perda limitada a 24 h. O que a janela mede é o **tempo máximo para
detectar**, e é por isso que a camada offsite não é opcional.

**RPO offsite — alvo: até 7 dias de perda, ainda não garantido.** Aqui a
grandeza é mesmo perda de dados: o artefato é um instantâneo semanal, então
restaurar a partir dele descarta tudo que foi gravado desde o último dump. O número decorre da
cadência semanal *proposta* na política de retenção acima. A cadeia foi
validada de ponta a ponta uma vez, manualmente. Enquanto a execução semanal não
for automatizada ou formalmente operacionalizada, não há garantia de que o
backup offsite mais recente tenha no máximo sete dias — e este é justamente o
RPO que vale num desastre que atinja o próprio Neon.

**RTO técnico do restore — medido: menos de 1 minuto.** Cobre descriptografar,
restaurar e validar contra um PostgreSQL já disponível, para o dataset atual de
9 MB. Não extrapolar para bases de centenas de MB ou GB.

**RTO de desastre — ainda não medido.** Uma recuperação real acrescenta etapas
que não entraram nesta medição: decisão operacional, provisionamento de projeto
Neon novo, criação de roles, atualização de secrets no GitHub e na Vercel,
conferência de migrations e compatibilidade, promoção da aplicação e smoke
test. Medir esse número exige um exercício de desastre completo, que continua
pendente.

### Pendências específicas do Neon

Ordenadas por risco.

1. **Passphrase fora de cofre (alto).** Hoje ela vive apenas no disco de uma
   máquina. Isso cria dois riscos simétricos: perdê-la torna todo backup
   irrecuperável, e comprometer a máquina pode comprometer artefato e segredo
   ao mesmo tempo. Enquanto isso não for resolvido, a estratégia de DR não pode
   ser considerada madura.
2. **Execução manual (médio).** Automatizar o dump semanal offsite, com falha
   visível — workflow vermelho, não erro silencioso. É o que converte o RPO
   offsite de alvo em garantia.
3. **Dependências específicas do Neon no dump (médio).** O caso de
   `pg_session_jwt` mostra que objetos exclusivos do provedor podem entrar no
   artefato e reprovar um restore de emergência. O drill de restore precisa ser
   reexecutado periodicamente, não apenas uma vez.
4. **RTO de desastre não medido.** Exige um exercício completo, incluindo
   provisionamento e reconfiguração.
5. **Rotina `rclone` do runbook local não é executável neste ambiente.** O
   upload validado usou outro caminho; a rotina descrita para a loja continua
   sem prova de execução aqui.
6. Confirmar a retenção real do plano e reavaliá-la se o plano mudar.
7. Avaliar agendamento de snapshots no Neon, hoje inexistente.
