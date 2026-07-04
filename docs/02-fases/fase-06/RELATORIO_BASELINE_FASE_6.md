# RELATORIO BASELINE FASE 6

Data: 03/07/2026
Projeto: UPA do Tenis - Sapataria Alves
Escopo desta etapa: Preparacao tecnica do baseline para inicio do financeiro da OS, sem implementar funcionalidades novas.

## 1. Validacao tecnica executada

### 1.1 Prisma validate
- Comando executado: npx prisma validate
- Resultado: schema valido.

### 1.2 Prisma migrate status
- Comando executado: npx prisma migrate status
- Resultado: falha com erro P3015.
- Detalhe: migration file ausente em prisma/migrations/20260703135713_add_origem_historico_status/migration.sql.

### 1.3 Prisma generate
- Comando executado: npx prisma generate
- Resultado: Prisma Client gerado com sucesso.

### 1.4 Build da aplicacao
- Comando executado: npm run build
- Resultado: build concluido com sucesso, sem erro de compilacao.

## 2. Integridade de migrations e drift

### 2.1 Estado confirmado
- Pasta de migration vazia detectada: prisma/migrations/20260703135713_add_origem_historico_status.
- Arquivo migration.sql inexistente nessa pasta.
- Esse estado impede verificacao completa de historico via prisma migrate status.

### 2.2 Risco
- Risco alto de inconsistencias entre ambientes (drift de historico de migration).
- Nao deve ser criada nova migration antes de corrigir o historico quebrado.

### 2.3 Acao recomendada antes do Marco 1
1. Restaurar o arquivo migration.sql faltante a partir do historico de origem.
2. Se nao houver recuperacao possivel, remover formalmente a pasta invalida com procedimento controlado e alinhado com o estado real do banco.
3. Reexecutar npx prisma migrate status e registrar saida limpa.

## 3. Comparacao da modelagem desejada da Fase 6 com models atuais

Models avaliados:
- OrdemServico
- ItemOrdemServico
- Servico
- ServicoItemOrdem
- FormaPagamento
- Pagamento
- HistoricoStatus
- Insumo

### 3.1 Cobertura ja existente
- OrdemServico ja possui campos financeiros consolidados: valorTotal, valorDesconto, valorSinal, valorPago, saldo.
- Servico e ServicoItemOrdem ja cobrem catalogo e vinculo de servicos executados por item da OS.
- FormaPagamento e Pagamento ja cobrem lancamentos por OS com forma de pagamento referenciada.
- HistoricoStatus ja cobre auditoria do ciclo operacional da OS.
- Insumo ja existe como catalogo/cadastro.

### 3.2 Lacunas reais frente ao escopo da Fase 6
- Nao existe vinculo de insumo com OS nem com ItemOrdemServico.
- Nao existe indicador financeiro derivado e centralizado de status de pagamento (exemplo: PENDENTE, PARCIAL, PAGO) no dominio da OS.
- Nao existe endpoint de detalhe da OS por ID com consolidacao financeira.
- Nao existe endpoint dedicado para pagamentos por OS.

### 3.3 Delta minimo recomendado de schema (proposta, sem aplicar agora)
Manter reaproveitamento maximo dos models atuais e adicionar somente o essencial:
1. Adicionar campo opcional de status financeiro em OrdemServico.
- Sugestao: statusFinanceiro String? com default coerente apos migracao (ou enum em etapa posterior se desejado).
- Justificativa: habilitar filtros financeiros de listagem sem recalculo client-side.

2. Criar entidade de consumo de insumo vinculado ao item da OS.
- Sugestao de nome: InsumoItemOrdem.
- Campos minimos: id, itemOrdemServicoId, insumoId, quantidade, custoUnitarioAplicado, custoTotalAplicado, criadoEm.
- Justificativa: vinculo operacional de insumo utilizado no servico executado, sem implementar estoque completo.

Observacao: nenhum outro model novo e necessario para iniciar o nucleo financeiro.

## 4. Confirmacoes obrigatorias de endpoint/tela/regra

### 4.1 Existe endpoint de detalhe da OS por ID?
- Nao.
- Hoje existem apenas:
  - POST /api/ordens-servico
  - PATCH /api/ordens-servico/[id]/status

### 4.2 Existe tela /ordens-servico/[id]?
- Nao.
- Existe somente pagina de listagem e cadastro em /ordens-servico.

