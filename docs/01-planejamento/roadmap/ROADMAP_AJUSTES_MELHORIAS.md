# Documento Técnico - Roadmap de Ajustes e Melhorias

**Projeto:** UPA do Tênis - Sapataria Alves  
**Versão:** v1.0  
**Data:** 04/07/2026  
**Status:** planejamento técnico recomendado para estabilização do MVP

## 1. Objetivo

Consolidar os ajustes, correções e melhorias recomendadas para o MVP do sistema UPA do Tênis - Sapataria Alves, priorizando estabilidade operacional, integridade financeira, consistência de estoque/insumos, homologação funcional e avanço seguro por fases.

## 2. Diagnóstico executivo

O sistema já possui uma base funcional relevante, mas deve priorizar estabilização antes de adicionar novas funcionalidades. A área mais sensível no momento é o Controle de Caixa, por envolver dinheiro, saldo, pagamentos, fechamento e relatórios financeiros.

O próximo passo recomendado não é ampliar escopo: é validar, corrigir bloqueadores e documentar evidências. Principalmente após a inclusão do Controle de Caixa, qualquer avanço deve passar por homologação dirigida.

## 3. Classificação de prioridade

| Prioridade | Definição | Conduta |
|---|---|---|
| P0 - Bloqueador | Impede uso, homologação ou compromete dados críticos. | Corrigir antes de qualquer nova fase. |
| P1 - Crítico | Afeta dinheiro, caixa, estoque, pagamentos, saldo, entrega ou relatórios financeiros. | Implementar com testes e homologação dirigida. |
| P2 - Importante | Melhora operação, rastreabilidade, produtividade e confiabilidade. | Planejar após estabilização dos P0/P1. |
| P3 - Evolutivo | Aprimora experiência, automação, relatórios avançados ou gestão. | Executar apenas com MVP estável. |

## 4. Backlog priorizado de ajustes e melhorias

| ID | Pri. | Ajuste/Melhoria | Objetivo | Área | Risco principal |
|---|---|---|---|---|---|
| A01 | P0 | Homologação formal da Fase 10 - Controle de Caixa | Concluir roteiro de homologação, registrar evidências e aprovar ou reprovar a fase. | Controle de Caixa, Financeiro, OS | Fase não pode ser considerada concluída sem evidência funcional. |
| A02 | P0 | Correção de loops de validação em formulários obrigatórios | Revisar validações que indicam campos como obrigatórios mesmo preenchidos. | Clientes, OS, Serviços, Entidades cadastrais | Risco de travar operação e impedir cadastros. |
| A03 | P0 | Build, lint e testes obrigatórios como gate de fase | Padronizar execução e registro de pnpm run lint, testes críticos e pnpm run build antes de fechar fase. | Projeto inteiro | Sem gate técnico, aumenta risco de regressão silenciosa. |
| A04 | P1 | Auditoria de integridade do caixa | Validar abertura, fechamento, saldo inicial, entradas, saídas, sangria, reforço e divergência. | Controle de Caixa | Área crítica: dinheiro e rastreabilidade financeira. |
| A05 | P1 | Conciliação entre pagamentos de OS e caixa | Garantir que pagamentos registrados reflitam corretamente no caixa quando aplicável. | OS, Pagamentos, Caixa, Financeiro | Risco de saldo incorreto e relatório financeiro inconsistente. |
| A06 | P1 | Bloqueios operacionais em caixa fechado | Definir e validar se pagamentos, sangrias e reforços podem ocorrer sem caixa aberto. | Caixa, Pagamentos | Risco de movimentação financeira sem sessão de caixa. |
| A07 | P1 | Estorno e cancelamento financeiro | Definir comportamento para pagamento estornado, OS cancelada e impacto no caixa. | OS, Pagamentos, Caixa | Risco de receita duplicada ou saldo inflado. |
| A08 | P1 | Auditoria de estoque e insumos por OS | Validar baixa de insumos, reversão quando necessário e alertas de estoque mínimo. | Estoque, Insumos, OS | Risco de estoque negativo ou custo operacional errado. |
| A09 | P1 | Relatórios financeiros consolidados | Revisar filtros, totais, período, status, formas de pagamento e consistência com OS/caixa. | Relatórios, Financeiro, Caixa | Risco de tomada de decisão com números incorretos. |
| A10 | P2 | Padronização de estados de tela | Garantir loading, erro e estado vazio em todas as telas operacionais. | Frontend | Melhora usabilidade e reduz ambiguidade para o usuário final. |
| A11 | P2 | Melhoria de filtros e busca operacional | Aprimorar filtros por status, cliente, período, vencimento e pagamento. | OS, Clientes, Relatórios | Ganho operacional sem mexer em regra crítica. |
| A12 | P2 | Rastreabilidade de histórico da OS | Ampliar consistência do histórico com usuário, data, ação e origem. | OS, Histórico | Ajuda auditoria e atendimento ao cliente. |
| A13 | P2 | Padronização de mensagens de erro | Criar mensagens claras para validação, conflito, falha de rede e erro de servidor. | Frontend, APIs | Reduz suporte e melhora homologação. |
| A14 | P2 | Documentação técnica por fase | Atualizar documentação de arquitetura, regras, APIs, testes e homologação. | Documentação | Sem documentação, a manutenção fica arriscada. |
| A15 | P3 | Dashboard gerencial evolutivo | Adicionar indicadores úteis sem recalcular regras críticas no frontend. | Dashboard, Relatórios | Só após validar relatórios oficiais. |
| A16 | P3 | Permissões e perfis de usuário | Separar funções como administrador, operador, financeiro e consulta. | Autenticação, Autorização | Importante para produção, mas exige cuidado arquitetural. |
| A17 | P3 | Backup, exportação e rotina operacional | Planejar exportações, backups e rotina de recuperação. | Infraestrutura, Dados | Necessário antes de uso real intensivo. |

