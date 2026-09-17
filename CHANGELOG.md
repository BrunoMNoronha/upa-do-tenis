# CHANGELOG

Todas as alterações notáveis deste projeto serão documentadas neste arquivo.

## [Não lançado]

### Corrigido
- **OS com pagamento não pode ser cancelada (#229)**: enquanto não existe estorno e devolução (#230), `PATCH /api/ordens-servico/[id]/status` recusa cancelar OS com pagamento registrado (409). A checagem acontece na mesma transação e a gravação exige `valorPago = 0`.
  - OS cancelada não recebe mais pagamento (409): a gravação final do pagamento exige OS não cancelada, e a transação inteira (pagamento e caixa) é desfeita se um cancelamento concorrente for confirmado antes.
  - Detalhe da OS: "Cancelar OS" some quando há valor pago, com a explicação; "Receber pagamento" some em OS cancelada.
  - Sem alteração de schema, valores, saldo ou cálculo de caixa. Testes de integração com banco real cobrem as duas ordens de corrida.

### Adicionado
- **Estorno de Atendimento Rápido — API (fatia 1)**: `POST /api/atendimentos-rapidos/[id]/estorno` com `{ motivo }` (5 a 500 caracteres, aparado). O estorno é sempre total: estorna todos os pagamentos do atendimento de uma vez, registrando o usuário da sessão.
  - Uma transação grava um `EstornoPagamento` por pagamento e lança uma SAÍDA `ESTORNO_ATENDIMENTO_RAPIDO` no caixa aberto na forma de cada pagamento original. A linha do atendimento é travada no início; qualquer falha desfaz tudo.
  - Recusas sem gravar nada: atendimento inexistente (404), já estornado (409, também na corrida, pela restrição única), sem caixa aberto (400), motivo inválido (400).
  - O atendimento não é apagado: `GET /api/atendimentos-rapidos` devolve `estorno` (data e motivo) ou `null`.
  - Dashboard: o recebido líquido já descontava o estorno; atendimento estornado deixa de contar em "Serviços mais executados".
  - Caixa: rótulo "Estorno de Atendimento Rápido". Sem alteração de schema e sem mudança no cálculo do caixa. Ainda sem tela (fatia 2).
- **Atendimento Rápido**: registro de serviço executado, entregue e pago integralmente no mesmo momento, sem cliente, status, saldo ou número de OS. Código `AR-DDMMAAAA-NNNN` sequencial por dia (America/Sao_Paulo), gerado no backend sob advisory lock transacional e único no banco.
  - **Migration `20260917140000_add_atendimento_rapido`**: tabelas `AtendimentoRapido` e `ItemAtendimentoRapido` (serviço, descrição e valor como snapshot; sem quantidade); `Pagamento.ordemServicoId` passa a opcional, com `atendimentoRapidoId` e CHECK de origem exclusiva (OS ou AR); `MovimentacaoCaixa.atendimentoRapidoId` e origem `ATENDIMENTO_RAPIDO`. FKs novas com `ON DELETE RESTRICT`; pagamentos existentes preservados.
  - Uma única transação grava atendimento, itens, um `Pagamento` e uma entrada de caixa por forma de pagamento (pagamento dividido permitido; soma exatamente igual ao total, em centavos inteiros). Exige caixa aberto; qualquer falha desfaz tudo.
  - Preço do catálogo é só o valor inicial: o operador pode alterá-lo sem mudar `Servico.precoBase`.
  - Idempotência por chave de envio: reenvio ou duplo clique devolve o mesmo atendimento; a mesma chave com outro conteúdo retorna 409.
  - Telas `/atendimento-rapido` (registro) e `/atendimentos-rapidos` (histórico com busca por código e período); rótulo "Atendimento Rápido" nas movimentações do caixa.
  - Dashboard: total recebido e recebimentos por dia incluem os pagamentos de AR; "Serviços mais executados" soma as execuções de OS e de AR (um item = uma execução) antes do Top 5.
  - Serviço usado em atendimento rápido não pode ser excluído (409; inativar).
- **Estorno de pagamentos de OS — tela no detalhe da OS (#230, fatia 4)**: em "Pagamentos registrados", cada pagamento não estornado de OS não cancelada tem o botão "Estornar".
  - Diálogo com valor, forma, data e motivo obrigatório (5 a 500 caracteres, validado também na tela). Foco no motivo; Esc fecha; erros da API (sem caixa aberto, já estornado) aparecem no diálogo em `role="alert"`.
  - Depois do estorno, o detalhe é recarregado: pago, saldo, status financeiro e histórico se atualizam sem recarregar a página. Com todos os pagamentos estornados, "Cancelar OS" volta a aparecer.
  - Pagamento estornado aparece riscado, com a etiqueta "Estornado em … por … — motivo". O detalhe da OS passa a devolver data, motivo e usuário do estorno.
  - A mensagem da OS com pagamento passa a orientar: "Estorne os pagamentos para poder cancelá-la." OS bloqueada só por sinal legado recebe mensagem própria, sem orientar estorno (na tela e no 409 da rota de status).
  - Com o estorno aceito, o diálogo fecha e confirma o estorno antes de recarregar; uma falha na recarga não aparece como falha do estorno.
- **Estorno de pagamentos de OS — dashboard, relatórios e caixa (#230, fatia 3)**: o dashboard passa a mostrar o recebido líquido. Pagamentos contam no dia de `dataPagamento` e estornos são descontados no dia de `dataEstorno`, sem alterar dias anteriores.
  - `totalRecebido` e `recebimentosPorDia` saem das mesmas leituras (pagamentos e estornos) num único snapshot `REPEATABLE READ`, inclusive quando o período passa do limite da série. A soma da série continua igual ao total.
  - Gráfico "Recebimentos por dia": um dia com mais estorno que pagamento aparece com barra vermelha abaixo do eixo, na mesma escala das barras positivas. Sem estorno, o gráfico fica idêntico. "Melhor dia" e "Dias com recebimento" consideram só dias positivos.
  - Caixa: a origem das movimentações aparece com rótulo legível ("Pagamento de OS", "Estorno de pagamento de OS", "Atendimento Rápido", "Manual", "Venda de balcão").
  - Relatório financeiro de OS: já era líquido pela fatia 1; teste de integração confirma a coerência com o detalhe da OS depois do estorno.
  - Sem alteração de schema e sem mudança no cálculo do caixa.
- **Estorno de pagamentos de OS — API com caixa (#230, fatia 2)**: `POST /api/ordens-servico/[id]/pagamentos/[pagamentoId]/estorno` com `{ motivo }` (5 a 500 caracteres, aparado). Estorna o pagamento inteiro, uma única vez, registrando o usuário da sessão.
  - Uma transação grava o estorno, lança SAÍDA `ESTORNO_PAGAMENTO_OS` no caixa aberto na forma do pagamento original e regrava `valorPago`/`saldo` da OS. A linha da OS é travada no início, e estornos concorrentes da mesma OS ficam em fila.
  - Recusas sem gravar nada: pagamento inexistente ou de outra OS (404, inclusive pagamentos de Atendimento Rápido, fora de escopo), OS cancelada (409), pagamento já estornado (409, também na corrida, pela restrição única), sem caixa aberto (400), motivo inválido (400).
  - `GET /api/ordens-servico/[id]/pagamentos` devolve o estorno de cada pagamento (valor, motivo, data e usuário).
  - Sem alteração de schema e sem mudança no cálculo do caixa. Ainda sem tela (fatia 4) e sem desconto no dashboard (fatia 3).
- **Estorno de pagamentos de OS — modelo e cálculo (#230, fatia 1)**: modelo `EstornoPagamento` (um por pagamento, motivo, usuário e `dataEstorno`) e vínculo opcional `MovimentacaoCaixa.estornoPagamentoId`, com migration aditiva `20260917130000_add_estorno_pagamento`.
  - O valor pago, o saldo e o status financeiro da OS desconsideram pagamentos estornados (detalhe, listagem, relatório financeiro, validação de pagamento acima do saldo). Com estorno, a coluna `valorPago` legada não prevalece; sem estorno, a regra atual continua idêntica.
  - O bloqueio de cancelamento (#229) passa a contar só pagamentos não estornados.
  - Ainda sem API nem tela de estorno (fatias 2 a 4).
- **Detecção de migrations pendentes (#224)**: `GET /api/saude/migrations` compara as migrations do código (lista embutida no build pelo `next.config.mjs`, sem acesso ao banco) com `_prisma_migrations`, só em leitura. Responde `200 {ok:true}` ou `503` com a contagem; os nomes só aparecem com sessão válida. Rota pública para o smoke test pós-promoção.
  - `pnpm run dev` mostra um aviso destacado com as migrations pendentes do banco local, sem aplicar nada e sem impedir o servidor de subir.
  - Documentado em `DECISOES.md`, README e `FATIA_PRODUCAO_04_VERCEL_NEON.md` (promoção manual só para deploys sem migration nova).
- **Dashboard: nova estrutura visual (PR 1 da refatoração)**: cabeçalho plano com saudação por horário, primeiro nome do usuário da sessão e data por extenso (fuso operacional); ações "Venda de balcão" e "Nova ordem de serviço" no cabeçalho.
  - Presets de período (Hoje, 7 dias, Este mês, Mês anterior) com `aria-pressed`; edição manual das datas marca "Personalizado" e só consulta ao clicar em Filtrar. Uma única chamada à API por aplicação de período.
  - Grade de quatro KPIs (`DashboardKpiCard`): Total recebido em destaque, Total pendente com a quantidade real de OS com saldo, Ticket médio e "OS ativas no período" (soma dos quatro status operacionais; canceladas não incluídas).
  - View model puro (`dashboard-view-model.ts`) com totais, percentuais protegidos contra divisão por zero e rankings normalizados, coberto por testes; sem alteração no endpoint `/api/dashboard` nem nas regras financeiras.
  - Durante uma nova filtragem, as métricas anteriores permanecem visíveis (estado de atualização discreto) e a falha mostra "Tentar novamente" sem desmontar o dashboard.
  - `AppShell` ganha o slot opcional `header` (cabeçalho plano) sem alterar as demais telas; `DateRangePicker` ganha `hidePresets` e `variant="inline"` (padrões preservados).
  - Fonte Manrope (via `next/font`) e tokens semânticos adicionais em `globals.css`; respeito a `prefers-reduced-motion`.
- **Dashboard: componentes analíticos (PR 2 da refatoração)**: os sete cards operacionais isolados dão lugar a blocos compostos, alimentados pelo mesmo contrato de `/api/dashboard`.
  - `DashboardFilaOrdens`: barra segmentada proporcional + mini cards de Abertas, Em andamento, Concluídas e Entregues (links filtrados preservados), "Ver todas" e "Ver OS atrasadas" no rodapé (sem contagem, pois o contrato não a fornece).
  - `DashboardSituacaoFinanceira`: donut em SVG (sem biblioteca) com percentual de pagas no centro, legenda em texto com links para Pagas/Parciais/Sem pagamento, saldo em aberto e link para o relatório financeiro; resumo textual acessível no gráfico.
  - Serviços mais executados com barras proporcionais (maior = 100%); Insumos mais utilizados em ranking com posição, nome com unidade, quantidade formatada e link para o relatório de estoque (sem badges de estoque, que o contrato não traz).
  - Card "Ações rápidas" removido: "Nova OS" e "Venda de balcão" já estão no cabeçalho; "Ver estoque baixo" passou para o alerta de estoque; relatórios ficam nos cards correspondentes. Removidos `DashboardQuickActions`, `DashboardCardsOperacionais` e `TopList`.
  - Testes de renderização dos quatro blocos (links, resumo acessível, proporção das barras e estados vazios).
- **Dashboard: alertas compactos, skeletons e acessibilidade (PR 3 da refatoração)**.
  - `DashboardAlertCard`: linha de alertas de caixa e estoque com mesma altura, ícone SVG em caixa de 36px (sem emojis), título, descrição e link contextual; no mobile, empilhados com o link abaixo da descrição. Mesmos endpoints e textos de antes.
  - Alerta de estoque passa a ter estados próprios (carregando, erro, sem alertas críticos, com alertas) usando apenas as contagens reais; tom de erro quando há insumo zerado e de atenção quando só há abaixo do mínimo.
  - Skeletons dos blocos analíticos com a mesma moldura do conteúdo final na primeira carga; falhas dos alertas não bloqueiam as métricas.
  - Testes do alerta de estoque (contagens, plural, estados e ausência de emoji).
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
