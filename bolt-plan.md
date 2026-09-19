1. **Identificar o gargalo:** Em `src/app/api/servicos/[id]/route.ts`, a exclusão de um serviço realiza duas consultas de contagem sequenciais ao banco de dados usando `await prisma.servicoItemOrdem.count()` e `await prisma.itemAtendimentoRapido.count()`. Isso cria um "waterfall" desnecessário, mantendo a conexão I/O ocupada seqüencialmente.
2. **Otimização a ser aplicada:** Agrupar essas duas consultas independentes usando `Promise.all()` (conforme recomendado nos padrões do repositório em `.jules/bolt.md`), reduzindo o tempo total de espera de O(N) para O(max(T)).
3. **Validação:** Executar lint, typecheck, build e rodar a suíte de testes.
4. **Pre-commit:** Executar os passos de verificação finais via `pre_commit_instructions`.
5. **Criar PR:** Submeter com formato "⚡ Bolt: ..."