## 5. Roadmap recomendado

| Etapa | Nome | Itens | Objetivo | Critério de conclusão |
|---|---|---|---|---|
| Marco 0 | Saneamento e homologação pendente | A01, A02, A03 | Concluir validação atual antes de evoluir. | Fase 10 homologada, bugs bloqueadores corrigidos e build/testes registrados. |
| Fase 11 | Estabilização do Controle de Caixa | A04, A05, A06, A07 | Proteger área crítica de dinheiro. | Caixa confiável, regras documentadas, cenários críticos testados e homologados. |
| Fase 12 | Consolidação Financeira e Relatórios | A09, A13, A14 | Garantir leitura gerencial consistente. | Relatórios batendo com OS, pagamentos e caixa em cenários de teste. |
| Fase 13 | Estoque e Insumos Avançados | A08, A12 | Evitar inconsistências de insumos, custos e baixas. | Movimentações rastreáveis, alertas validados e regressões cobertas. |
| Fase 14 | Usabilidade Operacional | A10, A11, A13 | Aumentar produtividade da operação sem alterar regra crítica. | Telas com estados padronizados, filtros úteis e mensagens claras. |
| Fase 15 | Preparação para Produção | A16, A17 | Fortalecer segurança, permissões, backup e operação real. | Perfis definidos, dados protegidos e rotina mínima de recuperação documentada. |

## 6. Critérios gerais de aceite

- Nenhuma fase deve ser fechada apenas por implementação de código.
- Toda alteração em dinheiro, pagamentos, caixa, saldo, estoque ou insumos deve ter teste automatizado e homologação manual.
- pnpm run lint, testes críticos e pnpm run build devem ser executados e registrados antes de recomendar commit.
- Não alterar schema do banco sem justificativa, impacto mapeado e plano de migração.
- Não misturar melhoria visual com regra financeira, caixa ou estoque.
- Toda fase deve gerar relatório técnico e relatório de homologação com evidências.

## 7. Testes recomendados

