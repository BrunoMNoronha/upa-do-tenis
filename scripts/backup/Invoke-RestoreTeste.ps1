<#
.SYNOPSIS
    Restauracao NAO DESTRUTIVA de um backup em banco PostgreSQL isolado,
    para provar recuperabilidade sem tocar o banco operacional.

.DESCRIPTION
    Fluxo executado:

        1. obtencao do backup (arquivo local ou download do remote rclone)
        2. validacao do SHA-256 contra o arquivo .sha256, quando disponivel
        3. validacao do archive com pg_restore --list
        4. criacao de um banco temporario isolado
        5. pg_restore --exit-on-error no banco temporario
        6. verificacoes de integridade (tabelas e contagens criticas)
        7. comparacao com o manifesto de origem, quando disponivel
        8. relatorio com a duracao total
        9. remocao do banco temporario (a menos que -ManterBanco)

    TRAVA DE SEGURANCA
    ------------------
    Este script e ESTRUTURALMENTE incapaz de sobrescrever o banco operacional:

    - o nome do banco de destino e SEMPRE gerado internamente, no formato
      upa_restore_teste_<carimbo>. Nao existe parametro para escolher o
      destino, portanto nao ha entrada do usuario capaz de apontar para o
      banco de producao;
    - antes de qualquer escrita, o nome gerado e reconferido contra o padrao
      esperado e contra o nome do banco operacional lido da configuracao;
    - pg_restore recebe --dbname apontando exclusivamente para o banco
      temporario recem-criado e vazio;
    - o script nunca executa DROP/CREATE sobre o banco operacional.

    Nao existe flag capaz de transformar este script num restore de producao.
    Restaurar sobre o banco operacional e um procedimento MANUAL, descrito em
    docs/04-producao/RUNBOOK_BACKUP_RESTORE_LOCAL.md.

.PARAMETER ConfigPath
    Caminho para backup.config.psd1.

.PARAMETER Arquivo
    Caminho de um .dump local. Se omitido e -DoRemoto nao for usado, o script
    escolhe automaticamente o backup local mais recente.

.PARAMETER DoRemoto
    Baixa o backup do remote rclone antes de restaurar.

.PARAMETER NomeRemoto
    Nome do arquivo .dump no remote. Se omitido com -DoRemoto, usa o mais
    recente pela ordenacao do nome.

.PARAMETER ManterBanco
    Nao remove o banco temporario ao final. Util para smoke test manual
    apontando a aplicacao temporariamente para ele.

.EXAMPLE
    pwsh -File scripts/backup/Invoke-RestoreTeste.ps1

.EXAMPLE
    pwsh -File scripts/backup/Invoke-RestoreTeste.ps1 -DoRemoto -ManterBanco
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $false)]
    [string] $ConfigPath,

    [Parameter(Mandatory = $false)]
    [string] $Arquivo,

    [Parameter(Mandatory = $false)]
    [switch] $DoRemoto,

    [Parameter(Mandatory = $false)]
    [string] $NomeRemoto,

    [Parameter(Mandatory = $false)]
    [switch] $ManterBanco
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

$raizScript = Split-Path -Parent $MyInvocation.MyCommand.Path
$raizRepo = Split-Path -Parent (Split-Path -Parent $raizScript)
Import-Module (Join-Path $raizScript 'lib/UpaBackup.psm1') -Force

if (-not $ConfigPath) {
    $candidato = Join-Path $raizScript 'backup.config.psd1'
    if (Test-Path -LiteralPath $candidato) { $ConfigPath = $candidato }
}
$cfg = Get-UpaConfiguracao -CaminhoConfig $ConfigPath

$dirBackup = Resolve-UpaCaminhoRaiz -Caminho $cfg.DiretorioBackup -Raiz $raizRepo
$dirLog = Resolve-UpaCaminhoRaiz -Caminho $cfg.DiretorioLog -Raiz $raizRepo
New-Item -ItemType Directory -Force -Path $dirBackup, $dirLog | Out-Null

$carimbo = Get-Date -Format 'yyyy-MM-dd_HH-mm-ss'
Initialize-UpaLog -CaminhoLog (Join-Path $dirLog "restore_$carimbo.log")

# --------------------------------------------------------------------------
# TRAVA: nome do banco de destino gerado internamente, nunca recebido.
# --------------------------------------------------------------------------
$prefixoSeguro = 'upa_restore_teste_'
$bancoTemp = '{0}{1}' -f $prefixoSeguro, ($carimbo -replace '[^0-9]', '')

$dumpNoContainer = "/tmp/restore_$carimbo.dump"
$cronometro = [System.Diagnostics.Stopwatch]::StartNew()
$bancoCriado = $false

