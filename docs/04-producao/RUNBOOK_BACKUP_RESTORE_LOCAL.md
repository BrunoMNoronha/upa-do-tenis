# Runbook — Backup e Restore do PostgreSQL local (Docker)

Ambiente coberto: **produção local piloto** da loja, definida em
[`docker-compose.local.yml`](../../docker-compose.local.yml) — container `upa-db`
(PostgreSQL 16), banco `upa_do_tenis`, volume `upa_postgres_data`, aplicação
`upa-app`.

Para o ambiente Neon/Vercel, ver [PLANO_BACKUP_RESTORE.md](PLANO_BACKUP_RESTORE.md).

> [!IMPORTANT]
> Um backup só é considerado válido quando existe **cópia externa,
> verificação de integridade e restauração testada**. O upload para o Google
> Drive, sozinho, não prova nada.

## Objetivos operacionais

| Indicador | Alvo | Situação |
|---|---|---|
| RPO (perda máxima aceitável) | 24 h | Atendido pelo backup diário |
| RTO (tempo até recuperar) | 60 min | Ver "Duração medida" |

## Arquitetura

```
upa-db (PostgreSQL 16)
   │  pg_dump -Fc              (dentro do container)
   ▼
/tmp/<arquivo>.dump
   │  pg_restore --list        (validação #1, no container)
   │  docker cp                (nunca redirecionamento de stdout)
   ▼
backups/database/<arquivo>.dump
   │  pg_restore --list        (validação #2, na cópia do host)
   │  SHA-256                  → <arquivo>.sha256
   │  contagens críticas       → <arquivo>.manifest.json
   ▼
rclone copyto  →  upa-drive-crypt:  (criptografia client-side)
   │  rclone cryptcheck        (verificação remota)
   ▼
retenção local + remota       (somente após tudo acima dar certo)
```

O dump nunca trafega por `stdout` do PowerShell: ele é escrito em arquivo
dentro do container e trazido com `docker cp`, o que elimina o risco de
corrupção de binário por tratamento de stream.

Nenhum script recebe, lê ou registra senha, `DATABASE_URL`,
`AUTH_SESSION_SECRET`, token OAuth ou chave de criptografia. O acesso ao banco
usa o socket UNIX local do container, que a imagem oficial do PostgreSQL
autentica com `trust`.

## Arquivos

| Arquivo | Papel |
|---|---|
| `scripts/backup/Invoke-BackupBanco.ps1` | Backup completo (dump → validação → hash → upload → verificação → retenção) |
| `scripts/backup/Invoke-RestoreTeste.ps1` | Restore **não destrutivo** em banco isolado |
| `scripts/backup/Register-TarefaBackupDiario.ps1` | Registra/remove a tarefa diária do Windows |
| `scripts/backup/lib/UpaBackup.psm1` | Funções compartilhadas |
| `scripts/backup/backup.config.example.psd1` | Modelo de configuração (sem segredos) |

Diretórios de runtime, todos no `.gitignore`:

```text
backups/
  database/   <arquivo>.dump, .sha256, .manifest.json
  logs/       backup_*.log, restore_*.log, backup.lock
```

## Instalação

### 1. Configuração local

```powershell
Copy-Item scripts/backup/backup.config.example.psd1 scripts/backup/backup.config.psd1
```

Ajuste apenas o necessário. O arquivo é ignorado pelo Git e **não contém
segredos** — só nomes de container/banco/usuário e caminhos.

### 2. rclone

Instale o rclone no desktop da loja (`winget install Rclone.Rclone`) e
confirme que ele está no `PATH` — ou informe o caminho absoluto em
`RcloneExecutavel`, que é o mais seguro quando a tarefa agendada roda com um
`PATH` reduzido.

#### Client ID próprio do Google (obrigatório)

O client ID compartilhado do rclone para Google Drive está sendo retirado em
2026. Crie um client ID próprio antes de configurar o remote:

1. Google Cloud Console → novo projeto.
2. Ative a **Google Drive API**.
3. Tela de consentimento OAuth: tipo **External**, e adicione a própria conta
   Google da loja como usuário de teste.
4. Credenciais → **OAuth client ID** → tipo **Desktop app**.
5. Guarde o *client ID* e o *client secret* num gerenciador de senhas. Eles
   **não** entram no repositório, em documento nem em log.

#### Remotes

São necessários **dois** remotes: o do Drive e um `crypt` por cima dele. É o
`crypt` que cifra conteúdo e nomes **antes** do upload.

```powershell
rclone config
```

| Passo | Remote | Valores |
|---|---|---|
| 1 | `upa-drive` | tipo `drive`; informe o client ID e o client secret próprios; escopo `drive.file`; autorize no navegador |
| 2 | `upa-drive-crypt` | tipo `crypt`; `remote` = `upa-drive:upa-do-tenis`; `filename_encryption` = `standard`; `directory_name_encryption` = `true`; defina senha e salt (password2) |

