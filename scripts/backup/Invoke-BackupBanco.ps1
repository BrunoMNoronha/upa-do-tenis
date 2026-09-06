<#
.SYNOPSIS
    Backup logico do PostgreSQL do UPA do Tenis, com validacao, hash, envio
    criptografado ao Google Drive via rclone e retencao guardada.

.DESCRIPTION
    Fluxo executado, nesta ordem, com parada imediata em qualquer falha:

        1. pg_dump -Fc dentro do container Postgres
        2. pg_restore --list sobre o arquivo ainda dentro do container
        3. docker cp para o host + remocao do temporario no container
        4. revalidacao com pg_restore --list sobre a copia do host
        5. SHA-256 da copia do host
        6. manifesto JSON com contagens das tabelas criticas
        7. upload ao remote rclone (crypt) do dump, do hash e do manifesto
        8. verificacao remota com rclone cryptcheck
        9. retencao local e remota

    Garantias de seguranca:

    - Nenhuma senha, DATABASE_URL, token ou chave de crypt e lida, recebida
      ou registrada. O acesso ao banco usa o socket local do container.
    - A retencao (passo 9) so roda depois que TODOS os passos anteriores
      terminaram com sucesso. Falha em qualquer ponto encerra com codigo
      diferente de zero preservando os backups existentes.
    - A retencao nunca remove o backup recem-criado nem o unico backup valido.
    - Nenhuma operacao deste script escreve no banco operacional.

.PARAMETER ConfigPath
    Caminho para backup.config.psd1. Se omitido, usa o arquivo ao lado deste
    script, e na ausencia dele os padroes de producao local.

.PARAMETER SkipUpload
    Executa apenas a parte local (passos 1 a 6). A retencao remota nao roda e
    a retencao local tambem e suprimida, porque nao ha copia externa provada.

.PARAMETER SkipRetencao
    Gera e envia o backup sem remover nada. Util na primeira execucao.

.EXAMPLE
    pwsh -File scripts/backup/Invoke-BackupBanco.ps1

.EXAMPLE
    pwsh -File scripts/backup/Invoke-BackupBanco.ps1 -SkipUpload
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string] $ConfigPath,

    [Parameter(Mandatory = $false)]
    [switch] $SkipUpload,

    [Parameter(Mandatory = $false)]
    [switch] $SkipRetencao
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$raizScript = Split-Path -Parent $MyInvocation.MyCommand.Path
$raizRepo = Split-Path -Parent (Split-Path -Parent $raizScript)
Import-Module (Join-Path $raizScript 'lib/UpaBackup.psm1') -Force

# --------------------------------------------------------------------------
# Configuracao
# --------------------------------------------------------------------------
if (-not $ConfigPath) {
    $candidato = Join-Path $raizScript 'backup.config.psd1'
    if (Test-Path -LiteralPath $candidato) { $ConfigPath = $candidato }
}
$cfg = Get-UpaConfiguracao -CaminhoConfig $ConfigPath

$dirBackup = Resolve-UpaCaminhoRaiz -Caminho $cfg.DiretorioBackup -Raiz $raizRepo
$dirLog = Resolve-UpaCaminhoRaiz -Caminho $cfg.DiretorioLog -Raiz $raizRepo
New-Item -ItemType Directory -Force -Path $dirBackup | Out-Null
New-Item -ItemType Directory -Force -Path $dirLog | Out-Null

$carimbo = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
Initialize-UpaLog -CaminhoLog (Join-Path $dirLog "backup_$carimbo.log")

$nomeBase = '{0}_{1}' -f $cfg.Banco, $carimbo
$arquivoDump = Join-Path $dirBackup "$nomeBase.dump"
$arquivoHash = Join-Path $dirBackup "$nomeBase.sha256"
$arquivoManifesto = Join-Path $dirBackup "$nomeBase.manifest.json"
$dumpNoContainer = "/tmp/$nomeBase.dump"

