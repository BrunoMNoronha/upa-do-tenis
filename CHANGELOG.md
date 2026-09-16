# CHANGELOG

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

## [Não lançado]

### Adicionado
- **Fotos da OS pelo celular** (`/os/fotos`, PR #202): tela mobile-first para incluir fotos em ordens de serviço, acessível pelo menu "Fotos da OS".
  - Busca de OS por número (priorizando o número exato), nome ou telefone do cliente, com estados de carregando, nenhum resultado e erro.
  - Conferência de número, cliente, item e status antes da foto; em OS com vários itens, o operador escolhe o item.
  - Captura nativa do navegador com câmera traseira (`capture="environment"`) e opção "Escolher da galeria".
  - Preview antes do envio, com "Tirar novamente" e "Confirmar envio"; nada é enviado sem confirmação.
  - Reutiliza a otimização de imagem existente e a rota de upload existente (Blob privado); sem novo pipeline, sem mudança de API ou schema.
  - Proteção contra envio duplicado; em falha de rede a foto é mantida e "Tentar novamente" reenvia o mesmo arquivo.
  - Após o sucesso: "Adicionar outra foto" (mesma OS), "Buscar outra OS" ou "Abrir OS".
  - Fotos só podem ser incluídas com a OS aberta. Cada item guarda uma foto: enviar outra substitui a atual, com aviso na tela.

## [MVP v1.0.0] - Checkpoint Atual

### Adicionado
- **Configuração Base**: Projeto inicializado com Next.js 14, TypeScript, Tailwind CSS, Prisma e SQLite.
- **Painel Administrativo**: Interface shell com navegação lateral e dashboard inicial.
- **Gestão de Clientes**: CRUD básico de clientes (Listagem, Criação, Consulta).
- **Ordens de Serviço (OS)**: Fluxo inicial de criação de OS vinculada a cliente, com status inicial (`ABERTA`).
- **Modelo de Dados (Prisma)**:
  - `Cliente`, `OrdemServico`, `ItemOrdemServico`, `Servico`, `ServicoItemOrdem`, `FormaPagamento`, `Pagamento`, `HistoricoStatus`, `Insumo`.
- **Scripts de Configuração**: Seed seguro de formas de pagamento e serviços.
- **Processos de Qualidade**: Adição e validação limpa de `lint`, `typecheck` e `build`.
- **Documentações Técnicas**: Roteiros de homologação, arquitetura, testes e banco de dados.

### Modificado
- N/A (Esta é a primeira versão documentada).

### Removido
- N/A