### 4.3 Existe endpoint de pagamentos por OS?
- Nao.
- Ha model Pagamento, mas nao ha rota de API para listar/criar pagamentos por ordem.

### 4.4 Existe vinculo de insumo com OS ou item da OS?
- Nao.
- Insumo esta isolado no catalogo.

### 4.5 Existe calculo centralizado de valor total, valor pago e saldo?
- Nao.
- Nao ha modulo dedicado de regras financeiras centralizadas no dominio da OS.

## 5. Uso de new PrismaClient fora de src/lib/prisma.ts

Arquivos encontrados:
- src/app/api/formas-pagamento/route.ts
- src/app/api/insumos/route.ts
- src/app/api/ordens-servico/[id]/status/route.ts
- src/app/api/ordens-servico/route.ts
- src/app/api/servicos/route.ts
- src/lib/formas-pagamento.ts
- src/lib/insumos.ts
- src/lib/ordens-servico.ts
- src/lib/servicos.ts

## 6. Plano de correcao para padronizar Prisma singleton (sem mudar regra de negocio)

Objetivo: usar somente o singleton de src/lib/prisma.ts em todo acesso a banco.

Passos propostos:
1. Substituir import de PrismaClient por import do prisma singleton nos arquivos listados.
2. Remover instanciacoes locais const prisma = new PrismaClient().
3. Manter assinaturas, payloads e regras de negocio inalteradas.
4. Validar regressao com:
- npx prisma validate
- npx prisma generate
- npm run build

Impacto esperado:
- Reducao de risco de conexoes duplicadas em dev/hot reload.
- Nenhuma alteracao funcional no fluxo homologado.

## 7. Models a reaproveitar no Marco 1

Reaproveitamento direto:
- OrdemServico
- ItemOrdemServico
- Servico
- ServicoItemOrdem
- FormaPagamento
- Pagamento
- HistoricoStatus
- Insumo

Sem reescrita de MVP e sem quebra de compatibilidade com OS antigas.

## 8. Migrations necessarias (quando aprovadas)

Neste momento: nenhuma migration nova deve ser criada.

Quando houver validacao para avancar:
1. Migration de saneamento do historico quebrado de migrations (se necessario, conforme estrategia definida).
2. Migration funcional minima da Fase 6 contendo:
- campo de status financeiro em OrdemServico (se aprovado)
- tabela de vinculo de insumo por item da OS

## 9. Arquivos provaveis a alterar no inicio do Marco 1

Padronizacao Prisma singleton:
- src/app/api/formas-pagamento/route.ts
- src/app/api/insumos/route.ts
- src/app/api/ordens-servico/[id]/status/route.ts
- src/app/api/ordens-servico/route.ts
- src/app/api/servicos/route.ts
- src/lib/formas-pagamento.ts
- src/lib/insumos.ts
- src/lib/ordens-servico.ts
- src/lib/servicos.ts

Nucleo financeiro centralizado (sem UI nova no primeiro passo):
- src/lib/ordens-servico.ts
- src/lib/ordens-servico-schema.ts
- possivel novo arquivo de regras financeiras em src/lib

## 10. Recomendacao para o Marco 1

Executar Marco 1 em duas ondas, com checkpoint de validacao entre elas:

Onda A (tecnica, baixo risco)
1. Corrigir pendencia de migration ausente para zerar risco de drift.
2. Padronizar Prisma singleton em toda a base.
3. Revalidar baseline com prisma validate, prisma migrate status, prisma generate e build.

Onda B (dominio, ainda sem UI nova)
1. Introduzir modulo central de calculo financeiro da OS (total, pago, saldo, status financeiro) sem alterar fluxo de status operacional.
2. Integrar calculo no backend de OS e pagamentos mantendo compatibilidade com dados existentes.
3. Nao tocar em telas nem em regras ja homologadas ate validacao.

Conclusao:
- O baseline tecnico esta parcialmente saudavel (schema valido, client gerado e build ok), mas bloqueado por integridade de migration (erro P3015).
- A modelagem atual cobre grande parte do escopo da Fase 6.
- O delta minimo recomendado e: vinculo de insumo por item de OS e status financeiro consolidado na OS, com regras centralizadas no backend.
- Recomendado aprovar e executar primeiro a preparacao tecnica (migrations + singleton) antes de qualquer funcionalidade financeira.
