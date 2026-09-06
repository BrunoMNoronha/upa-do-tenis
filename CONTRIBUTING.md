# Guia de Contribuição

Bem-vindo ao repositório do **UPA do Tênis**. Este guia orienta o padrão de desenvolvimento e boas práticas do time.

## Padrão de Commits

Utilizamos [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/):
- `feat:` Nova funcionalidade.
- `fix:` Correção de bug.
- `docs:` Alterações exclusivas na documentação.
- `style:` Alterações de formatação (espaços, vírgulas, etc) que não afetam a lógica.
- `refactor:` Alterações de código que não corrigem bugs nem adicionam funcionalidades.
- `test:` Adição ou correção de testes.
- `chore:` Atualizações de build, dependências ou ferramentas de suporte.

## Padrões de Código
- **Idioma**: O código fonte (variáveis, funções) deve ser escrito em Português para alinhar com o Domínio (ex: `ordemServico`, `clienteId`), exceto por termos padrão de frameworks (ex: `useEffect`, `page`).
- **Validação**: Nenhuma alteração pode quebrar `pnpm run lint` ou `pnpm run typecheck`.
- **Formatação**: Utilize o Prettier integrado e evite overrides manuais no ESLint sem justificativa na revisão de código.

## Fluxo de Trabalho (Branches)
1. **`main`**: Ramo de produção, sempre estável.
2. Crie sua branch a partir da `main` no formato: `tipo/descricao-curta` (ex: `feat/cadastro-os`, `fix/calculo-saldo`).
3. Commit suas alterações seguindo o padrão.
4. Abra um **Pull Request (PR)** apontando para a `main`.

## Processo de Pull Request
1. Descreva de forma clara o que o PR resolve (referencie issues, se existirem).
2. O PR deve passar por todas as verificações do CI (`build`, `lint`, `typecheck`).
3. Somente após aprovação (Code Review) o PR poderá ser mesclado (Merge).
