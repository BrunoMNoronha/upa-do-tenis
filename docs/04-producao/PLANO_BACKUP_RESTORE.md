# Plano de Backup e Restore — Produção

## Estratégia de backup

- Ferramenta: `pg_dump` (dump lógico em SQL puro, formato texto).
- Frequência mínima recomendada: **diária**, fora do horário de maior movimento da sapataria, mais um backup manual antes de qualquer deploy ou migration em produção.
- Retenção mínima recomendada: 7 backups diários + 4 semanais, guardados fora do servidor de aplicação (armazenamento separado — bucket externo, storage do provedor de banco gerenciado, ou outro servidor).
- Nomenclatura: `backup_upa_AAAAMMDD_HHMMSS.sql`, para ordenação cronológica natural.

```bash
pg_dump "$DATABASE_URL" > backup_upa_$(date +%Y%m%d_%H%M%S).sql
```

Nunca imprimir `$DATABASE_URL` em log de CI/CD ou console compartilhado — a credencial fica embutida na string de conexão.

## Estratégia de restore

Restore **sempre** primeiro em um banco temporário/separado, nunca diretamente sobre o banco de produção em uso:

```bash
psql "$DATABASE_URL_RESTORE_TEST" < backup_upa_AAAAMMDD_HHMMSS.sql
```

`DATABASE_URL_RESTORE_TEST` deve apontar para um banco criado especificamente para o teste (nome sugerido: `upa_restore_teste` ou `upa_producao_staging`), nunca reaproveitar o banco de produção real nem o de desenvolvimento.

## Validação pós-restore

Checklist mínimo após qualquer restore:

1. Contagem de tabelas do schema restaurado bate com o schema esperado:
   ```sql
   SELECT count(*) FROM information_schema.tables WHERE table_schema='public';
   ```
2. Contagem de registros de pelo menos uma tabela crítica (ex.: `Usuario`, `OrdemServico`, `MovimentacaoCaixa`) bate com o dump de origem.
3. `pnpm exec prisma migrate status` contra o banco restaurado não acusa migration pendente nem divergência de schema.
4. Login funcional contra o banco restaurado (smoke test manual).

## Teste realizado (ambiente local, 2026-07-06)

Executado ciclo completo de backup → restore → validação → limpeza contra um container Postgres 16 local (Docker), usando o banco de desenvolvimento como origem (nenhum dado de produção real existe ainda neste projeto):

| Etapa | Resultado |
|---|---|
| `pg_dump` do banco de origem | OK — dump de 1298 linhas / 48 KB gerado |
| Criação de banco temporário isolado | OK |
| `psql` restore do dump no banco temporário | OK, sem erros |
| Contagem de tabelas (schema `public`) | 19 no original = 19 no restaurado |
| Contagem de registros (`Usuario`) | 1 no original = 1 no restaurado |
| Limpeza do banco temporário e do arquivo de dump | OK — nenhum artefato residual |

Procedimento validado tecnicamente. **Pendência:** repetir este mesmo teste contra o banco de produção real (ou uma cópia dele) assim que ele existir, antes do go-live — o teste acima prova o procedimento, não substitui a validação contra dados de produção reais.

## Pendências

- Definir e documentar o destino de armazenamento externo dos backups (fora do servidor de aplicação).
- Automatizar a rotina de backup diário (cron/scheduler do provedor) quando o ambiente de produção estiver definido.
- Repetir o teste de restore contra o banco de produção real antes do go-live.
