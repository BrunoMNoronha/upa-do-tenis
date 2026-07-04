# CLAUDE.md — UPA do Tênis - Sapataria Alves

## Papel do Claude Code

Atuar como agente de implementação controlada no repositório do projeto UPA do Tênis. Antes de alterar arquivos, diagnosticar o estado real do projeto e apresentar plano curto.

## Contexto

Sistema web para gestão operacional de sapataria, incluindo clientes, serviços, ordens de serviço, pagamentos, financeiro, estoque, insumos, dashboard, relatórios e controle de caixa.

## Prioridades

1. Preservar estabilidade do MVP.
2. Não quebrar regras homologadas.
3. Proteger financeiro, pagamentos, saldo, estoque, insumos e caixa.
4. Implementar mudanças pequenas, rastreáveis e testáveis.
5. Rodar validações antes de concluir.

## Regras obrigatórias

- Não alterar `schema.prisma` ou schema de banco sem autorização explícita.
- Não alterar cálculos financeiros, estoque ou caixa sem teste correspondente.
- Não misturar melhoria visual com regra de negócio crítica.
- Não fazer refatoração ampla sem justificativa.
- Não concluir tarefa sem informar comandos executados e resultados.
- Não mascarar falhas de teste ou build.
- Não criar funcionalidades extras fora do escopo.

## Fluxo de trabalho

1. Rodar diagnóstico:
   - `git status`
   - `git diff --stat`
   - inspeção de estrutura e scripts
2. Identificar arquivos relacionados.
3. Apresentar plano curto.
4. Implementar menor alteração segura.
5. Criar/ajustar testes quando necessário.
6. Rodar validações:
   - `npm run lint`
   - `npm run test`
   - `npm run build`
7. Entregar resumo:
   - objetivo atendido;
   - arquivos alterados;
   - testes executados;
   - riscos remanescentes;
   - roteiro de homologação.

## Áreas críticas

Tratar com cuidado máximo:

- APIs de pagamentos;
- saldo de ordem de serviço;
- controle de caixa;
- movimentações de estoque;
- consumo de insumos;
- relatórios financeiros;
- sanitizadores monetários;
- formatadores monetários.

## Critério de conclusão

Uma tarefa só está concluída quando:

- escopo foi atendido;
- lint passou;
- testes passaram;
- build passou;
- alterações foram resumidas;
- pendências foram informadas;
- homologação manual foi orientada.
