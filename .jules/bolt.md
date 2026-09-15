## 2023-10-27 — Paralelização de I/O em Server Components

**Learning:** Consultas de banco de dados e chamadas I/O independentes em Server Components Next.js sofrem gargalos de performance ("waterfall" - esperas sequenciais em série) se forem bloqueadas individualmente com `await`.

**Action:** Sempre identificar e agrupar múltiplas consultas concorrentes e independentes utilizando `Promise.all([consulta1(), consulta2()])` para executá-las paralelamente, reduzindo o tempo final de carregamento.
