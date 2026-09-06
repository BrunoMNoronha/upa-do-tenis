<#
.SYNOPSIS
    Funcoes compartilhadas pelos scripts de backup e restore do UPA do Tenis.

.DESCRIPTION
    Este modulo concentra log, execucao de processos externos, hashing e
    carregamento de configuracao. Nenhuma funcao aqui recebe, imprime ou
    persiste senha, DATABASE_URL, AUTH_SESSION_SECRET, token OAuth ou
    configuracao criptografica do rclone.

    O acesso ao PostgreSQL e sempre feito via "docker exec" pelo socket UNIX
    local do container, que a imagem oficial do Postgres autentica com "trust".
    Por isso nenhum script precisa de senha.
#>

Set-StrictMode -Version Latest

$script:ArquivoLog = ''

$script:PadraoSegredo = @(
    '(?i)(password|senha|pwd)\s*[:=]\s*\S+'
    '(?i)postgres(ql)?://[^\s]+'
    '(?i)(token|secret|client[_-]?id|client[_-]?secret|api[_-]?key)\s*[:=]\s*\S+'
    '(?i)PGPASSWORD=\S+'
)

function Protect-UpaTexto {
    <#
    .SYNOPSIS
        Remove de um texto qualquer padrao que se pareca com credencial.
    .DESCRIPTION
        Ultima linha de defesa antes de escrever em log. Nao substitui a regra
        principal, que e simplesmente nunca passar segredo para os scripts.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory = $false, ValueFromPipeline = $true)]
        [AllowNull()]
        [AllowEmptyString()]
        [string] $Texto
    )
    process {
        if ([string]::IsNullOrEmpty($Texto)) { return $Texto }
        $resultado = $Texto
        foreach ($padrao in $script:PadraoSegredo) {
            $resultado = [regex]::Replace($resultado, $padrao, '<<REDIGIDO>>')
        }
        return $resultado
    }
}

function Initialize-UpaLog {
    <#
    .SYNOPSIS
        Define o arquivo de log usado por Write-UpaLog nesta sessao.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $CaminhoLog
    )
    $diretorio = Split-Path -Parent $CaminhoLog
    if ($diretorio -and -not (Test-Path -LiteralPath $diretorio)) {
        New-Item -ItemType Directory -Force -Path $diretorio | Out-Null
    }
    $script:ArquivoLog = $CaminhoLog
}

function Write-UpaLog {
    <#
    .SYNOPSIS
        Escreve uma linha de log no console e, se configurado, em arquivo.
    #>
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true, Position = 0)]
        [AllowEmptyString()]
        [string] $Mensagem,

        [Parameter(Mandatory = $false, Position = 1)]
        [ValidateSet('INFO', 'OK', 'AVISO', 'ERRO', 'PASSO')]
        [string] $Nivel = 'INFO'
    )

    $limpa = Protect-UpaTexto -Texto $Mensagem
    $linha = '[{0}] [{1,-5}] {2}' -f (Get-Date -Format 'yyyy-MM-dd HH:mm:ss'), $Nivel, $limpa

    switch ($Nivel) {
        'ERRO'  { Write-Host $linha -ForegroundColor Red }
        'AVISO' { Write-Host $linha -ForegroundColor Yellow }
        'OK'    { Write-Host $linha -ForegroundColor Green }
        'PASSO' { Write-Host $linha -ForegroundColor Cyan }
        default { Write-Host $linha }
    }

    if ($script:ArquivoLog) {
        Add-Content -LiteralPath $script:ArquivoLog -Value $linha -Encoding utf8
    }
}

