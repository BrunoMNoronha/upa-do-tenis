# Homologacao MVP v1 - Resumo Executivo (1 pagina)

## Data
- 03/07/2026

## Objetivo
Validar funcionalmente o MVP v1 da UPA do Tenis (Sapataria Alves) em ambiente local, seguindo o roteiro de homologacao/UAT, registrando evidencias, riscos e recomendacoes para aceite inicial.

## Ambiente
- Windows + VS Code
- Next.js em modo desenvolvimento (`npm run dev`)
- URLs verificadas: http://localhost:3000 e http://localhost:3001 (porta 3000 estava em uso ao subir uma instancia)
- Banco: SQLite via Prisma

## Escopo testado (MVP v1)
- Telas: Inicio, Clientes, Ordens de Servico, Servicos, Insumos, Formas de Pagamento
- Fluxos: cadastros basicos + ciclo completo de OS (ABERTA -> EM_ANDAMENTO -> CONCLUIDA -> ENTREGUE) + historico

## Resultado geral
- Status: **APROVADO COM RESSALVAS**
- Bloqueadores: **nenhum**

## O que passou (evidencias)
- Sistema abriu localmente e as telas principais carregaram sem erro bloqueante.
- Cadastros basicos (criar e listar) funcionando:
  - Cliente
  - Servico
  - Insumo
  - Forma de pagamento
- Ordem de Servico (OS) funcionando:
  - Criacao de OS para cliente existente
  - Status inicial visivel como ABERTA
  - Tramite completo ate ENTREGUE
  - OS ENTREGUE sem acao indevida de avancar
- Historico de status exibido com transicoes e data/hora:
  - ABERTA -> EM_ANDAMENTO
  - EM_ANDAMENTO -> CONCLUIDA
  - CONCLUIDA -> ENTREGUE

## Ressalvas / riscos (nao bloqueantes)
1. Warning tecnico recorrente do Next.js:
   - `Only plain objects can be passed to Client Components from Server Components. Decimal objects are not supported.`
   - Impacto: nao bloqueia o uso, mas recomenda ajuste para reduzir ruido e risco de regressao futura.
2. Atualizacao entre telas:
   - Cliente recem-cadastrado pode nao aparecer de imediato no select da tela de OS sem recarregar.
   - Impacto: atrito operacional, contornavel com reload.
3. Historico (UX):
   - Transicoes e timestamps estao OK; observacao por transicao nao ficou evidenciada no teste.

## Recomendacoes (proxima sprint)
- Tratar serializacao de Decimal ao passar dados de Server para Client para remover warnings.
- Garantir revalidacao/sincronizacao entre modulos (Clientes -> OS) sem necessidade de recarga.
- Melhorar feedback visual de acoes assincronas (ex.: status "Processando...").
- Avaliar exibir observacao no historico quando existir.

## Decisao sugerida ao PO
- **Seguir para UAT com cliente/PO: SIM** (aprovado com ressalvas).
- Condicao: registrar e priorizar as ressalvas acima antes de qualquer ida a producao.

## Observacoes de governanca
- Nenhum commit foi realizado durante a homologacao.
- Ha alteracao pendente anterior em `src/components/ui.tsx` e o arquivo de relatorio foi criado em `docs/`.

Referencias:
- Relatorio completo: `docs/RELATORIO_HOMOLOGACAO_MVP_V1.md`