$cronometro = [System.Diagnostics.Stopwatch]::StartNew()

# --------------------------------------------------------------------------
# Trava de execucao exclusiva
#
# Dois backups simultaneos disputariam o mesmo diretorio e a mesma retencao.
# A politica MultipleInstances do Agendador de Tarefas nao e aplicada de forma
# confiavel pelos cmdlets CIM, entao a exclusao mutua e garantida aqui, com um
# arquivo aberto em modo exclusivo. A trava e liberada quando o processo
# termina, inclusive se ele for encerrado abruptamente.
# --------------------------------------------------------------------------
$caminhoTrava = Join-Path $dirLog 'backup.lock'
try {
    $trava = [System.IO.File]::Open(
        $caminhoTrava,
        [System.IO.FileMode]::OpenOrCreate,
        [System.IO.FileAccess]::ReadWrite,
        [System.IO.FileShare]::None)
}
catch {
    Write-UpaLog 'Ja existe um backup em execucao (trava ativa). Esta execucao foi ignorada.' 'AVISO'
    exit 0
}

function Remove-DumpTemporarioDoContainer {
    param([string] $Container, [string] $Caminho)
    Invoke-UpaProcesso -Arquivo 'docker' -Argumentos @('exec', $Container, 'rm', '-f', $Caminho) -ToleraFalha | Out-Null
}

function Get-ArgumentosRclone {
    param([string[]] $Argumentos)
    if ($cfg.RcloneConfig) {
        return @('--config', $cfg.RcloneConfig) + $Argumentos
    }
    return $Argumentos
}

