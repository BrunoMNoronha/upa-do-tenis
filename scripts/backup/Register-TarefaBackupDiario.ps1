<#
.SYNOPSIS
    Registra (ou remove) a tarefa diaria de backup no Agendador de Tarefas
    do Windows.

.DESCRIPTION
    Cria uma tarefa que executa Invoke-BackupBanco.ps1 uma vez por dia, no
    horario informado, com as seguintes caracteristicas:

    - StartWhenAvailable: se o computador estiver desligado no horario
      agendado, a tarefa roda assim que possivel apos o proximo boot. Esse e
      o requisito de "execucao perdida" da Issue #11.
    - LogonType Interactive por padrao: a tarefa roda com o usuario atual sem
      exigir senha armazenada. O Docker Desktop precisa do engine em
      execucao, o que na pratica exige a sessao do usuario -- ver -SemSessao
      e a secao "Limitacoes" do runbook.
    - Sem privilegio elevado (RunLevel Limited): basta o usuario pertencer ao
      grupo docker-users.
    - Log em backups/logs, ignorado pelo Git.

    Nenhuma senha e solicitada, armazenada ou registrada por este script.

.PARAMETER Horario
    Horario diario no formato HH:mm. Padrao 02:30.

.PARAMETER NomeTarefa
    Nome da tarefa no Agendador. Padrao "UPA do Tenis - Backup diario".

.PARAMETER SemSessao
    Registra a tarefa com LogonType S4U, que dispensa sessao interativa
    aberta. Requer que o Docker engine esteja disponivel sem a sessao do
    usuario (Docker Desktop normalmente NAO atende esse requisito).

.PARAMETER Remover
    Remove a tarefa em vez de cria-la.

.EXAMPLE
    pwsh -File scripts/backup/Register-TarefaBackupDiario.ps1 -Horario 02:30

.EXAMPLE
    pwsh -File scripts/backup/Register-TarefaBackupDiario.ps1 -Remover
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [ValidatePattern('^([01]\d|2[0-3]):[0-5]\d$')]
    [string] $Horario = '02:30',

    [Parameter(Mandatory = $false)]
    [string] $NomeTarefa = 'UPA do Tenis - Backup diario',

    [Parameter(Mandatory = $false)]
    [switch] $SemSessao,

    [Parameter(Mandatory = $false)]
    [switch] $Remover
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$raizScript = Split-Path -Parent $MyInvocation.MyCommand.Path
$raizRepo = Split-Path -Parent (Split-Path -Parent $raizScript)
$scriptBackup = Join-Path $raizScript 'Invoke-BackupBanco.ps1'

if ($Remover) {
    $existente = Get-ScheduledTask -TaskName $NomeTarefa -ErrorAction SilentlyContinue
    if (-not $existente) {
        Write-Host "Tarefa '$NomeTarefa' nao existe. Nada a remover." -ForegroundColor Yellow
        exit 0
    }
    Unregister-ScheduledTask -TaskName $NomeTarefa -Confirm:$false
    Write-Host "Tarefa '$NomeTarefa' removida." -ForegroundColor Green
    exit 0
}

if (-not (Test-Path -LiteralPath $scriptBackup)) {
    throw "Script de backup nao encontrado: $scriptBackup"
}

# Prefere PowerShell 7 quando disponivel; cai para o Windows PowerShell 5.1.
$host7 = (Get-Command pwsh.exe -ErrorAction SilentlyContinue)
$executavel = if ($host7) { $host7.Source } else { "$env:SystemRoot\System32\WindowsPowerShell\v1.0\powershell.exe" }

$argumentos = '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File "{0}"' -f $scriptBackup

$acao = New-ScheduledTaskAction -Execute $executavel -Argument $argumentos -WorkingDirectory $raizRepo

$gatilho = New-ScheduledTaskTrigger -Daily -At ([datetime]::ParseExact($Horario, 'HH:mm', $null))

# StartWhenAvailable e o comportamento exigido: rodar assim que possivel
# quando o horario diario foi perdido porque o computador estava desligado.
$configuracoes = New-ScheduledTaskSettingsSet `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries `
    -ExecutionTimeLimit (New-TimeSpan -Hours 2) `
    -RestartCount 2 `
    -RestartInterval (New-TimeSpan -Minutes 15)

# Nota sobre execucoes simultaneas
# --------------------------------
# A politica MultipleInstances do Agendador nao e aplicada de forma confiavel
# pelos cmdlets CIM (Register-ScheduledTask e Set-ScheduledTask deixam a
# tarefa em Parallel = 0, verificado em Windows 11). Em vez de depender dela,
# a exclusao mutua e garantida pelo proprio Invoke-BackupBanco.ps1, atraves
# de uma trava de arquivo exclusiva. Isso tambem protege contra uma execucao
# manual disparada enquanto a tarefa diaria esta rodando.

$tipoLogon = if ($SemSessao) { 'S4U' } else { 'Interactive' }
$principal = New-ScheduledTaskPrincipal `
    -UserId "$env:USERDOMAIN\$env:USERNAME" `
    -LogonType $tipoLogon `
    -RunLevel Limited

$descricao = 'Backup diario do PostgreSQL do UPA do Tenis: pg_dump -Fc, validacao, ' +
    'SHA-256, upload criptografado ao Google Drive via rclone e retencao. ' +
    'Nao executa restore nem qualquer operacao destrutiva.'

$tarefa = New-ScheduledTask -Action $acao -Trigger $gatilho -Settings $configuracoes `
    -Principal $principal -Description $descricao

if (Get-ScheduledTask -TaskName $NomeTarefa -ErrorAction SilentlyContinue) {
    Unregister-ScheduledTask -TaskName $NomeTarefa -Confirm:$false
    Write-Host "Tarefa anterior '$NomeTarefa' substituida." -ForegroundColor Yellow
}

Register-ScheduledTask -TaskName $NomeTarefa -InputObject $tarefa | Out-Null

Write-Host ''
Write-Host "Tarefa '$NomeTarefa' registrada." -ForegroundColor Green
Write-Host "  Horario diario ........... $Horario"
Write-Host "  Executavel ............... $executavel"
Write-Host "  Script ................... $scriptBackup"
Write-Host "  Diretorio de trabalho .... $raizRepo"
Write-Host "  LogonType ................ $tipoLogon"
Write-Host "  Execucao perdida ......... StartWhenAvailable ligado"
Write-Host ''
Write-Host 'Validar com:'
Write-Host "  Get-ScheduledTask -TaskName '$NomeTarefa' | Get-ScheduledTaskInfo"
Write-Host "  Start-ScheduledTask -TaskName '$NomeTarefa'   # execucao imediata de teste"
