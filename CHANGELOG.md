# CHANGELOG

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

## [Não lançado]

### Adicionado
- **Dashboard: nova estrutura visual (PR 1 da refatoração)**: cabeçalho plano com saudação por horário, primeiro nome do usuário da sessão e data por extenso (fuso operacional); ações "Venda de balcão" e "Nova ordem de serviço" no cabeçalho.
  - Presets de período (Hoje, 7 dias, Este mês, Mês anterior) com `aria-pressed`; edição manual das datas marca "Personalizado" e só consulta ao clicar em Filtrar. Uma única chamada à API por aplicação de período.
  - Grade de quatro KPIs (`DashboardKpiCard`): Total recebido em destaque, Total pendente com a quantidade real de OS com saldo, Ticket médio e "OS ativas no período" (soma dos quatro status operacionais; canceladas não incluídas).
  - View model puro (`dashboard-view-model.ts`) com totais, percentuais protegidos contra divisão por zero e rankings normalizados, coberto por testes; sem alteração no endpoint `/api/dashboard` nem nas regras financeiras.
  - Durante uma nova filtragem, as métricas anteriores permanecem visíveis (estado de atualização discreto) e a falha mostra "Tentar novamente" sem desmontar o dashboard.
  - `AppShell` ganha o slot opcional `header` (cabeçalho plano) sem alterar as demais telas; `DateRangePicker` ganha `hidePresets` e `variant="inline"` (padrões preservados).
  - Fonte Manrope (via `next/font`) e tokens semânticos adicionais em `globals.css`; respeito a `prefers-reduced-motion`.
- **Múltiplos itens recebidos por OS** (issue #205): uma OS pode registrar vários objetos do mesmo cliente, cada um com descrição, foto e serviços próprios.
  - Cadastro com cards repetidores ("+ Adicionar outro item", até 10 itens), subtotal por item calculado dos serviços e total da OS derivado dos subtotais; não há mais valor total digitável.
  - Item pode ser cadastrado sem serviço e detalhado depois; o mesmo serviço é aceito em itens diferentes, mas não repetido no mesmo item.
  - `POST /api/ordens-servico` passa a receber `itens[]` e cria a OS e os itens em uma única transação, devolvendo o mapeamento `clientKey → id` para associar cada foto ao item certo. O contrato antigo (`itemRecebido` + `servicos`) continua aceito e vira um item.
  - Fotos são enviadas uma a uma após a criação; falha em uma foto não cria outra OS nem perde as já salvas, e "Reenviar fotos com falha" reenvia só as pendentes.
  - Listagem resume todos os itens (`3 itens: Tênis preto, Bota marrom +1`) e agrega os serviços; a busca encontra a OS pela descrição de qualquer item.
  - Sem alteração de schema Prisma; a galeria de várias fotos por item fica para a issue #206.
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
