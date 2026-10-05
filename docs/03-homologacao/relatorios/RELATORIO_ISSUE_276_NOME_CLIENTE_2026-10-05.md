# Issue #276 — Nome e sobrenome do cliente

Data: 05/10/2026. Base: `main` remota em `f4fc18237677341be8ea3b2002515734e48af087`.

## Resultado e impacto

O schema compartilhado exige pelo menos dois componentes após a sanitização de espaços. A regra atende cadastro, edição, cadastro dentro da abertura de OS, POST e PATCH. Os formulários apresentam “Nome e sobrenome”, exemplo “Maria Silva” e erro “Informe pelo menos nome e sobrenome.” associado ao campo.

Acentos, hífens, apóstrofos e nomes com mais de duas palavras são preservados. A validação verifica composição mínima; não identifica semanticamente o sobrenome.

Clientes legados continuam consultáveis e selecionáveis. PATCH sem `nome` continua parcial. Quando o formulário completo reenvia um nome legado incompleto, exige sua correção antes de salvar. Não houve saneamento de nomes, alteração de banco da loja, schema Prisma, migrations, dependências ou regras financeiras.

Permanecem TBD a política de saneamento dos nomes legados e eventual tratamento específico de razão social/CNPJ. Nenhuma exceção à regra foi introduzida.

## Arquivos alterados

- `src/lib/clientes-schema.ts`: regra compartilhada.
- `src/app/clientes/clientes-client.tsx`: orientação e erro acessível.
- `src/app/ordens-servico/ordens-servico-client.tsx`: orientação e associação acessível do erro no cadastro rápido.
- `src/lib/clientes-schema.test.ts`: rejeição, nomes válidos, espaços e atualização parcial.
- `src/lib/clientes.test.ts`: ausência de escrita em erro, normalização e compatibilidade de leitura/atualização parcial de cliente legado.
- `src/lib/cadastros-atualizar-schema.test.ts`: fixture válida de atualização.
- `src/app/api/clientes/route.test.ts`: POST inválido/normalizado.
- `src/app/api/clientes/[id]/clientes-crud.test.ts`: PATCH inválido/normalizado e sem nome.
- Este relatório: evidências e roteiro de homologação.

## Isolamento e comandos

Implementação em worktree própria, branch `codex/issue-276-nome-sobrenome`. As alterações de backup já existentes na checkout original foram preservadas.

Dependências instaladas com `pnpm install --frozen-lockfile --ignore-scripts`; client gerado com `pnpm exec prisma generate`. As 14 migrations existentes foram aplicadas com `pnpm exec prisma migrate deploy` exclusivamente em bancos novos e descartáveis deste trabalho.

- PostgreSQL 18 em `localhost:55441`: banco de testes e banco separado de homologação do navegador.
- PostgreSQL 16 em `localhost:55442`: reprodução da versão de PostgreSQL usada no workflow de CI, com pool de 10 conexões definido apenas no ambiente local de testes.
- Nenhuma conexão com Production/Preview; dados exclusivamente sintéticos.

| Validação | Resultado |
| --- | --- |
| `git diff --check` | Aprovado |
| `pnpm run lint` | Aprovado, sem erros ou avisos de ESLint |
| `pnpm run typecheck` | Aprovado |
| Testes focados abaixo | 5 arquivos, 76 testes aprovados |
| `pnpm run test` em PostgreSQL 18 | 149 arquivos: 146 aprovados, 3 com falhas; 1626 testes aprovados, 8 com falhas |
| `pnpm run build` | Aprovado na repetição final, incluindo geração do Prisma Client, compilação, tipos e páginas |

```powershell
pnpm exec vitest run src/lib/clientes-schema.test.ts src/lib/clientes.test.ts src/lib/cadastros-atualizar-schema.test.ts src/app/api/clientes/route.test.ts 'src/app/api/clientes/[id]/clientes-crud.test.ts'
```

### Falhas anteriores à implementação

As oito falhas da suíte completa também foram reproduzidas numa worktree limpa da base `f4fc182`, sem a implementação da #276, usando a mesma versão de Node, Vitest e Prisma:

- `caixa-concorrencia.test.ts`: quatro falhas com timeout de transação `P2028`.
- `ordens-servico-estornos.test.ts`: três falhas de concorrência com `P2028`/resposta 500 no lugar de 400/409/201.
- `atendimento-rapido.test.ts`: em PostgreSQL 18, uma falha porque a exclusão com chave estrangeira restritiva retorna `PrismaClientUnknownRequestError`, enquanto o teste exige `PrismaClientKnownRequestError`.

A execução dos três arquivos em PostgreSQL 16 teve sete falhas e 33 aprovações, tanto na implementação quanto na base limpa. O teste de chave estrangeira passou nessa versão. A reprodução isolada do arquivo de atendimento rápido na base limpa com PostgreSQL 18 teve uma falha e 27 aprovações. Isso confirma que as falhas locais antecedem esta mudança; não determina sua causa definitiva nem substitui a CI em Linux.

Nenhum teste financeiro foi alterado, desativado ou afrouxado. A suíte geral permanece com ressalva. A PR deve ficar em rascunho até revisão e avaliação das verificações restantes.

A primeira tentativa de build foi bloqueada por `EPERM` ao regenerar a DLL do Prisma enquanto os testes mantinham o engine aberto no Windows. A repetição final ocorreu com esses processos e o servidor de desenvolvimento encerrados.

## Homologação técnica no navegador

Servidor local iniciado com `pnpm run dev --hostname 127.0.0.1 --port 3316`. Verificação com `pnpm dlx agent-browser` em sessão própria, autenticação real na aplicação e PostgreSQL 18 local. Inspeção de tela, árvore acessível, atributos de erro, respostas HTTP, logs e leitura dos registros persistidos.

- Login e dashboard renderizaram sem tela vazia ou overlay de erro.
- Em Clientes, “Maria” foi recusado e os campos preenchidos foram preservados; o erro tinha `role=alert`, `aria-invalid=true` e `aria-describedby=nome-error`.
- “  Maria   Silva  ” foi salvo como “Maria Silva”; edição para “Maria” foi recusada e edição para “Maria Souza” foi persistida.
- Na abertura de OS, “João” foi recusado com erro associado a `novoClienteNome-error`; “João da Silva” foi salvo e selecionado automaticamente.
- Em viewport 375×812, os erros foram conferidos nos dois formulários. Os cadastros válidos “Luís D'Ávila” dentro da OS e “Ana-Maria Souza” em Clientes foram persistidos.
- O cliente legado “Maria” foi consultado e selecionado na abertura de OS.
- POST direto com “Maria” retornou 400; PATCH direto com “Maria” retornou 400. PATCH só de telefone retornou 200 e manteve o nome legado.
- A leitura final da base de homologação confirmou cinco clientes: um legado e os quatro nomes completos usados nos cenários válidos. Nenhum cliente extra foi criado pelas tentativas inválidas.
- Sem erros de página registrados pelo navegador ou overlay de Next.js na conferência final. Navegador e servidor encerrados ao terminar.

Capturas locais em `backups/issue276/` (ignoradas pelo Git): `clientes-nome-incompleto-desktop.png`, `clientes-nome-incompleto-mobile.png`, `os-nome-incompleto-desktop.png`, `os-nome-incompleto-mobile.png` e `os-cliente-legado.png`. Dados sintéticos; não são provas de homologação em produção.

## Roteiro para revisão e homologação do usuário

1. Em Clientes, tentar cadastrar apenas “Maria”, com telefone válido: recusar junto ao campo e preservar os demais dados. Corrigir para “Maria Silva”: salvar.
2. Editar um cliente válido para nome isolado: recusar. Informar nome e sobrenome: salvar.
3. Na abertura de OS, repetir cadastro rápido inválido e válido; confirmar seleção automática do cliente válido.
4. Repetir em largura móvel e conferir associação do erro ao campo, acentos, hífen, apóstrofo e normalização de espaços.
5. Consultar/selecionar cliente legado sem alterar seus dados; verificar que PATCH sem nome permanece parcial.

Não houve merge, deploy, fechamento da issue ou avanço de fase. A homologação técnica local não representa aprovação operacional do usuário.