try {
    Write-UpaLog "Backup do banco '$($cfg.Banco)' iniciado (container '$($cfg.ContainerBanco)')." 'PASSO'

    # ----------------------------------------------------------------------
    # Pre-condicoes
    # ----------------------------------------------------------------------
    if (-not (Test-UpaContainerAtivo -Nome $cfg.ContainerBanco)) {
        throw "Container '$($cfg.ContainerBanco)' nao esta em execucao. Suba a stack antes do backup."
    }
    Write-UpaLog "Container '$($cfg.ContainerBanco)' ativo." 'OK'

    # ----------------------------------------------------------------------
    # 1. pg_dump -Fc dentro do container
    # ----------------------------------------------------------------------
    Write-UpaLog '1/9 Gerando dump com pg_dump -Fc dentro do container.' 'PASSO'
    Invoke-UpaProcesso -Arquivo 'docker' -Argumentos @(
        'exec', $cfg.ContainerBanco,
        'pg_dump', '-U', $cfg.Usuario, '-d', $cfg.Banco,
        '--format=custom', '--compress=9', '--no-owner', '--no-privileges',
        '--file', $dumpNoContainer
    ) | Out-Null
    Write-UpaLog 'pg_dump concluido com exit code 0.' 'OK'

    # ----------------------------------------------------------------------
    # 2. Validacao do archive ainda dentro do container
    # ----------------------------------------------------------------------
    Write-UpaLog '2/9 Validando archive com pg_restore --list (dentro do container).' 'PASSO'
    $listaContainer = Invoke-UpaProcesso -Arquivo 'docker' -Argumentos @(
        'exec', $cfg.ContainerBanco, 'pg_restore', '--list', $dumpNoContainer
    )
    $entradasContainer = @($listaContainer.StdOut -split "`r?`n" | Where-Object { $_ -and -not $_.StartsWith(';') })
    if ($entradasContainer.Count -lt 1) {
        throw 'pg_restore --list nao retornou nenhuma entrada de TOC. Archive suspeito.'
    }
    Write-UpaLog "pg_restore --list OK: $($entradasContainer.Count) entradas de TOC." 'OK'

    # ----------------------------------------------------------------------
    # 3. Copia para o host (docker cp, nunca redirecionamento de stdout)
    # ----------------------------------------------------------------------
    Write-UpaLog '3/9 Copiando o dump para o host com docker cp.' 'PASSO'
    Invoke-UpaProcesso -Arquivo 'docker' -Argumentos @(
        'cp', "$($cfg.ContainerBanco):$dumpNoContainer", $arquivoDump
    ) | Out-Null
    Remove-DumpTemporarioDoContainer -Container $cfg.ContainerBanco -Caminho $dumpNoContainer

    if (-not (Test-Path -LiteralPath $arquivoDump)) {
        throw "Dump nao encontrado no host apos docker cp: $arquivoDump"
    }
    $tamanho = (Get-Item -LiteralPath $arquivoDump).Length
    if ($tamanho -le 0) {
        throw "Dump copiado para o host tem tamanho zero: $arquivoDump"
    }
    Write-UpaLog ("Dump no host: {0} ({1:N0} bytes)." -f (Split-Path -Leaf $arquivoDump), $tamanho) 'OK'

    # ----------------------------------------------------------------------
    # 4. Revalidacao da copia do host
    # ----------------------------------------------------------------------
    Write-UpaLog '4/9 Revalidando a copia do host com pg_restore --list.' 'PASSO'
    $listaHost = Invoke-UpaProcesso -Arquivo 'docker' -Argumentos @(
        'run', '--rm', '-v', "$($dirBackup):/backup:ro", $cfg.ImagemPostgres,
        'pg_restore', '--list', "/backup/$nomeBase.dump"
    )
    $entradasHost = @($listaHost.StdOut -split "`r?`n" | Where-Object { $_ -and -not $_.StartsWith(';') })
    if ($entradasHost.Count -ne $entradasContainer.Count) {
        throw ("Divergencia de TOC apos docker cp: {0} entradas no container, {1} no host." -f `
            $entradasContainer.Count, $entradasHost.Count)
    }
    Write-UpaLog "Copia do host integra: $($entradasHost.Count) entradas de TOC, identicas a origem." 'OK'

    # ----------------------------------------------------------------------
    # 5. SHA-256
    # ----------------------------------------------------------------------
    Write-UpaLog '5/9 Calculando SHA-256.' 'PASSO'
    $hash = Get-UpaSha256 -Caminho $arquivoDump
    Set-Content -LiteralPath $arquivoHash -Value ("{0}  {1}" -f $hash, "$nomeBase.dump") -Encoding ascii -NoNewline
    Write-UpaLog "SHA-256: $hash" 'OK'

    # ----------------------------------------------------------------------
    # 6. Manifesto com contagens das tabelas criticas
    # ----------------------------------------------------------------------
    Write-UpaLog '6/9 Coletando contagens das tabelas criticas para o manifesto.' 'PASSO'
    $contagens = Get-UpaContagemTabelas -Container $cfg.ContainerBanco -Usuario $cfg.Usuario `
        -Banco $cfg.Banco -Tabelas $cfg.TabelasCriticas

    # O manifesto e a base da comparacao pos-restore. Contagem vazia ou com
    # erro tornaria a validacao de integridade um teste que sempre passa,
    # por isso o backup falha aqui em vez de gravar um manifesto inutil.
    $invalidas = @($cfg.TabelasCriticas | Where-Object {
            $v = $contagens[$_]
            ($null -eq $v) -or ("$v".Trim() -eq '') -or ("$v" -eq 'ERRO')
        })
    if ($invalidas.Count -gt 0) {
        throw ("Nao foi possivel obter a contagem das tabelas: {0}. Manifesto nao sera gravado." -f ($invalidas -join ', '))
    }

    $versaoServidor = (Invoke-UpaProcesso -Arquivo 'docker' -Argumentos @(
            'exec', $cfg.ContainerBanco, 'psql', '-U', $cfg.Usuario, '-d', $cfg.Banco, '-tAc', 'SHOW server_version'
        ) -ToleraFalha).StdOut.Trim()

    $totalTabelas = (Invoke-UpaProcesso -Arquivo 'docker' -Argumentos @(
            'exec', $cfg.ContainerBanco, 'psql', '-U', $cfg.Usuario, '-d', $cfg.Banco, '-tAc',
            "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'"
        ) -ToleraFalha).StdOut.Trim()

    $manifesto = [ordered]@{
        arquivo             = "$nomeBase.dump"
        gerado_em           = (Get-Date).ToString('o')
        banco               = $cfg.Banco
        container           = $cfg.ContainerBanco
        versao_servidor     = $versaoServidor
        formato             = 'custom (pg_dump -Fc)'
        tamanho_bytes       = $tamanho
        sha256              = $hash
        entradas_toc        = $entradasHost.Count
        tabelas_schema_public = $totalTabelas
        contagens_criticas  = $contagens
    }
    $manifesto | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $arquivoManifesto -Encoding utf8
    Write-UpaLog "Manifesto gravado: $(Split-Path -Leaf $arquivoManifesto)" 'OK'

    # ----------------------------------------------------------------------
    # 7 e 8. Upload criptografado e verificacao remota
    # ----------------------------------------------------------------------
    $uploadOk = $false
    if ($SkipUpload) {
        Write-UpaLog '7/9 e 8/9 ignorados: -SkipUpload informado. Backup permanece apenas local.' 'AVISO'
    }
    else {
        Write-UpaLog "7/9 Enviando ao remote rclone '$($cfg.RcloneRemoto)'." 'PASSO'
        foreach ($alvo in @($arquivoDump, $arquivoHash, $arquivoManifesto)) {
            Invoke-UpaProcesso -Arquivo $cfg.RcloneExecutavel -Argumentos (Get-ArgumentosRclone @(
                    'copyto', $alvo, ('{0}/{1}' -f $cfg.RcloneRemoto.TrimEnd('/'), (Split-Path -Leaf $alvo))
                )) | Out-Null
            Write-UpaLog "Enviado: $(Split-Path -Leaf $alvo)" 'OK'
        }

        Write-UpaLog '8/9 Verificando o conteudo remoto.' 'PASSO'
        $comandoCheck = if ($cfg.RemotoEhCrypt) { 'cryptcheck' } else { 'check' }
        $argsCheck = @($comandoCheck, $dirBackup, $cfg.RcloneRemoto, '--one-way', '--include', "$nomeBase*")
        if (-not $cfg.RemotoEhCrypt) { $argsCheck += '--download' }
        $check = Invoke-UpaProcesso -Arquivo $cfg.RcloneExecutavel -Argumentos (Get-ArgumentosRclone $argsCheck)
        $resumoCheck = (($check.StdErr + $check.StdOut) -split "`r?`n" |
            Where-Object { $_ -match 'matching files|differences found|hashes could not be checked' }) -join ' | '
        Write-UpaLog "rclone $comandoCheck OK. $resumoCheck" 'OK'
        $uploadOk = $true
    }

    # ----------------------------------------------------------------------
    # 9. Retencao -- somente apos sucesso completo
    # ----------------------------------------------------------------------
    if ($SkipRetencao) {
        Write-UpaLog '9/9 Retencao ignorada: -SkipRetencao informado.' 'AVISO'
    }
    elseif (-not $uploadOk) {
        Write-UpaLog '9/9 Retencao NAO executada: sem copia externa verificada nesta execucao.' 'AVISO'
    }
    else {
        Write-UpaLog '9/9 Aplicando retencao.' 'PASSO'

        # --- Retencao local: mantem os N conjuntos completos mais recentes ---
        $conjuntos = @(Get-ChildItem -LiteralPath $dirBackup -Filter '*.dump' -File |
            Where-Object {
                (Test-Path -LiteralPath ([IO.Path]::ChangeExtension($_.FullName, 'sha256'))) -and
                (Test-Path -LiteralPath ($_.FullName -replace '\.dump$', '.manifest.json'))
            } |
            Sort-Object -Property Name -Descending)

        if ($conjuntos.Count -le $cfg.RetencaoLocal) {
            Write-UpaLog "Retencao local: $($conjuntos.Count) conjunto(s) completo(s), limite $($cfg.RetencaoLocal). Nada a remover." 'INFO'
        }
        else {
            foreach ($velho in $conjuntos[$cfg.RetencaoLocal..($conjuntos.Count - 1)]) {
                if ($velho.Name -eq "$nomeBase.dump") {
                    Write-UpaLog 'Retencao local: backup desta execucao protegido, nao sera removido.' 'AVISO'
                    continue
                }
                $prefixo = [IO.Path]::GetFileNameWithoutExtension($velho.Name)
                Get-ChildItem -LiteralPath $dirBackup -Filter "$prefixo.*" -File | ForEach-Object {
                    Remove-Item -LiteralPath $_.FullName -Force
                    Write-UpaLog "Retencao local: removido $($_.Name)" 'INFO'
                }
            }
        }

        # --- Retencao remota ---
        $lsf = Invoke-UpaProcesso -Arquivo $cfg.RcloneExecutavel -Argumentos (Get-ArgumentosRclone @(
                'lsf', $cfg.RcloneRemoto, '--include', '*.dump'
            )) -ToleraFalha

        if ($lsf.ExitCode -ne 0) {
            Write-UpaLog 'Retencao remota nao executada: falha ao listar o remote. O backup enviado permanece valido.' 'AVISO'
        }
        else {
            $remotos = @($lsf.StdOut -split "`r?`n" | Where-Object { $_.Trim() } | Sort-Object -Descending)
            if ($remotos.Count -le $cfg.RetencaoRemota) {
                Write-UpaLog "Retencao remota: $($remotos.Count) arquivo(s), limite $($cfg.RetencaoRemota). Nada a remover." 'INFO'
            }
            else {
                foreach ($alvoRemoto in $remotos[$cfg.RetencaoRemota..($remotos.Count - 1)]) {
                    $nomeRemoto = $alvoRemoto.Trim()
                    if ($nomeRemoto -eq "$nomeBase.dump") {
                        Write-UpaLog 'Retencao remota: backup desta execucao protegido, nao sera removido.' 'AVISO'
                        continue
                    }
                    $prefixoRemoto = $nomeRemoto -replace '\.dump$', ''
                    foreach ($sufixo in @('.dump', '.sha256', '.manifest.json')) {
                        $r = Invoke-UpaProcesso -Arquivo $cfg.RcloneExecutavel -Argumentos (Get-ArgumentosRclone @(
                                'deletefile', ('{0}/{1}{2}' -f $cfg.RcloneRemoto.TrimEnd('/'), $prefixoRemoto, $sufixo)
                            )) -ToleraFalha
                        if ($r.ExitCode -eq 0) {
                            Write-UpaLog "Retencao remota: removido $prefixoRemoto$sufixo" 'INFO'
                        }
                    }
                }
            }
        }
    }

    $cronometro.Stop()
    Write-UpaLog ("Backup concluido com sucesso em {0:N1}s." -f $cronometro.Elapsed.TotalSeconds) 'OK'
    Write-UpaLog "Arquivo: $arquivoDump" 'INFO'
    exit 0
}
catch {
    $cronometro.Stop()
    Remove-DumpTemporarioDoContainer -Container $cfg.ContainerBanco -Caminho $dumpNoContainer
    Write-UpaLog ("FALHA no backup: {0}" -f $_.Exception.Message) 'ERRO'
    Write-UpaLog 'Nenhuma retencao foi executada. Backups anteriores permanecem intactos.' 'AVISO'
    exit 1
}
finally {
    if ($trava) { $trava.Dispose() }
}
