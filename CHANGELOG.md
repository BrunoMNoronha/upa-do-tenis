# CHANGELOG

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

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