| Grupo | Validação |
|---|---|
| Validação de formulários | Campos preenchidos não podem disparar erro obrigatório. Deve haver teste para criação e edição. |
| Pagamentos parciais e totais | Validar saldo, status financeiro e bloqueios de entrega quando aplicável. |
| Caixa aberto e fechado | Validar entradas, saídas, sangria, reforço, fechamento e bloqueios. |
| Conciliação OS x Caixa | Pagamento de OS deve refletir corretamente no caixa ou registrar regra explícita de exclusão. |
| Estoque/insumos | Validar baixa, movimentação, estoque mínimo e tentativa de uso sem saldo suficiente. |
| Relatórios | Conferir totais por período, status, forma de pagamento e consistência com dados origem. |
| Regressão geral | Executar fluxos de cliente, OS, pagamento, caixa, estoque, dashboard e relatórios. |

## 8. Roteiro de homologação

- Preparar massa de teste: clientes, serviços, insumos, OS abertas, OS concluídas, pagamentos e caixa.
- Executar roteiro por perfil operacional: atendimento, financeiro e gestão.
- Registrar evidências com prints, dados usados, resultado esperado e resultado obtido.
- Classificar divergências como bloqueadora, crítica, importante ou melhoria futura.
- Reexecutar testes e build após cada correção relevante.
- Gerar relatório final de homologação antes de recomendar commit ou nova fase.

## 9. Prompt pronto para execução

```text
Contexto:
Você está trabalhando no sistema UPA do Tênis - Sapataria Alves. O MVP já possui módulos de clientes, ordens de serviço, serviços, financeiro, estoque/insumos, dashboard, relatórios e controle de caixa em evolução. O objetivo agora é estabilizar o MVP antes de avançar para novas funcionalidades.

Objetivo:
Executar o roadmap priorizado de ajustes e melhorias, começando por P0 e P1, sem quebrar regras já homologadas e sem alterar schema do banco salvo justificativa técnica explícita.

Restrições:
- Não avançar para nova fase sem homologar a fase atual.
- Tratar dinheiro, pagamentos, saldo, caixa, estoque, insumos e relatórios financeiros como áreas críticas.
- Não misturar melhoria visual com regra crítica.
- Validar dados no frontend e no backend.
- Evitar refatorações amplas sem necessidade comprovada.
- Executar lint, testes e build antes de concluir.

Tarefas iniciais:
1. Revisar o estado atual do repositório com git status e git diff --stat.
2. Validar a Fase 10 - Controle de Caixa com roteiro funcional.
3. Corrigir eventuais loops de validação de campos obrigatórios preenchidos.
4. Auditar regras de abertura, movimentação e fechamento de caixa.
5. Validar conciliação entre pagamentos de OS, financeiro e caixa.
6. Revisar impactos em estoque e insumos quando houver OS concluída, cancelada ou alterada.
7. Atualizar documentação técnica e relatório de homologação.

Critérios de aceite:
- Nenhum formulário deve marcar como obrigatório um campo corretamente preenchido.
- Operações financeiras devem manter saldo, status e relatórios consistentes.
- Movimentações de caixa devem ser rastreáveis e não podem ocorrer fora das regras definidas.
- Relatórios devem bater com os dados de origem usados nos testes.
- A fase só pode ser considerada concluída com testes, build e homologação documentados.

Comandos de validação:
- pnpm run lint
- pnpm run build
- pnpm exec vitest run
- Executar manualmente os fluxos críticos no navegador

Entrega esperada:
- Lista dos arquivos alterados.
- Resumo técnico das correções.
- Evidências dos testes executados.
- Relatório de homologação atualizado.
- Recomendação clara: aprovado para commit, precisa corrigir, ou não avançar de fase.
```

## 10. Veredito técnico

O projeto deve avançar primeiro pelo Marco 0: saneamento, correção de bloqueadores e homologação formal da Fase 10. Depois disso, a sequência recomendada é estabilizar Controle de Caixa, consolidar relatórios financeiros, validar estoque/insumos e só então investir em produtividade, permissões e preparação para produção.