function Invoke-UpaProcesso {
    <#
    .SYNOPSIS
        Executa um processo externo capturando stdout, stderr e exit code.
    .DESCRIPTION
        Usa ProcessStartInfo.ArgumentList, que entrega cada argumento ao
        processo filho de forma independente e com o escape correto do
        Windows. E obrigatorio usar ArgumentList e nao uma unica string:
        argumentos que contem espaco -- como as consultas SQL passadas em
        "psql -tAc" -- seriam quebrados em varios argumentos se fossem
        simplesmente concatenados, produzindo falha silenciosa.

        Nenhum dado binario trafega por estes streams: o dump e sempre movido
        com "docker cp", nunca por redirecionamento de stdout.
    .OUTPUTS
        PSCustomObject com ExitCode, StdOut, StdErr.
    #>
    [CmdletBinding()]
    [OutputType([pscustomobject])]
    param(
        [Parameter(Mandatory = $true)]
        [string] $Arquivo,

        [Parameter(Mandatory = $true)]
        [string[]] $Argumentos,

        [Parameter(Mandatory = $false)]
        [switch] $ToleraFalha
    )

    $info = [System.Diagnostics.ProcessStartInfo]::new()
    $info.FileName = $Arquivo
    $info.UseShellExecute = $false
    $info.RedirectStandardOutput = $true
    $info.RedirectStandardError = $true
    $info.CreateNoWindow = $true
    foreach ($argumento in $Argumentos) { $info.ArgumentList.Add([string]$argumento) }

    $processo = [System.Diagnostics.Process]::new()
    $processo.StartInfo = $info
    try {
        [void]$processo.Start()
        # Leitura assincrona dos dois streams antes do Wait, para nao travar
        # quando um deles enche o buffer do pipe.
        $tarefaSaida = $processo.StandardOutput.ReadToEndAsync()
        $tarefaErro = $processo.StandardError.ReadToEndAsync()
        $processo.WaitForExit()
        $saida = $tarefaSaida.GetAwaiter().GetResult()
        $erro = $tarefaErro.GetAwaiter().GetResult()
        $codigo = $processo.ExitCode
    }
    finally {
        $processo.Dispose()
    }

    $resultado = [pscustomobject]@{
        ExitCode = $codigo
        StdOut   = if ($null -eq $saida) { '' } else { $saida }
        StdErr   = if ($null -eq $erro) { '' } else { $erro }
    }

    if ($resultado.ExitCode -ne 0 -and -not $ToleraFalha) {
        $detalhe = if ([string]::IsNullOrWhiteSpace($resultado.StdErr)) { $resultado.StdOut } else { $resultado.StdErr }
        $detalheLimpo = (Protect-UpaTexto -Texto ($detalhe -replace '\s+', ' ')).Trim()
        throw ("Comando '{0}' terminou com codigo {1}. Detalhe: {2}" -f $Arquivo, $resultado.ExitCode, $detalheLimpo)
    }

    return $resultado
}

function Get-UpaSha256 {
    <#
    .SYNOPSIS
        Calcula o SHA-256 de um arquivo, em minusculas.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory = $true)]
        [string] $Caminho
    )
    return (Get-FileHash -LiteralPath $Caminho -Algorithm SHA256).Hash.ToLowerInvariant()
}

function Test-UpaContainerAtivo {
    <#
    .SYNOPSIS
        Confirma que um container Docker existe e esta em execucao.
    #>
    [CmdletBinding()]
    [OutputType([bool])]
    param(
        [Parameter(Mandatory = $true)]
        [string] $Nome
    )
    $r = Invoke-UpaProcesso -Arquivo 'docker' -Argumentos @(
        'ps', '--filter', "name=^/$Nome$", '--format', '{{.Names}}'
    ) -ToleraFalha
    if ($r.ExitCode -ne 0) { return $false }
    $linhas = @($r.StdOut -split "`r?`n" | Where-Object { $_.Trim() -eq $Nome })
    return $linhas.Count -gt 0
}

