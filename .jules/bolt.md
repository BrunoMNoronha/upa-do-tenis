## 2025-05-18 - Concurrent item processing in transactions using Promise.all
**Learning:** Iterating over items sequentially with `await` inside a transaction creates unnecessary network and execution latency, scaling linearly (O(N)) with the number of items.
**Action:** Wrap independent per-item async operations (e.g. `itemVenda.create` and stock deduction) within `Promise.all(linhas.map(...))` to execute database operations concurrently within the transaction context, reducing overall execution time to O(max(T)).
