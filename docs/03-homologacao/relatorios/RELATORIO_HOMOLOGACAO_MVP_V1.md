# Relatório de Homologação - MVP v1

## 1) Data da homologação
- Data: 03/07/2026
- Janela de execução: homologação manual em sessão única no VS Code

## 2) Ambiente utilizado
- SO: Windows
- Workspace: upa-do-tenis
- Execução: Next.js em modo desenvolvimento
- URL validada: http://localhost:3000
- URL de execução observada: http://localhost:3001 (porta 3000 já ocupada)
- Banco: SQLite via Prisma

## 3) Comandos executados
- `git status`
- `git log --oneline -n 12`
- `pnpm run dev`

## 4) Conferência inicial
- Estado do repositório: há alteração pendente não commitada em `src/components/ui.tsx`.
- Commit do MVP v1: confirmado.
  - `7184853 (tag: v1.0.0) chore: estabiliza e documenta MVP v1 para homologação`
- Subida local: confirmada (`next dev` ativo).
- Observação de porta: 3000 estava em uso, servidor iniciado em 3001; aplicação também acessível em 3000.

## 5) Telas verificadas

| Tela | Resultado | Evidência/Observação |
|---|---|---|
| Início | Aprovado | Página carregou com navegação completa e sem erro bloqueante. |
| Clientes | Aprovado | Tela carregou, listagem e formulário exibidos. |
| Ordens de Serviço | Aprovado com observação | Tela carregou e permitiu fluxo completo; exigiu recarga para refletir cliente recém-cadastrado em outra tela. |
| Serviços | Aprovado | Tela carregou e cadastro/listagem funcionaram. |
| Insumos | Aprovado | Tela carregou e cadastro/listagem funcionaram. |
| Financeiro / Formas de Pagamento | Aprovado | Tela carregou e cadastro/listagem funcionaram. |

## 6) Fluxos testados (cadastros básicos)

### 6.1 Cliente
- Cenário: cadastrar e listar cliente.
- Ação: cadastro de `UAT Cliente MVP V1`.
- Resultado: **Aprovado**.
- Comportamento observado: cliente persistido e exibido no topo da lista; total passou de 3 para 4.
- Erro/mensagem: sem erro bloqueante no backend (`POST /api/clientes 201`).
- Ajuste sugerido: opcional melhorar feedback visual durante submissão (`Salvando...`) para reduzir percepção de travamento.

### 6.2 Serviço
- Cenário: cadastrar e listar serviço.
- Ação: cadastro de `UAT Reforço Premium` com preço base e descrição.
- Resultado: **Aprovado**.
- Comportamento observado: item incluído na lista; total passou de 6 para 7.
- Erro/mensagem: sem erro bloqueante (`POST /api/servicos 201`).
- Ajuste sugerido: nenhum crítico.

### 6.3 Insumo
- Cenário: cadastrar e listar insumo.
- Ação: cadastro de `UAT Cola de Contato`.
- Resultado: **Aprovado**.
- Comportamento observado: item incluído na lista; total passou de 0 para 1.
- Erro/mensagem: sem erro bloqueante (`POST /api/insumos 201`).
- Ajuste sugerido: nenhum crítico.

### 6.4 Forma de pagamento
- Cenário: cadastrar e listar forma de pagamento.
- Ação: cadastro de `UAT Voucher Interno`.
- Resultado: **Aprovado**.
- Comportamento observado: item incluído na lista; total passou de 4 para 5.
- Erro/mensagem: sem erro bloqueante (`POST /api/formas-pagamento 201`).
- Ajuste sugerido: nenhum crítico.

## 7) Fluxo de Ordem de Serviço

### 7.1 Criação de OS
- Cenário: criar OS para cliente existente e adicionar serviço.
- Ação: criação da `OS-1001` para `UAT Cliente MVP V1`, item `Tênis branco de couro`, serviço `Costura`, prazo e valor total.
- Resultado: **Aprovado**.
- Evidência:
  - OS criada e listada imediatamente.
  - Status inicial exibido: **ABERTA**.
  - Botão de progressão inicial presente: `Iniciar Serviço`.

