param(
  [Parameter(Mandatory = $true)]
  [string]$BackupPath,
  [string]$ContainerName = "upa-db",
  [string]$DatabaseUser = "upa_user",
  [string]$TargetDatabase = "",
  [switch]$AllowProduction
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $BackupPath)) {
  throw "Arquivo de backup não encontrado: $BackupPath"
}

if (-not $AllowProduction) {
  throw "Restore de produção exige -AllowProduction. O padrão é sempre restaurar em banco temporário/isolado."
}

if ([string]::IsNullOrWhiteSpace($TargetDatabase)) {
  $suffix = Get-Date -Format "yyyyMMdd_HHmmss"
  $TargetDatabase = "upa_restore_test_$suffix"
}

$resolvedPath = (Resolve-Path $BackupPath).Path
$hashPath = "$resolvedPath.sha256"

if (Test-Path $hashPath) {
  $expectedHash = (Get-Content $hashPath).Split()[0]
  $actualHash = (Get-FileHash -Path $resolvedPath -Algorithm SHA256).Hash
  if ($actualHash -ne $expectedHash) {
    throw "Hash SHA256 divergente para $BackupPath. Backup rejeitado."
  }
}

Write-Host "[restore] Validando archive do backup"
$containerRestorePath = "{0}:/tmp/restore.dump" -f $ContainerName
docker cp "$resolvedPath" "$containerRestorePath"
docker exec "$ContainerName" pg_restore -l "/tmp/restore.dump" | Out-Null
if ($LASTEXITCODE -ne 0) {
  throw "O arquivo informado não é um dump válido do PostgreSQL."
}

docker exec "$ContainerName" createdb -U "$DatabaseUser" "$TargetDatabase"
if ($LASTEXITCODE -ne 0) {
  throw "Não foi possível criar o banco temporário $TargetDatabase."
}

docker exec "$ContainerName" pg_restore --no-owner --clean --if-exists --exit-on-error -U "$DatabaseUser" -d "$TargetDatabase" "/tmp/restore.dump"
if ($LASTEXITCODE -ne 0) {
  throw "O restore do dump falhou no banco temporário $TargetDatabase."
}

Write-Host "[restore] Banco temporário $TargetDatabase restaurado com sucesso."
Write-Host "[restore] Use o banco de teste para validação manual e remova-o após a verificação."
