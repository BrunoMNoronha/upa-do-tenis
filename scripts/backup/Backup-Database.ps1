param(
  [string]$ContainerName = "upa-db",
  [string]$DatabaseName = "upa_do_tenis",
  [string]$DatabaseUser = "upa_user",
  [string]$BackupDirectory = "",
  [int]$KeepLocalBackups = 7,
  [switch]$NoUpload
)

$ErrorActionPreference = "Stop"

if ([string]::IsNullOrWhiteSpace($BackupDirectory)) {
  $BackupDirectory = Join-Path (Resolve-Path (Join-Path $PSScriptRoot "../..")) "backups/database"
}

$timestamp = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$dumpName = "upa_do_tenis_$timestamp.dump"
$dumpPath = Join-Path $BackupDirectory $dumpName
$hashPath = "$dumpPath.sha256"

New-Item -ItemType Directory -Path $BackupDirectory -Force | Out-Null

Write-Host "[backup] Iniciando backup do banco $DatabaseName no container $ContainerName"
$dumpInsideContainer = "/tmp/$dumpName"

docker exec "$ContainerName" pg_dump -U "$DatabaseUser" -d "$DatabaseName" -Fc -f "$dumpInsideContainer"
if ($LASTEXITCODE -ne 0) {
  throw "O comando pg_dump falhou para o banco $DatabaseName."
}

$containerDumpSource = "{0}:{1}" -f $ContainerName, $dumpInsideContainer
docker cp "$containerDumpSource" "$dumpPath"
if (-not (Test-Path $dumpPath)) {
  throw "O arquivo de dump foi gerado, mas não foi copiado para o host."
}

if ((Get-Item $dumpPath).Length -le 0) {
  throw "O dump local está vazio; abortando antes do upload."
}

Write-Host "[backup] Validando archive com pg_restore --list"
docker exec "$ContainerName" pg_restore -l "$dumpInsideContainer" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "O archive do backup falhou na validação do pg_restore --list."
}

$hash = (Get-FileHash -Path $dumpPath -Algorithm SHA256).Hash
Set-Content -Path $hashPath -Value "$hash  $dumpName"

Write-Host "[backup] Backup válido gerado em $dumpPath"
Write-Host "[backup] SHA256: $hash"

if (-not $NoUpload) {
  $remote = $env:RCLONE_REMOTE
  if ([string]::IsNullOrWhiteSpace($remote)) {
    Write-Warning "Variável RCLONE_REMOTE não definida. O backup local foi validado, mas o upload para o Drive não foi executado."
  }
  else {
    $remoteTarget = "{0}:upa-do-tenis/database" -f $remote
    Write-Host "[backup] Enviando para $remoteTarget"
    & rclone copy "$dumpPath" "$remoteTarget"
    if ($LASTEXITCODE -ne 0) {
      throw "O upload via rclone falhou para o destino remoto configurado."
    }
    $remoteHashCheck = "{0}:upa-do-tenis/database/{1}" -f $remote, $dumpName
    & rclone cryptcheck "$remoteHashCheck" "$remoteTarget"
    if ($LASTEXITCODE -ne 0) {
      throw "A verificação remota falhou para o backup enviado."
    }
  }
}

$localBackups = Get-ChildItem -Path $BackupDirectory -Filter "*.dump" | Sort-Object LastWriteTime
if ($localBackups.Count -gt $KeepLocalBackups) {
  $toRemove = $localBackups | Select-Object -First ($localBackups.Count - $KeepLocalBackups)
  foreach ($item in $toRemove) {
    Write-Host "[backup] Removendo backup local antigo: $($item.Name)"
    Remove-Item -Path $item.FullName -Force
    $hashFileToRemove = "$($item.FullName).sha256"
    if (Test-Path $hashFileToRemove) {
      Remove-Item -Path $hashFileToRemove -Force
    }
  }
}

Write-Host "[backup] Concluído com sucesso."
