# Plano de Rollback — Produção

## Critérios objetivos para acionar rollback

Acionar rollback imediatamente se, após um deploy, ocorrer qualquer um dos itens abaixo:

1. Build ou start da aplicação falha em produção.
2. Login deixa de funcionar para usuários válidos.
3. Qualquer API privada crítica (caixa, pagamentos, estoque, vendas, relatórios, dashboard) passa a responder erro `5xx` de forma consistente.
4. Dados financeiros exibidos (saldo de OS, totais de caixa, relatórios) divergem do esperado após comparação manual.
5. Migration aplicada quebra o schema ou causa perda/corrupção de dados.
6. Enforcement de autenticação para de funcionar (API crítica responde `200` sem sessão, ou página privada renderiza sem sessão).
7. Erros recorrentes e não tratados nos logs do servidor imediatamente após o deploy.

## Quem decide

O rollback é decidido pelo Bruno (responsável técnico e de negócio do projeto). Nenhum rollback automático deve ser configurado nesta fase sem aprovação explícita.

## Procedimento — reverter para commit anterior

1. Identificar o último commit estável antes do deploy problemático (ex.: `dc71a4a`, ou o commit registrado no checklist de deploy como "commit implantado").
2. Reverter a branch de produção para esse commit:
   ```bash
   git log --oneline -10
   git revert <hash-do-commit-problematico>
   ```
   Preferir `git revert` a `git reset --hard` quando a branch já foi publicada/implantada, para preservar histórico e não reescrever commits compartilhados.
3. Reimplantar a partir do commit revertido, seguindo o mesmo checklist de deploy controlado.
4. Confirmar nos logs que a versão implantada corresponde ao commit revertido.

## Procedimento — restaurar backup do banco

Usar apenas se o rollback de código não for suficiente (ex.: migration corrompeu dados ou schema):

1. Parar a aplicação (ou colocar em modo de manutenção) para evitar escrita durante a restauração.
2. Confirmar qual backup será restaurado (mais recente **anterior** ao incidente).
3. Restaurar em banco temporário primeiro e validar (ver `PLANO_BACKUP_RESTORE.md`).
4. Só então restaurar sobre o banco de produção, com uma segunda pessoa confirmando o comando antes da execução, se possível.
5. Rodar `pnpm exec prisma migrate status` após restaurar para confirmar coerência entre schema e migrations aplicadas.
6. Reiniciar a aplicação e validar login + fluxo mínimo antes de liberar o uso novamente.

## Como desabilitar o deploy com segurança

- Se houver auto-deploy configurado na plataforma de hospedagem, suspender/pausar o deploy automático da branch `main` (ou da branch de produção) até o incidente ser resolvido.
- Reverter ou remover a variável de ambiente que aponta para o banco de produção não é uma forma válida de "desligar" o sistema — prefira pausar o serviço/deploy diretamente no provedor.

## Registro de incidente

Todo rollback deve ser registrado em `docs/03-homologacao/relatorios/`, com:

- data e hora do incidente;
- sintoma observado e evidência (log, print, request/response);
- commit/deploy problemático;
- ação de rollback executada (código e/ou banco);
- commit/estado final após o rollback;
- causa raiz (quando identificada) e ação de prevenção futura.

---

## Rollback no ambiente Vercel + Neon

Complementa as seções acima para o ambiente cloud descrito em [FATIA_PRODUCAO_04_VERCEL_NEON.md](FATIA_PRODUCAO_04_VERCEL_NEON.md). Os critérios objetivos de acionamento e a decisão de go/no-go **não mudam**.

### Rollback só de aplicação (segundos, sem rebuild)

Vercel → **Deployments** → selecionar o deployment `Ready` anterior → **Instant Rollback** / **Promote to Production**.

Válido **apenas** quando nenhuma migration foi aplicada desde aquele deployment, ou quando a migration aplicada é backward-compatible. É por isso que a ordem de release exige migrations backward-compatible: é ela que mantém este caminho de recuperação disponível.

### Matriz de decisão

| Situação | Ação | Perda de dados |
|---|---|---|
| Bug de aplicação, **sem** migration nova | Instant Rollback apenas | nenhuma |
| Bug + migration **backward-compatible** | Instant Rollback apenas; schema permanece adiantado | nenhuma |
| Bug + migration **destrutiva/incompatível** | Instant Rollback **+** restore da branch Neon para o timestamp pré-migration | **todas as escritas após o timestamp** |

A terceira linha exige **go/no-go explícito do responsável**, registrado no incidente antes da execução.

### Reverter schema

> [!WARNING]
> O Prisma **não tem down migration**. O caminho de reversão de schema é o PITR/branch restore do Neon, não `prisma migrate resolve`.

Nunca rodar `prisma migrate resolve --rolled-back` contra Production sem decisão escrita: o comando altera o histórico de migrations sem tocar no schema real, e pode mascarar a divergência em vez de corrigi-la.

Procedimento de PITR: criar branch a partir do timestamp pré-incidente, validar (ver [PLANO_BACKUP_RESTORE.md](PLANO_BACKUP_RESTORE.md)), e só então repontar `DATABASE_URL` de Production na Vercel para o endpoint da branch restaurada — ou promovê-la a primária no Neon. Repontar a variável exige **redeploy** para a aplicação assumir o novo valor.

### Como desabilitar o deploy com segurança

Vercel → **Settings → Git** → desconectar a integração Git, ou pausar o projeto. Equivale ao "parar o container" da trilha Docker.

Continua valendo a regra geral: **não** remover ou trocar `DATABASE_URL` como forma de "desligar" o sistema.

### Alavanca de emergência: invalidar todas as sessões

Rotacionar `AUTH_SESSION_SECRET` no escopo afetado e redeployar derruba todas as sessões ativas (cookie de 8h). Não é destrutivo para dados. Útil em suspeita de vazamento de sessão.
