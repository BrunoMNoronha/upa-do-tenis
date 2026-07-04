# Relatorio Marco 6 - Insumos Utilizados por Item da OS (Fase 6)

## Arquivos Criados

- RELATORIO_MARCO_6_INSUMOS_ITEM_OS_FASE_6.md
- src/lib/ordens-servico-insumos-schema.ts
- src/lib/ordens-servico-insumos.ts
- src/lib/ordens-servico-insumos.test.ts
- src/app/api/ordens-servico/[id]/insumos/route.ts
- prisma/migrations/20260703173847_add_insumos_item_ordem/migration.sql

## Arquivos Alterados

- prisma/schema.prisma
- src/lib/ordens-servico.ts
- src/app/ordens-servico/[id]/page.tsx
- src/app/ordens-servico/[id]/ordem-servico-detalhe-client.tsx

## Migration Criada

- pasta: prisma/migrations/20260703173847_add_insumos_item_ordem
- arquivo: migration.sql
- delta aplicado:
  - criacao da tabela InsumoItemOrdem;
  - indices por itemOrdemServicoId e insumoId;
  - FKs para ItemOrdemServico (CASCADE) e Insumo (RESTRICT).

## Models Alterados

Em prisma/schema.prisma:

- ItemOrdemServico:
  - novo relacionamento `insumos: InsumoItemOrdem[]`.

- Insumo:
  - novo relacionamento `itensOrdem: InsumoItemOrdem[]`.

- Novo model `InsumoItemOrdem` com campos:
  - id
  - itemOrdemServicoId
  - insumoId
  - quantidade
  - custoUnitarioAplicado
  - custoTotalAplicado
  - observacoes
  - criadoEm
  - atualizadoEm

## Endpoints Criados

- GET /api/ordens-servico/[id]/insumos
  - valida id da OS;
  - valida existencia da OS;
  - retorna insumos aplicados na OS (com item e insumo relacionados).

- POST /api/ordens-servico/[id]/insumos
  - valida id da OS;
  - valida payload com Zod;
  - valida OS existente;
  - valida item da OS existente e pertencente a OS;
  - valida insumo existente;
  - valida quantidade > 0;
  - valida custo unitario >= 0;
  - calcula custoTotalAplicado = quantidade * custoUnitarioAplicado;
  - registra vinculo sem alterar dados financeiros da OS.

## Regras Implementadas

- Insumo tratado como custo operacional interno.
- Registro de insumo NAO altera:
  - valorTotal da OS;
  - valorPago;
  - saldo financeiro.
- custo de insumos exibido separadamente por item na tela de detalhe.
- sem baixa de estoque nesta etapa.
- sem dashboard financeiro.
- sem estorno/conciliação de pagamentos neste marco.

## Comportamento da Tela (/ordens-servico/[id])

Atualizacoes implementadas:

1. Exibicao de insumos por item:
- cada item passa a mostrar secao "Insumos utilizados";
- para cada insumo aplicado, exibe:
  - nome do insumo;
  - quantidade;
  - custo unitario aplicado;
  - custo total aplicado;
  - observacoes (quando houver).

2. Formulario de registro de insumo (implementado):
- permite selecionar item da OS;
- selecionar insumo;
- informar quantidade;
- informar custo unitario aplicado;
- observacoes opcionais.

3. Integracao da tela:
- envia registro via POST /api/ordens-servico/[id]/insumos;
- apos sucesso, recarrega GET /api/ordens-servico/[id] (modo silencioso);
- limpa formulario e mostra mensagem de sucesso;
- em erro, exibe mensagem amigavel e preserva dados digitados.

## Atualizacao do GET /api/ordens-servico/[id]

- o detalhe consolidado da OS foi atualizado para incluir `itens.insumos` com dados do insumo relacionado.
- o resumo financeiro continua calculado exclusivamente por calcularResumoFinanceiroOS.

## Testes Criados ou Alterados

Criado:
- src/lib/ordens-servico-insumos.test.ts

Cenarios cobertos:
- registro de insumo valido;
- OS inexistente;
- item inexistente;
- insumo inexistente;
- quantidade invalida;
- custo total calculado corretamente;
- valorTotal/valorPago/saldo da OS nao alterados pelo insumo.

## Resultado dos Comandos Executados

1. npx prisma validate
- schema valido.

2. npx prisma migrate status
- 3 migrations encontradas;
- banco sincronizado (schema up to date).

3. npx prisma generate
- Prisma Client gerado com sucesso.

4. npm run test
- Test Files: 4 passed (4)
- Tests: 34 passed (34)
- Status: SUCESSO

5. npm run build
- build concluido com sucesso;
- rota /api/ordens-servico/[id]/insumos presente no output;
- tela /ordens-servico/[id] compilada com sucesso.

## Riscos Restantes

- ainda nao ha baixa de estoque (intencional nesta etapa).
- formulario de insumos na tela ainda sem testes de interface automatizados.
- ausencia de consolidado analitico de custo operacional por OS/periodo (fora do escopo atual).

## Recomendacao para o Proximo Marco

1. Implementar visão consolidada de custo operacional da OS (sem misturar com financeiro de cobrança).
2. Introduzir teste de integração HTTP para /api/ordens-servico/[id]/insumos (GET/POST).
3. Evoluir para baixa de estoque controlada por evento de aplicação de insumo, com trilha de auditoria.
