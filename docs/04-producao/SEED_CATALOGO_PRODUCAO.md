# Carga inicial do catálogo em produção

O script `prisma/catalog-seed.ts` cadastra 35 serviços, 35 produtos e 35
insumos plausíveis para agilizar a preparação do catálogo da Sapataria Alves.
Produtos e insumos recebem estoque inicial e os valores foram definidos como
base para revisão operacional.

## Execução

Antes da execução, confira o diff do arquivo de dados e valide a conexão
apontada por `DATABASE_URL`. Com o backup e a janela operacional aprovados,
execute:

```bash
pnpm run seed:catalogo
```

O script é separado de `pnpm run seed`, que continua contendo a massa demo
com clientes e ordens de serviço. A carga de catálogo não cria clientes,
ordens, pagamentos, vendas ou movimentações de estoque.

## Comportamento seguro

- Apenas registros cujo nome ainda não existe são criados.
- Registros existentes não são atualizados, inativados ou removidos.
- Reexecutar o comando não deve duplicar os itens do catálogo.
- O script não altera `schema.prisma` e não cria movimentações de estoque.

Como os modelos atuais não possuem unicidade no campo `nome`, a idempotência é
baseada em consulta prévia e não protege contra duas execuções concorrentes.
Execute uma única carga por vez e confira os totais ao final:

```sql
SELECT COUNT(*) FROM "Servico";
SELECT COUNT(*) FROM "Produto";
SELECT COUNT(*) FROM "Insumo";
```
