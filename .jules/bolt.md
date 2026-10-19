## 2025-02-12 — Array Iteration Optimization

**Learning:** Em operações onde há um `map` e `filter` consecutivos, é melhor combinar os dois em um único `for...of` com `continue`. O mesmo se aplica para quando há também um `filter` e `length` combinados para contar a quantidade de elementos que satisfazem certa condição. No arquivo `src/lib/assistente-conversas.ts` combinamos ambas as otimizações iterando sobre `mensagens` uma única vez.

**Action:** Sempre inspecionar a base de código por locais com múltiplas iterações encadeadas (`.map`, `.filter`, `.length`) e procurar consolidá-los em loops simples (`for...of`) para minimizar criação de arrays temporários, early return com `continue` para descartar items e melhorar complexidade de tempo de O(kN) para O(N).