> [!CAUTION]
> **Sem a senha e o salt do `crypt`, nenhum backup pode ser recuperado.**
> Guarde ambos no gerenciador de senhas e num segundo lugar físico separado do
> desktop da loja. Perder essas chaves equivale a perder todos os backups.
>
> Faça também uma cópia do `rclone.conf` para um local seguro fora do
> computador. Ele nunca deve ser versionado — o `.gitignore` já bloqueia
> `rclone.conf`.

Escopo `drive.file`: o rclone só enxerga arquivos criados por ele mesmo. É o
menor privilégio que atende ao caso de uso.

Confira o destino configurado em `RcloneRemoto`. Ele deve apontar para o
remote **crypt** (`upa-drive-crypt:...`), nunca para `upa-drive:` direto — caso
contrário os backups subiriam em claro.

### 3. Primeira execução

```powershell
pwsh -File scripts/backup/Invoke-BackupBanco.ps1
```

### 4. Tarefa diária

```powershell
pwsh -File scripts/backup/Register-TarefaBackupDiario.ps1 -Horario 02:30
```

A tarefa é criada com:

- **`StartWhenAvailable` ligado** — se o computador estiver desligado no
  horário, o backup roda assim que possível depois do próximo boot. É o
  requisito de execução perdida;
- `RunLevel Limited` — sem elevação; basta o usuário estar em `docker-users`;
- `AllowStartIfOnBatteries` + `DontStopIfGoingOnBatteries`;
- limite de execução de 2 h, com 2 tentativas de reinício a cada 15 min;
- log em `backups/logs/`.

Verificar, executar sob demanda e remover:

```powershell
Get-ScheduledTask -TaskName 'UPA do Tenis - Backup diario' | Get-ScheduledTaskInfo
Start-ScheduledTask -TaskName 'UPA do Tenis - Backup diario'
pwsh -File scripts/backup/Register-TarefaBackupDiario.ps1 -Remover
```

> [!NOTE]
> **Execuções simultâneas.** A política `MultipleInstances` do Agendador não é
> aplicada de forma confiável pelos cmdlets CIM (a tarefa permanece em
> `Parallel`, comportamento verificado em Windows 11). Por isso a exclusão
> mútua é garantida pelo próprio `Invoke-BackupBanco.ps1`, com uma trava de
> arquivo exclusiva em `backups/logs/backup.lock`. Uma segunda execução
> simplesmente registra "trava ativa" e encerra com código 0, sem tocar em nada.

> [!WARNING]
> **Limitação real do Docker Desktop.** O Docker Desktop só mantém o engine
> ativo enquanto há sessão do usuário. Uma tarefa registrada com `-SemSessao`
> (`LogonType S4U`) roda sem sessão interativa, mas o `docker` vai falhar se o
> engine não estiver de pé. No desktop da loja, que fica ligado e logado
> durante o expediente, o padrão (`Interactive`) é o correto. Se no futuro o
> requisito for backup sem sessão, a saída é migrar o PostgreSQL para Docker
> Engine em WSL2 com início automático, ou usar um agendamento no horário em
> que a loja está aberta.

## Política de retenção

| Onde | Padrão | Configurável em |
|---|---|---|
| Local (`backups/database/`) | 7 conjuntos | `RetencaoLocal` |
| Google Drive | 30 conjuntos | `RetencaoRemota` |

Um "conjunto" é o trio `.dump` + `.sha256` + `.manifest.json`.

Guardas de segurança, todas verificadas em teste:

1. A retenção só roda **depois** de dump, validação, hash, upload e
   verificação remota terminarem com sucesso.
2. Falha em qualquer etapa anterior ⇒ saída com código diferente de zero e
   **nenhuma remoção**.
3. `-SkipUpload` suprime a retenção: sem cópia externa provada, nada é apagado.
4. O backup da execução corrente nunca é removido.
5. Apenas conjuntos **completos** entram na contagem — um dump órfão nunca
   desloca um backup íntegro para fora da janela.
6. Falha ao listar o remote não invalida o backup já enviado; a limpeza remota
   é apenas pulada, com aviso.

Política mensal/anual está fora do escopo desta entrega (candidata a
follow-up, conforme uso real e espaço disponível).

## Restauração de teste (não destrutiva)

Este é o fluxo padrão e o único automatizado.

```powershell
# backup local mais recente
pwsh -File scripts/backup/Invoke-RestoreTeste.ps1

# baixando do Google Drive
pwsh -File scripts/backup/Invoke-RestoreTeste.ps1 -DoRemoto

# preservando o banco restaurado para smoke test manual
pwsh -File scripts/backup/Invoke-RestoreTeste.ps1 -DoRemoto -ManterBanco
```