function Get-ArgumentosRclone {
    param([string[]] $Argumentos)
    if ($cfg.RcloneConfig) { return @('--config', $cfg.RcloneConfig) + $Argumentos }
    return $Argumentos
}

function Invoke-Psql {
    param([string] $Banco, [string] $Sql, [switch] $ToleraFalha)
    return Invoke-UpaProcesso -Arquivo 'docker' -Argumentos @(
        'exec', $cfg.ContainerBanco, 'psql', '-U', $cfg.Usuario, '-d', $Banco, '-tAc', $Sql
    ) -ToleraFalha:$ToleraFalha
}

try {
    Write-UpaLog 'Restore de TESTE (nao destrutivo) iniciado.' 'PASSO'
    Write-UpaLog "Banco operacional protegido: '$($cfg.Banco)'. Destino do teste: '$bancoTemp'." 'INFO'

    # --- Reconferencia da trava, antes de qualquer escrita ---
    if (-not $bancoTemp.StartsWith($prefixoSeguro)) {
        throw "TRAVA DE SEGURANCA: nome de destino '$bancoTemp' fora do padrao '$prefixoSeguro*'. Abortado."
    }
    if ($bancoTemp -eq $cfg.Banco) {
        throw "TRAVA DE SEGURANCA: destino coincide com o banco operacional. Abortado."
    }
    Write-UpaLog 'Trava de seguranca validada: destino e um banco temporario isolado.' 'OK'

    if (-not (Test-UpaContainerAtivo -Nome $cfg.ContainerBanco)) {
        throw "Container '$($cfg.ContainerBanco)' nao esta em execucao."
    }

    # ----------------------------------------------------------------------
    # 1. Obtencao do backup
    # ----------------------------------------------------------------------
    if ($DoRemoto) {
        Write-UpaLog "1/9 Baixando backup do remote '$($cfg.RcloneRemoto)'." 'PASSO'
        if (-not $NomeRemoto) {
            $lsf = Invoke-UpaProcesso -Arquivo $cfg.RcloneExecutavel -Argumentos (Get-ArgumentosRclone @(
                    'lsf', $cfg.RcloneRemoto, '--include', '*.dump'
                ))
            $remotos = @($lsf.StdOut -split "`r?`n" | Where-Object { $_.Trim() } | Sort-Object -Descending)
            if ($remotos.Count -eq 0) { throw 'Nenhum backup .dump encontrado no remote.' }
            $NomeRemoto = $remotos[0].Trim()
        }
        Write-UpaLog "Arquivo remoto selecionado: $NomeRemoto" 'INFO'

        $dirDownload = Join-Path $dirBackup 'download'
        New-Item -ItemType Directory -Force -Path $dirDownload | Out-Null
        $prefixoRemoto = $NomeRemoto -replace '\.dump$', ''
        foreach ($sufixo in @('.dump', '.sha256', '.manifest.json')) {
            $r = Invoke-UpaProcesso -Arquivo $cfg.RcloneExecutavel -Argumentos (Get-ArgumentosRclone @(
                    'copyto', ('{0}/{1}{2}' -f $cfg.RcloneRemoto.TrimEnd('/'), $prefixoRemoto, $sufixo),
                    (Join-Path $dirDownload "$prefixoRemoto$sufixo")
                )) -ToleraFalha:($sufixo -ne '.dump')
            if ($r.ExitCode -eq 0) { Write-UpaLog "Baixado: $prefixoRemoto$sufixo" 'OK' }
            else { Write-UpaLog "Nao disponivel no remote: $prefixoRemoto$sufixo" 'AVISO' }
        }
        $Arquivo = Join-Path $dirDownload $NomeRemoto
    }
    elseif (-not $Arquivo) {
        Write-UpaLog '1/9 Selecionando o backup local mais recente.' 'PASSO'
        $maisRecente = Get-ChildItem -LiteralPath $dirBackup -Filter '*.dump' -File |
            Sort-Object -Property Name -Descending | Select-Object -First 1
        if (-not $maisRecente) { throw "Nenhum backup .dump encontrado em $dirBackup" }
        $Arquivo = $maisRecente.FullName
    }
    else {
        Write-UpaLog '1/9 Usando o backup informado via -Arquivo.' 'PASSO'
    }

    if (-not (Test-Path -LiteralPath $Arquivo)) { throw "Backup nao encontrado: $Arquivo" }
    $itemDump = Get-Item -LiteralPath $Arquivo
    if ($itemDump.Length -le 0) { throw "Backup com tamanho zero: $Arquivo" }
    Write-UpaLog ("Backup: {0} ({1:N0} bytes)." -f $itemDump.Name, $itemDump.Length) 'OK'

    # ----------------------------------------------------------------------
    # 2. Validacao do SHA-256
    # ----------------------------------------------------------------------
    Write-UpaLog '2/9 Validando SHA-256.' 'PASSO'
    $caminhoHash = [IO.Path]::ChangeExtension($itemDump.FullName, 'sha256')
    $hashCalculado = Get-UpaSha256 -Caminho $itemDump.FullName
    if (Test-Path -LiteralPath $caminhoHash) {
        $hashEsperado = ((Get-Content -LiteralPath $caminhoHash -Raw) -split '\s+')[0].Trim().ToLowerInvariant()
        if ($hashCalculado -ne $hashEsperado) {
            throw "SHA-256 divergente. Esperado $hashEsperado, calculado $hashCalculado. Backup corrompido."
        }
        Write-UpaLog "SHA-256 confere com o manifesto: $hashCalculado" 'OK'
    }
    else {
        Write-UpaLog "Arquivo .sha256 ausente; hash calculado agora: $hashCalculado" 'AVISO'
    }

    # ----------------------------------------------------------------------
    # 3. Validacao do archive
    # ----------------------------------------------------------------------
    Write-UpaLog '3/9 Validando archive com pg_restore --list.' 'PASSO'
    $dirDoDump = Split-Path -Parent $itemDump.FullName
    $lista = Invoke-UpaProcesso -Arquivo 'docker' -Argumentos @(
        'run', '--rm', '-v', "$($dirDoDump):/backup:ro", $cfg.ImagemPostgres,
        'pg_restore', '--list', "/backup/$($itemDump.Name)"
    )
    $entradas = @($lista.StdOut -split "`r?`n" | Where-Object { $_ -and -not $_.StartsWith(';') })
    if ($entradas.Count -lt 1) { throw 'pg_restore --list nao retornou entradas de TOC.' }
    Write-UpaLog "Archive valido: $($entradas.Count) entradas de TOC." 'OK'

    # ----------------------------------------------------------------------
    # 4. Criacao do banco temporario isolado
    # ----------------------------------------------------------------------
    Write-UpaLog "4/9 Criando banco temporario isolado '$bancoTemp'." 'PASSO'
    $existe = (Invoke-Psql -Banco 'postgres' -Sql "SELECT 1 FROM pg_database WHERE datname='$bancoTemp'").StdOut.Trim()
    if ($existe -eq '1') { throw "Banco temporario '$bancoTemp' ja existe. Abortado por seguranca." }
    Invoke-Psql -Banco 'postgres' -Sql "CREATE DATABASE `"$bancoTemp`"" | Out-Null
    $bancoCriado = $true
    Write-UpaLog "Banco temporario criado e vazio." 'OK'

    # ----------------------------------------------------------------------
    # 5. pg_restore
    # ----------------------------------------------------------------------
    Write-UpaLog '5/9 Restaurando com pg_restore --exit-on-error.' 'PASSO'
    $cronoRestore = [System.Diagnostics.Stopwatch]::StartNew()
    Invoke-UpaProcesso -Arquivo 'docker' -Argumentos @(
        'cp', $itemDump.FullName, "$($cfg.ContainerBanco):$dumpNoContainer"
    ) | Out-Null
    Invoke-UpaProcesso -Arquivo 'docker' -Argumentos @(
        'exec', $cfg.ContainerBanco,
        'pg_restore', '-U', $cfg.Usuario, '--dbname', $bancoTemp,
        '--exit-on-error', '--no-owner', '--no-privileges', $dumpNoContainer
    ) | Out-Null
    $cronoRestore.Stop()
    Invoke-UpaProcesso -Arquivo 'docker' -Argumentos @(
        'exec', $cfg.ContainerBanco, 'rm', '-f', $dumpNoContainer
    ) -ToleraFalha | Out-Null
    Write-UpaLog ("pg_restore concluido sem erros em {0:N1}s." -f $cronoRestore.Elapsed.TotalSeconds) 'OK'

    # ----------------------------------------------------------------------
    # 6. Verificacoes de integridade
    # ----------------------------------------------------------------------
    Write-UpaLog '6/9 Executando verificacoes de integridade.' 'PASSO'
    $tabelasRestauradas = (Invoke-Psql -Banco $bancoTemp -Sql `
            "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'").StdOut.Trim()
    Write-UpaLog "Tabelas no schema public do banco restaurado: $tabelasRestauradas" 'INFO'
    if ([int]$tabelasRestauradas -le 0) { throw 'Banco restaurado nao possui tabelas no schema public.' }

    $migracoes = (Invoke-Psql -Banco $bancoTemp -Sql `
            "SELECT count(*) FROM public._prisma_migrations WHERE finished_at IS NOT NULL" -ToleraFalha).StdOut.Trim()
    Write-UpaLog "Migrations Prisma aplicadas no banco restaurado: $migracoes" 'INFO'

    $contagensRestauradas = Get-UpaContagemTabelas -Container $cfg.ContainerBanco -Usuario $cfg.Usuario `
        -Banco $bancoTemp -Tabelas $cfg.TabelasCriticas
    foreach ($tabela in $cfg.TabelasCriticas) {
        Write-UpaLog ("  {0,-30} {1}" -f $tabela, $contagensRestauradas[$tabela]) 'INFO'
    }

    # ----------------------------------------------------------------------
    # 7. Comparacao com o manifesto de origem
    # ----------------------------------------------------------------------
    Write-UpaLog '7/9 Comparando com o manifesto de origem.' 'PASSO'
    $caminhoManifesto = $itemDump.FullName -replace '\.dump$', '.manifest.json'
    $divergencias = 0
    if (Test-Path -LiteralPath $caminhoManifesto) {
        $manifesto = Get-Content -LiteralPath $caminhoManifesto -Raw | ConvertFrom-Json
        foreach ($tabela in $cfg.TabelasCriticas) {
            $origem = $manifesto.contagens_criticas.$tabela
            $destino = $contagensRestauradas[$tabela]
            if ("$origem" -ne "$destino") {
                Write-UpaLog "DIVERGENCIA em '$tabela': origem=$origem, restaurado=$destino" 'ERRO'
                $divergencias++
            }
            else {
                Write-UpaLog ("  {0,-30} origem={1} restaurado={2} OK" -f $tabela, $origem, $destino) 'OK'
            }
        }
        if ("$($manifesto.tabelas_schema_public)" -ne "$tabelasRestauradas") {
            Write-UpaLog ("DIVERGENCIA na contagem de tabelas: origem={0}, restaurado={1}" -f `
                    $manifesto.tabelas_schema_public, $tabelasRestauradas) 'ERRO'
            $divergencias++
        }
        if ($divergencias -gt 0) {
            throw "$divergencias divergencia(s) entre a origem e o banco restaurado."
        }
        Write-UpaLog 'Todas as contagens criticas conferem com a origem.' 'OK'
    }
    else {
        Write-UpaLog 'Manifesto ausente; comparacao com a origem nao pode ser feita.' 'AVISO'
    }

    # ----------------------------------------------------------------------
    # 8 e 9. Relatorio e limpeza
    # ----------------------------------------------------------------------
    $cronometro.Stop()
    Write-UpaLog '8/9 Relatorio.' 'PASSO'
    Write-UpaLog ("  Backup restaurado ........ {0}" -f $itemDump.Name) 'INFO'
    Write-UpaLog ("  Banco isolado ............ {0}" -f $bancoTemp) 'INFO'
    Write-UpaLog ("  Duracao do pg_restore .... {0:N1}s" -f $cronoRestore.Elapsed.TotalSeconds) 'INFO'
    Write-UpaLog ("  Duracao total do ciclo ... {0:N1}s" -f $cronometro.Elapsed.TotalSeconds) 'INFO'
    Write-UpaLog ("  Tabelas restauradas ...... {0}" -f $tabelasRestauradas) 'INFO'
    Write-UpaLog ("  Divergencias ............. {0}" -f $divergencias) 'INFO'

    if ($ManterBanco) {
        Write-UpaLog "9/9 Banco temporario '$bancoTemp' MANTIDO (-ManterBanco). Remova-o apos o smoke test." 'AVISO'
    }
    else {
        Write-UpaLog "9/9 Removendo banco temporario '$bancoTemp'." 'PASSO'
        Invoke-Psql -Banco 'postgres' -Sql "DROP DATABASE IF EXISTS `"$bancoTemp`"" | Out-Null
        Write-UpaLog 'Banco temporario removido. Nenhum artefato residual.' 'OK'
    }

    Write-UpaLog 'RESTORE DE TESTE APROVADO. O banco operacional nao foi tocado.' 'OK'
    exit 0
}
catch {
    $cronometro.Stop()
    Write-UpaLog ("FALHA no restore de teste: {0}" -f $_.Exception.Message) 'ERRO'
    if ($bancoCriado -and -not $ManterBanco) {
        Invoke-UpaProcesso -Arquivo 'docker' -Argumentos @(
            'exec', $cfg.ContainerBanco, 'psql', '-U', $cfg.Usuario, '-d', 'postgres',
            '-tAc', "DROP DATABASE IF EXISTS `"$bancoTemp`""
        ) -ToleraFalha | Out-Null
        Write-UpaLog "Banco temporario '$bancoTemp' removido apos a falha." 'INFO'
    }
    Invoke-UpaProcesso -Arquivo 'docker' -Argumentos @(
        'exec', $cfg.ContainerBanco, 'rm', '-f', $dumpNoContainer
    ) -ToleraFalha | Out-Null
    Write-UpaLog 'O banco operacional NAO foi alterado em nenhum momento.' 'INFO'
    exit 1
}