### 7.2 Ciclo de vida da OS
- ABERTA -> EM_ANDAMENTO: **Aprovado**.
- EM_ANDAMENTO -> CONCLUIDA: **Aprovado**.
- CONCLUIDA -> ENTREGUE: **Aprovado**.
- Pós-ENTREGUE sem avanço indevido: **Aprovado**.
  - Comportamento observado: após `ENTREGUE`, permaneceu apenas ação de histórico; não apareceu ação de avanço adicional.

## 8) Histórico da OS
- Cenário: abrir histórico da OS testada.
- Resultado: **Aprovado com observação**.
- Evidência na UI:
  - `ABERTA -> EM_ANDAMENTO`
  - `EM_ANDAMENTO -> CONCLUIDA`
  - `CONCLUIDA -> ENTREGUE`
  - Cada transição com data/hora exibida.
- Observação:
  - Não houve observação textual nas transições (campo opcional não evidenciado no histórico da UI). Não é bloqueante para o MVP v1, mas pode ser melhoria de rastreabilidade.

## 9) Leitura por usuário final (UX)

Avaliação prática para operação de balcão:
- Onde cadastrar clientes: **Claro** (menu + página objetiva).
- Onde criar OS: **Claro** (menu + formulário no topo).
- Como avançar status da OS: **Claro** (botões contextuais por etapa).
- Como consultar histórico: **Claro** (`Ver Histórico`).
- Onde acessar serviços/insumos/financeiro: **Claro** (menu principal).

Pontos de confusão/UX (não bloqueantes):
- Após criar cliente em outra tela, a lista de clientes no formulário de OS não refletiu imediatamente até recarregar a página.
- Durante ação de status, botão pode ficar em estado `Processando...` por alguns instantes sem indicador adicional de progresso global.

## 10) Erros, warnings e estabilidade

### 10.1 Erros bloqueantes
- **Nenhum erro bloqueante** identificado no terminal durante os fluxos principais.

### 10.2 Warnings encontrados
- Warning recorrente do Next.js sobre objetos `Decimal` passados de Server Components para Client Components.
- Exemplo observado no terminal:
  - `Warning: Only plain objects can be passed to Client Components from Server Components. Decimal objects are not supported.`

Classificação:
- **Não bloqueante para homologação funcional do MVP v1**.
- **Ajuste técnico recomendado** para próxima sprint.

### 10.3 Estabilidade geral
- Sem travamento de tela.
- Sem falhas de persistência nos fluxos testados.
- Atualizações de dados funcionais após submissão.

## 11) Bugs encontrados
1. Atualização de dados entre telas não imediata no formulário de OS.
- Severidade: Baixa/Média (funcional com recarga).
- Sintoma: cliente recém-cadastrado não apareceu de imediato no select de OS sem reload.
- Impacto: atrito operacional, mas com contorno simples (recarregar).

## 12) Ajustes recomendados (próxima sprint)
1. Tratar serialização de `Decimal` entre Server/Client para eliminar warnings do Next.js.
2. Melhorar sincronização/revalidação entre módulos (ex.: clientes -> OS) para refletir novos dados sem recarga manual.
3. Incrementar feedback visual de ações assíncronas de status para reduzir sensação de latência.
4. Avaliar exibição de observação no histórico de status quando existir.

## 13) Resultado por fluxo

| Fluxo | Status |
|---|---|
| Sistema abre localmente | Aprovado |
| Telas principais carregam | Aprovado |
| Cadastro/listagem de clientes | Aprovado |
| Cadastro/listagem de serviços | Aprovado |
| Cadastro/listagem de insumos | Aprovado |
| Cadastro/listagem de formas de pagamento | Aprovado |
| Criação de OS | Aprovado |
| OS nasce ABERTA | Aprovado |
| Tramitação ABERTA -> EM_ANDAMENTO -> CONCLUIDA -> ENTREGUE | Aprovado |
| OS ENTREGUE sem ação de avanço indevida | Aprovado |
| Histórico de status exibido | Aprovado com observação |

## 14) Decisão final
- **Aprovado com ressalvas**.

Justificativa:
- Todos os critérios funcionais centrais do MVP v1 foram atendidos.
- Não houve erro bloqueante na execução dos fluxos críticos.
- Há ressalvas técnicas e de UX (warnings `Decimal` e atualização entre telas) recomendadas para priorização na próxima sprint antes de escalar para produção final.

## 15) Conclusão para aceite inicial
- O MVP v1 está **apto para seguir para homologação com cliente/PO**, com registro das ressalvas acima e plano de ajuste incremental.