O script valida SHA-256, revalida o archive, cria um banco
`upa_restore_teste_<carimbo>`, restaura com `--exit-on-error`, compara as
contagens críticas contra o manifesto de origem e falha se houver qualquer
divergência.

### Por que ele não consegue tocar o banco operacional

O nome do banco de destino é **gerado internamente** e não existe parâmetro
para escolhê-lo. Não há entrada do operador capaz de apontar para
`upa_do_tenis`, e não existe flag capaz de transformar este script num restore
de produção. Antes de qualquer escrita, o nome gerado é reconferido contra o
padrão `upa_restore_teste_*` e contra o nome do banco operacional lido da
configuração. `pg_restore` recebe `--dbname` apontando exclusivamente para o
banco temporário recém-criado e vazio.

### Smoke test contra o banco restaurado

Com `-ManterBanco`, aponte a aplicação temporariamente para o banco de teste —
**nunca** altere o `.env` da produção:

```powershell
$env:DATABASE_URL = "postgresql://<usuario>@localhost:5433/upa_restore_teste_<carimbo>?schema=public"
npx prisma migrate status     # deve reportar schema em dia
```

Depois, remova o banco temporário:

```powershell
docker exec upa-db psql -U upa_user -d postgres -c 'DROP DATABASE "upa_restore_teste_<carimbo>"'
```

---

## Recuperação do banco operacional (procedimento MANUAL)

> [!CAUTION]
> **Este procedimento não é automatizado, por decisão de projeto.** Uma
> automação de cutover destrutivo teria que derrubar a aplicação, apagar ou
> renomear o banco em uso e recriá-lo, sem supervisão. O risco de uma
> automação assim disparar por engano — ou parcialmente — é maior do que o
> ganho em um ambiente de loja única. O procedimento abaixo é executado por
> uma pessoa, passo a passo, e cada passo é verificável.

Tempo estimado: 20 a 40 min, dominado pelo `pg_restore` e pelo smoke test.

### Passo 0 — Decidir e anunciar

Confirme que a recuperação é necessária. Avise que o sistema ficará fora do ar.
Anote a hora de início.

### Passo 1 — Parar a aplicação (não o banco)

```powershell
docker stop upa-app
```

O container `upa-db` **permanece de pé**: ele é necessário para o backup de
emergência e para o restore.

### Passo 2 — Backup de emergência do estado atual

Se o banco ainda estiver legível, capture o estado atual antes de qualquer
coisa. Este é o seu bilhete de volta.

```powershell
pwsh -File scripts/backup/Invoke-BackupBanco.ps1 -SkipRetencao
```

Se o banco estiver corrompido a ponto de o `pg_dump` falhar, registre a falha
e prossiga — mas anote que **não haverá rollback para o estado atual**.

### Passo 3 — Escolher e validar o backup a restaurar

```powershell
pwsh -File scripts/backup/Invoke-RestoreTeste.ps1 -DoRemoto -NomeRemoto <arquivo>.dump -ManterBanco
```

Isso baixa, valida hash e archive, restaura em banco isolado e compara as
contagens. **Só avance se este passo terminar com "RESTORE DE TESTE
APROVADO".** É aqui que se descobre um backup ruim — e não depois de já ter
apagado o banco operacional.

Anote o nome do banco temporário aprovado: `upa_restore_teste_<carimbo>`.

### Passo 4 — Preservar o banco atual (rollback)

Em vez de apagar, **renomeie**. O banco anterior fica intacto no mesmo volume,
disponível para rollback imediato.

```powershell
# Encerra conexões remanescentes ao banco operacional
docker exec upa-db psql -U upa_user -d postgres -c `
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='upa_do_tenis' AND pid <> pg_backend_pid()"

docker exec upa-db psql -U upa_user -d postgres -c `
  'ALTER DATABASE "upa_do_tenis" RENAME TO "upa_do_tenis_pre_restore_<AAAAMMDD_HHMM>"'
```

### Passo 5 — Promover o banco restaurado

```powershell
docker exec upa-db psql -U upa_user -d postgres -c `
  'ALTER DATABASE "upa_restore_teste_<carimbo>" RENAME TO "upa_do_tenis"'
```

Renomear é preferível a restaurar de novo: o banco promovido é exatamente o
que foi validado no passo 3, sem uma segunda execução de `pg_restore` que
poderia se comportar de forma diferente.

### Passo 6 — Subir a aplicação

```powershell
docker start upa-app
docker logs --tail 50 upa-app
```

### Passo 7 — Smoke test

Verifique, nesta ordem, e registre o resultado de cada item:

1. A aplicação responde em `http://localhost:3000`.
2. Login funciona com um usuário conhecido.
3. A lista de ordens de serviço carrega e traz o volume esperado.
4. Uma OS conhecida abre e mostra pagamentos e saldo corretos.
5. O caixa do dia mostra as movimentações esperadas.
6. Estoque de produtos e insumos apresenta valores plausíveis.

