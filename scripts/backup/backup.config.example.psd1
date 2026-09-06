<#
    Configuracao dos scripts de backup/restore do UPA do Tenis.

    Copie este arquivo para backup.config.psd1 (ignorado pelo Git) e ajuste
    apenas o necessario. Qualquer chave omitida usa o padrao do projeto.

        Copy-Item scripts/backup/backup.config.example.psd1 scripts/backup/backup.config.psd1

    ATENCAO
    -------
    Este arquivo NAO deve conter senha, DATABASE_URL, AUTH_SESSION_SECRET,
    token OAuth do Google ou a senha de criptografia do rclone. Nada aqui e
    segredo: sao apenas nomes e caminhos.

    - O acesso ao PostgreSQL usa o socket local do container (auth "trust" da
      imagem oficial), portanto nenhuma senha e necessaria.
    - As credenciais do Google Drive e as chaves do remote crypt vivem
      exclusivamente no rclone.conf, gerenciado pelo proprio rclone
      (rclone config), fora do repositorio.
#>
@{
    # --- PostgreSQL em Docker -------------------------------------------
    # Valores conforme docker-compose.local.yml (producao local piloto).
    ContainerBanco = 'upa-db'
    ContainerApp   = 'upa-app'
    Banco          = 'upa_do_tenis'
    Usuario        = 'upa_user'

    # Imagem usada para validar o archive no host, sem exigir pg_restore
    # instalado no Windows. Deve casar com a versao do servidor.
    ImagemPostgres = 'postgres:16-alpine'

    # --- Diretorios de runtime (relativos a raiz do repositorio) ---------
    # Ambos estao no .gitignore. Nenhum dump ou log e versionado.
    DiretorioBackup = 'backups/database'
    DiretorioLog    = 'backups/logs'

    # --- rclone / Google Drive ------------------------------------------
    # Caminho do executavel. Use o caminho absoluto quando a tarefa agendada
    # rodar sem o PATH completo do usuario.
    RcloneExecutavel = 'rclone'

    # Caminho alternativo do rclone.conf. Vazio = local padrao do rclone.
    # O arquivo em si NUNCA entra no repositorio.
    RcloneConfig = ''

    # Destino logico. Deve apontar para o remote CRYPT, nunca para o remote
    # base do Drive -- e o crypt que cifra conteudo e nomes antes do upload.
    RcloneRemoto = 'upa-drive-crypt:upa-do-tenis/database'

    # Quando $true, a verificacao pos-upload usa "rclone cryptcheck".
    # Defina $false apenas se o destino nao for um remote crypt (nesse caso a
    # verificacao passa a ser "rclone check --download", e o backup deixa de
    # ser criptografado no cliente).
    RemotoEhCrypt = $true

    # --- Retencao --------------------------------------------------------
    # Numero de backups mantidos. A limpeza so roda depois de backup +
    # validacao + upload + verificacao remota concluirem com sucesso, e nunca
    # remove o backup da execucao corrente.
    RetencaoLocal  = 7
    RetencaoRemota = 30

    # --- Integridade -----------------------------------------------------
    # Tabelas cujas contagens vao para o manifesto e sao comparadas apos o
    # restore. Nomes conforme os modelos do prisma/schema.prisma.
    TabelasCriticas = @(
        'Usuario'
        'Cliente'
        'OrdemServico'
        'ItemOrdemServico'
        'Pagamento'
        'Caixa'
        'MovimentacaoCaixa'
        'Venda'
        'MovimentacaoEstoqueProduto'
        'MovimentacaoEstoqueInsumo'
    )
}
