## 2025-02-18 - Evite `reduce` para criação dinâmica de mapas em pequenos arrays
**Learning:** Em otimizações no V8/Node.js, substituir repetidas chamadas `Array.prototype.find()` por um único `Array.prototype.reduce()` construindo um objeto mapa dinâmico nem sempre melhora a performance real se o array for muito pequeno. A sobrecarga de alocação de propriedades dinâmicas e o garbage collection do `reduce` pode deixá-lo mais lento que a busca O(N*M) com M pequeno.
**Action:** Para transformar processamento O(K*N) em O(N) com máxima performance, declare as variáveis de saída fora do escopo e utilize um `for...of` com mutação local (`let`) em vez de construir novos objetos usando callbacks funcionais e reduções.

## 2025-02-18 - Paralelização Massiva em Agregações do Prisma
**Learning:** Em funções de dashboard que computam inúmeras métricas agregadas sem dependência de dados entre si (ex: totais recebidos, totais pendentes, contagens segmentadas por status e ticket médio), executar as queries de forma sequencial (11 vezes `await prisma...`) introduz um gargalo de rede clássico O(N).
**Action:** Utilize o padrão `Promise.all()` agrupando massivamente todas as agregações independentes para resolver de forma concorrente O(max(T)), e execute os queries subsequentes que dependem destes agregados (ex: buscar entidades a partir de arrays de IDs) em um segundo bloco `Promise.all()` logo a seguir.
## 2026-09-07 - Bulk Insert com createManyAndReturn
**Learning:** A função `createManyAndReturn` nativa do Prisma 5+ é suportada tanto em PostgreSQL quanto SQLite e é a abordagem ideal e mais limpa para converter inserções independentes `Promise.all(linhas.map(x => tx.x.create(...)))` em bulk inserts quando o ID gerado é necessário para passos subsequentes (ex: baixas de estoque associadas).
**Action:** Utilizar `createManyAndReturn` (ou `createMany` se os dados retornados não forem necessários) em vez de N inserções independentes agrupadas via `Promise.all()` na camada de transação do backend, reduzindo roundtrips com o banco e melhorando significativamente o tempo total de resposta de O(N) para O(1) na inserção.
## 2025-02-18 - Paralelização massiva de agregações independentes
**Learning:** Agregações massivas do banco de dados (ex: `count`, `aggregate`, `sum`, etc) executadas iterativamente usando `await` são ofensoras clássicas de performance (Gargalo O(N)) por manter o I/O bloqueado.
**Action:** Agrupar sempre operações independentes em um único bloco `Promise.all()` em rotas da API, para que as requisições atinjam o banco concorrentemente. Em otimizações (Bolt), pesquise globalmente por blocos sequenciais `await prisma.<model>.count` usando o bash em todo o repositório.

## 2026-09-12 - Otimização de múltiplas agregações no frontend
**Learning:** O uso de múltiplas chamadas consecutivas de `.filter(...).length` sobre o mesmo array no frontend (ex: calculando totais de ordens por status) causa iterações O(k*N) redundantes.
**Action:** Utilize um único loop `for...of` com variáveis contadoras independentes para consolidar o processamento em O(N), evitando o garbage collection excessivo associado à criação de arrays intermediários no `.filter()`.

## 2026-09-15 - Paralelização de I/O em Server Components
**Learning:** Consultas de banco de dados e chamadas I/O independentes em Server Components Next.js sofrem gargalos de performance ("waterfall" - esperas sequenciais em série) se forem bloqueadas individualmente com `await`.
**Action:** Sempre identificar e agrupar múltiplas consultas concorrentes e independentes utilizando `Promise.all([consulta1(), consulta2()])` para executá-las paralelamente, reduzindo o tempo final de carregamento.
