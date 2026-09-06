# AGENTS.md — Orientações para Agentes de IA

## Projeto

UPA do Tênis - Sapataria Alves — sistema web de gestão operacional de sapataria.

## Idioma

Responder e documentar em português do Brasil.

## Estilo de trabalho

- Diagnosticar antes de alterar.
- Planejar antes de implementar.
- Fazer mudanças pequenas e seguras.
- Testar antes de concluir.
- Documentar impacto.

## Restrições

- Não alterar regras financeiras sem teste.
- Não alterar estoque/insumos sem teste.
- Não alterar caixa sem teste.
- Não alterar schema sem autorização.
- Não criar dependências novas sem justificar.
- Não avançar fase sem homologação.

## Gerenciador de pacotes

Use exclusivamente `pnpm`. Para ferramentas locais, use `pnpm exec`; para pacotes temporários, `pnpm dlx`. Preserve `pnpm-lock.yaml`.

## Comandos padrão

```bash
git status
git diff --stat
pnpm run lint
pnpm run test
pnpm run build
```

## Entrega esperada por tarefa

- Resumo do que foi feito.
- Arquivos alterados.
- Comandos executados.
- Resultado das validações.
- Riscos remanescentes.
- Roteiro de homologação.