function Get-UpaConfiguracao {
    <#
    .SYNOPSIS
        Carrega backup.config.psd1 e aplica os valores padrao do projeto.
    .DESCRIPTION
        O arquivo de configuracao real fica fora do Git. Ele contem apenas
        nomes de container, banco, usuario, caminhos e o nome do remote do
        rclone -- nunca segredo. As credenciais do Google Drive vivem
        exclusivamente no rclone.conf, gerenciado pelo proprio rclone
        (rclone config), fora do repositorio.
    #>
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $false)]
        [string] $CaminhoConfig
    )

    $padrao = @{
        ContainerBanco   = 'upa-db'
        ContainerApp     = 'upa-app'
        Banco            = 'upa_do_tenis'
        Usuario          = 'upa_user'
        ImagemPostgres   = 'postgres:16-alpine'
        DiretorioBackup  = 'backups/database'
        DiretorioLog     = 'backups/logs'
        RcloneExecutavel = 'rclone'
        RcloneConfig     = ''
        RcloneRemoto     = 'upa-drive-crypt:upa-do-tenis/database'
        RemotoEhCrypt    = $true
        RetencaoLocal    = 7
        RetencaoRemota   = 30
        TabelasCriticas  = @(
            'Usuario', 'Cliente', 'OrdemServico', 'ItemOrdemServico',
            'Pagamento', 'Caixa', 'MovimentacaoCaixa', 'Venda',
            'MovimentacaoEstoqueProduto', 'MovimentacaoEstoqueInsumo'
        )
    }

    if ($CaminhoConfig) {
        if (-not (Test-Path -LiteralPath $CaminhoConfig)) {
            throw "Arquivo de configuracao nao encontrado: $CaminhoConfig"
        }
        $usuario = Import-PowerShellDataFile -LiteralPath $CaminhoConfig
        foreach ($chave in $usuario.Keys) {
            if (-not $padrao.ContainsKey($chave)) {
                throw "Chave de configuracao desconhecida: '$chave'. Compare com backup.config.example.psd1."
            }
            $padrao[$chave] = $usuario[$chave]
        }
    }

    return $padrao
}

function Resolve-UpaCaminhoRaiz {
    <#
    .SYNOPSIS
        Converte um caminho relativo em absoluto, ancorado na raiz informada.
    #>
    [CmdletBinding()]
    [OutputType([string])]
    param(
        [Parameter(Mandatory = $true)]
        [string] $Caminho,

        [Parameter(Mandatory = $true)]
        [string] $Raiz
    )
    if ([System.IO.Path]::IsPathRooted($Caminho)) { return $Caminho }
    return (Join-Path -Path $Raiz -ChildPath $Caminho)
}

function Get-UpaContagemTabelas {
    <#
    .SYNOPSIS
        Retorna a contagem de linhas das tabelas informadas, em um banco.
    .DESCRIPTION
        Usado tanto no momento do backup (origem) quanto apos o restore
        (destino), permitindo comparacao objetiva. Somente COUNT(*); nenhuma
        linha de dado real e lida ou registrada.
    .OUTPUTS
        Hashtable nome-da-tabela -> contagem (int) ou 'AUSENTE'.
    #>
    [CmdletBinding()]
    [OutputType([hashtable])]
    param(
        [Parameter(Mandatory = $true)]
        [string] $Container,

        [Parameter(Mandatory = $true)]
        [string] $Usuario,

        [Parameter(Mandatory = $true)]
        [string] $Banco,

        [Parameter(Mandatory = $true)]
        [string[]] $Tabelas
    )

    $contagens = @{}
    foreach ($tabela in $Tabelas) {
        $sql = @"
SELECT CASE WHEN to_regclass('public."$tabela"') IS NULL
            THEN 'AUSENTE'
            ELSE (SELECT count(*)::text FROM public."$tabela")
       END;
"@
        $r = Invoke-UpaProcesso -Arquivo 'docker' -Argumentos @(
            'exec', $Container, 'psql', '-U', $Usuario, '-d', $Banco, '-tAc', $sql
        ) -ToleraFalha

        if ($r.ExitCode -ne 0) {
            $contagens[$tabela] = 'ERRO'
        }
        else {
            $valor = $r.StdOut.Trim()
            $contagens[$tabela] = if ($valor -match '^\d+$') { [int]$valor } else { $valor }
        }
    }
    return $contagens
}

Export-ModuleMember -Function @(
    'Protect-UpaTexto', 'Initialize-UpaLog', 'Write-UpaLog', 'Invoke-UpaProcesso',
    'Get-UpaSha256', 'Test-UpaContainerAtivo', 'Get-UpaConfiguracao',
    'Resolve-UpaCaminhoRaiz', 'Get-UpaContagemTabelas'
)