```powershell
docker exec upa-db psql -U upa_user -d upa_do_tenis -c `
  "SELECT 'OS' t, count(*) FROM \"OrdemServico\" UNION ALL SELECT 'Pagamento', count(*) FROM \"Pagamento\" UNION ALL SELECT 'MovCaixa', count(*) FROM \"MovimentacaoCaixa\""
```

Anote a hora de conclusão. A diferença para o passo 0 é o RTO real.

### Passo 8 — Encerramento

Mantenha `upa_do_tenis_pre_restore_*` por, no mínimo, **7 dias de operação
normal**. Só então remova:

```powershell
docker exec upa-db psql -U upa_user -d postgres -c 'DROP DATABASE "upa_do_tenis_pre_restore_<AAAAMMDD_HHMM>"'
```

Registre o incidente: causa, backup utilizado, duração, divergências.

---

## Rollback

Se o smoke test do passo 7 falhar, o retorno ao estado anterior leva menos de
um minuto — o banco antigo nunca foi destruído.

```powershell
docker stop upa-app

docker exec upa-db psql -U upa_user -d postgres -c `
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='upa_do_tenis' AND pid <> pg_backend_pid()"

# devolve o banco restaurado ao nome de teste
docker exec upa-db psql -U upa_user -d postgres -c `
  'ALTER DATABASE "upa_do_tenis" RENAME TO "upa_restore_falhou_<AAAAMMDD_HHMM>"'

# devolve o banco original ao nome operacional
docker exec upa-db psql -U upa_user -d postgres -c `
  'ALTER DATABASE "upa_do_tenis_pre_restore_<AAAAMMDD_HHMM>" RENAME TO "upa_do_tenis"'

docker start upa-app
```

Repita o smoke test. Preserve `upa_restore_falhou_*` para diagnóstico.

Se o rollback também falhar, o backup de emergência do passo 2 continua
disponível em `backups/database/` e no Google Drive.

---

## Diagnóstico de falhas

| Sintoma no log | Causa provável | Ação |
|---|---|---|
| `Container 'upa-db' nao esta em execucao` | Stack parada, ou Docker Desktop fechado | `docker compose -f docker-compose.local.yml up -d` |
| `Ja existe um backup em execucao (trava ativa)` | Execução anterior em andamento | Normal. Se persistir, verifique se sobrou processo travado |
| `didn't find section in config file` | Remote do rclone ausente ou nome errado | Confira `RcloneRemoto` e `rclone listremotes` |
| `Failed to get token` / `oauth` | Token do Google expirado ou revogado | `rclone config reconnect upa-drive:` |
| `SHA-256 divergente` | Arquivo corrompido em disco ou no transporte | **Não use este backup.** Restaure o anterior |
| `pg_restore: error: could not read from input file` | Dump truncado | Idem acima |
| `Nao foi possivel obter a contagem das tabelas` | Banco inacessível ou schema inesperado | Investigue antes de confiar no backup |
| `Divergencia de TOC apos docker cp` | Corrupção na cópia para o host | Repita o backup; se persistir, investigue disco |

Os logs ficam em `backups/logs/` e passam por um filtro de redação que
substitui padrões de credencial por `<<REDIGIDO>>` antes da gravação.

## Verificações periódicas

| Frequência | Verificação |
|---|---|
| Semanal | Último log de backup terminou em sucesso |
| Mensal | `Invoke-RestoreTeste.ps1 -DoRemoto` conclui com 0 divergências |
| Trimestral | Simulação completa do procedimento manual de recuperação, em ambiente não produtivo |
| Semestral | Confirmar que a senha/salt do `crypt` ainda estão acessíveis e corretos |

## Duração medida (homologação)

Medido contra PostgreSQL 16 em Docker, banco de **54 MB / ~200 mil linhas**
(20k clientes, 40k OS, 60k itens, 40k pagamentos, 40k movimentações de caixa),
com dados sintéticos:

| Etapa | Duração |
|---|---|
| Backup completo (dump → upload → verificação → retenção) | 6,7 s |
| **Recuperação completa** (download → validação → restore → verificação) | **8,1 s** |
| `pg_restore` isolado | 2,3 s |

Alvo de RTO (60 min) atendido com ampla margem. O download real do Google
Drive somará tempo de rede, e o cutover manual é dominado pelo smoke test
humano, não pelo restore.
