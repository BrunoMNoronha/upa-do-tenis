## 2025-03-09 - Otimização de N+1 Query no Saneamento de Formas de Pagamento
**Learning:** O uso de loops `for...of` realizando chamadas sequenciais `prisma.<model>.update` introduz o problema de N+1 queries, causando múltiplos roundtrips de rede e gargalos de I/O de banco de dados diretamente proporcionais ao número de registros (O(N)).
**Action:** Sempre substituir atualizações em loop de campos homogêneos por uma única chamada `prisma.<model>.updateMany` com filtro `where: { id: { in: ids } }`, reduzindo o tempo de execução e roundtrips de O(N) para O(1).
