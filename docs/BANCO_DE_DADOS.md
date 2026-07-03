# Documentação do Banco de Dados

Esta documentação resume as entidades, atributos e relacionamentos configurados no Prisma (veja `schema.prisma` para detalhes técnicos exatos).

## Dicionário de Entidades

### Cliente
Representa a base de usuários finais da sapataria.
*   **Campos Chave:** `id` (PK), `nome` (Obrigatório), `telefone` (Obrigatório), `cpfCnpj` (Opcional).
*   **Regras:** Um cliente pode possuir **zero ou várias** Ordens de Serviço (1:N).

### OrdemServico (OS)
O coração operacional do sistema.
*   **Campos Chave:** `id` (PK), `numero` (Unique), `clienteId` (FK).
*   **Campos de Valor:** `valorTotal`, `valorDesconto`, `valorSinal`, `valorPago`, `saldo`. (Todos como `Decimal`).
*   **Status:** String, default: `ABERTA`.
*   **Datas:** `dataEntrada`, `dataPrevisao`, `dataConclusao`.
*   **Regras e Relacionamentos:**
    *   **Não** pode ser apagada se existirem pagamentos atrelados (gerenciado via lógica ou restrição na evolução do sistema).
    *   Cliente vinculado não pode ser excluído acidentalmente se possuir uma OS (`onDelete: Restrict`).
    *   Pode possuir **vários** Itens (1:N), Pagamentos (1:N) e HistóricoStatus (1:N).

### ItemOrdemServico
A peça física deixada para conserto (ex: Tênis Nike, Bota Couro).
*   **Campos Chave:** `id` (PK), `ordemServicoId` (FK).
*   **Detalhes:** `tipoItem`, `descricao`, `marca`, `cor`, `tamanho`.
*   **Regras:** Deletar uma OS apaga os itens associados (`Cascade`). Possui vários Serviços associados (1:N em tabela pivô).

### Servico
O catálogo padrão de serviços da sapataria (ex: Troca de sola, Pintura).
*   **Campos Chave:** `id` (PK), `nome`, `precoBase`.
*   **Regras:** Apenas serviços `ativos` aparecem em listagens de cadastro.

### ServicoItemOrdem
Tabela de ligação (pivô) que conecta o Item aos Serviços executados nele.
*   **Campos Chave:** `id` (PK), `itemOrdemServicoId` (FK), `servicoId` (FK).
*   **Regras:** Se um serviço deixar de existir (exclusão no catálogo), não pode apagar o histórico (portanto, `Restrict`). Se o item da OS for excluído, essa ligação apaga em `Cascade`.

### FormaPagamento e Pagamento
Gerenciamento financeiro basilar.
*   **FormaPagamento:** Tabela de catálogo fixa (Dinheiro, PIX, Cartão).
*   **Pagamento:** Lançamento associado a uma OS.
*   **Campos Chave:** `ordemServicoId` (FK), `formaPagamentoId` (FK), `valor`.
*   **Regras:** Deletar OS apaga pagamentos. Deletar uma forma de pagamento no catálogo não é permitido se já houver lançamentos (`Restrict`).

### HistoricoStatus
Auditoria do fluxo temporal de uma OS.
*   **Campos Chave:** `id` (PK), `ordemServicoId` (FK), `statusAnterior`, `statusNovo`.
*   **Regras:** Tabela apenas de inserção (append-only) para guardar rastro das mudanças, juntamente com o `criadoEm`.

### Insumo
Controle de estoque básico (material para execução).
*   **Campos:** `id` (PK), `nome`, `quantidadeEstoque`, `custoUnitario`.
