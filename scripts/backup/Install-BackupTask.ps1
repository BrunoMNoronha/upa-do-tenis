param(
  [string]$TaskName = "UPA-Backup-Diario",
  [string]$StartTime = "02:00",
  [string]$ScriptPath = ""
)

if ([string]::IsNullOrWhiteSpace($ScriptPath)) {
  $ScriptPath = (Join-Path $PSScriptRoot "Backup-Database.ps1")
}

$scriptFullPath = (Resolve-Path $ScriptPath).Path

$action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-NoProfile -ExecutionPolicy Bypass -File \"$scriptFullPath\""
$trigger = New-ScheduledTaskTrigger -Daily -At $StartTime

Register-ScheduledTask -TaskName $TaskName -Action $action -Trigger $trigger -Force
Write-Host "[task] Tarefa agendada criada: $TaskName"
Write-Host "[task] Horário: $StartTime"
Write-Host "[task] Script: $scriptFullPath"
