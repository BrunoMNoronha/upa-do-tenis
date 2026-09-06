# Walkthrough: Fase 10 — Controle de Caixa Operacional

Este documento formaliza a entrega do módulo de Controle de Caixa Operacional para o sistema UPA do Tênis - Sapataria Alves.

## 1. Resumo da Implementação
O módulo introduz o controle diário financeiro de frente de caixa. Os operadores agora conseguem registrar a abertura do turno com um saldo físico inicial. Todos os pagamentos recebidos pelas Ordens de Serviço (OS) geram automaticamente transações vinculadas a este caixa. Ao fim do expediente, é feito o fechamento conferindo a divergência entre o sistema e a gaveta.

## 2. Modelos Criados/Alterados
No `schema.prisma`, foram criados dois novos modelos e feitos ajustes em modelos existentes:
- **`Caixa` (NOVO)**: Registra a abertura e fechamento de turno, guardando saldo inicial, final informado, calculado, divergência e status.
- **`MovimentacaoCaixa` (NOVO)**: Registra toda entrada, saída, sangria ou reforço do caixa. Relaciona-se com Pagamento de OS, Forma de Pagamento e a entidade Caixa.
- **`OrdemServico`**: Alterado para suportar `movimentacoesCaixa`.
- **`FormaPagamento`**: Alterado para suportar `movimentacoesCaixa`.
- **`Pagamento`**: Adicionada relação 1:1 com `movimentacaoCaixa`.

## 3. Migration Criada
Foi gerada a migration `20260703212520_init_caixa` contendo a criação das tabelas e chaves estrangeiras necessárias, aplicada com sucesso via Prisma.

## 4. APIs Criadas/Alteradas
- `GET /api/caixa`: Listagem paginada para o histórico.
- `POST /api/caixa`: Abertura de caixa.
- `GET /api/caixa/atual`: Retorna o caixa aberto no momento.
- `GET /api/caixa/[id]`: Retorna detalhes (somente leitura) de um caixa fechado.
- `POST /api/caixa/[id]/fechar`: Conclui o caixa gravando a divergência com o valor físico real.
- `POST /api/caixa/[id]/movimentacoes`: Adiciona movimentações manuais avulsas (Ex: Sangrias ou lanches).
- **Alteração (`POST /api/ordens-servico/[id]/pagamentos`)**: Agora valida a existência de um caixa `ABERTO`. Lança erro 400 se não encontrar. Caso encontre, grava a OS e cria uma `MovimentacaoCaixa` automaticamente usando Transaction.

## 5. Services Criados/Alterados
- `src/lib/caixa.ts`: Contém toda a regra de negócios (`obterCaixaAberto`, `abrirCaixa`, `fecharCaixa`, `calcularTotaisCaixa`, `registrarMovimentacaoAutomaticaCaixa`).
- `src/lib/ordens-servico-pagamentos.ts`: Ajustado para invocar a movimentação automática em caso de OS.

## 6. Telas Criadas/Alteradas
- **Dashboard (`/caixa`)**: Controla abertura, visualização do dia, inserção de movimentos manuais e fechamento.
- **Histórico (`/caixa/historico`)**: Lista caixas anteriores com suas devidas divergências.
- **Detalhes (`/caixa/[id]`)**: Visão estática de como ocorreu o fechamento no passado.
- **Menu Lateral (`app-shell.tsx`)**: Inserido o atalho para `/caixa`.
- **Tela de OS (`ordem-servico-detalhe-client.tsx`)**: Adicionado o tratamento para o erro "Caixa fechado", oferecendo ao usuário um botão atalho para `/caixa`.

## 7. Integração com Pagamentos de OS
Pagamentos realizados na OS geram registro automático no caixa sob a rubrica `ENTRADA` e origem `PAGAMENTO_OS`.
O sistema **bloqueia** qualquer recebimento na OS se não houver um caixa aberto, garantindo integridade.

## 8. Regras de Cálculo do Saldo Físico
O saldo físico (dinheiro vivo na gaveta) é calculado considerando apenas movimentações que **não** informem uma forma de pagamento explícita ou cuja forma contenha `DINHEIRO` no nome.
- **Fórmula**: `Saldo Inicial + Entradas Físicas - Saídas Físicas - Sangrias + Reforços`.

## 9. Regras de Totalização por Forma de Pagamento
Todos os recebimentos, independentemente de serem dinheiro ou não (Ex: PIX, Cartão), são contabilizados em um dicionário. Na visualização, exibe-se um agrupamento de "Total Recebido no Dia" (ex: "PIX: R$ 200, Cartão: R$ 150"). Isso não interfere no "Saldo Físico".

## 10. Testes Executados e Resultados
Testes no `src/lib/caixa.test.ts` cobrem os comportamentos chaves, rodados com `vitest`.
- Deve abrir um caixa se não houver nenhum aberto.
- Deve bloquear se já existir caixa aberto.
- Deve registrar movimentação se caixa estiver aberto.
- Deve bloquear movimentação se caixa estiver fechado.
- Deve retornar o caixa e calcular os totais físicos com precisão (considerando exclusão do PIX da conta física).
- Deve fechar o caixa e calcular a divergência exata.
**Resultado:** Passed (6 de 6).

## 11. Resultado do Lint
Não houve quebras de lint (passou sem erros na validação `pnpm run lint`).

## 12. Resultado do Build
O build de produção (`pnpm run build`) ocorreu normalmente, incluindo a compilação do Next.js sem causar "Dynamic server usage" erros (a rota `/api/caixa/atual` foi fixada com `export const dynamic = "force-dynamic"`).

## 13. Riscos ou Observações Técnicas
Nenhuma alteração foi feita nos cálculos base da Ordem de Serviço (`ordens-servico-financeiro.ts`). Logo, os dashboards globais continuam precisos. A principal mudança sentida pelo usuário será a proibição de receber pagamento em OS antes da rotina de abertura diária da loja.

## 14. Roteiro de Homologação Manual
1. Abra uma nova aba anônima e acesse uma Ordem de Serviço qualquer. Tente registrar um pagamento. Você deve ser bloqueado com um aviso e o botão "Abrir o Caixa".
2. Clique no botão, vá para a tela de Caixa.
3. Digite "50,00" (fundo de gaveta) e clique em Abrir Caixa.
4. Você verá o painel verde indicando "Caixa Aberto".
5. Volte à aba da OS e registre o pagamento (Ex: R$ 100 PIX). A transação ocorrerá.
6. Volte ao Caixa e atualize a página: o painel mostrará "Total Recebido: PIX R$ 100", mas seu Saldo Físico continuará R$ 50,00.
7. Registre uma Sangria de R$ 10. Seu Saldo Físico cairá para R$ 40,00.
8. Realize o Fechamento informando que você tem R$ 45 na gaveta. O sistema deve fechar e registrar divergência de `+ R$ 5,00` verde (sobrou).
9. Verifique no Histórico se a linha reflete o encerramento do dia.
