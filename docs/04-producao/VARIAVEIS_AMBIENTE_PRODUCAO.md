# Variáveis de Ambiente — Produção

Referência: `.env.production.example` (já existe no repositório, versionado, apenas com placeholders).

## Variáveis obrigatórias

| Variável | Obrigatória em produção | Descrição | Observações |
|---|---|---|---|
| `NODE_ENV` | Sim | Define o modo de execução do Next.js | Deve ser `production` no servidor de produção |
| `DATABASE_URL` | Sim | String de conexão PostgreSQL | Deve apontar para o **banco de produção**, nunca para o banco de desenvolvimento/teste. Recomendado `sslmode=require` quando o host não for local |
| `AUTH_SESSION_SECRET` | Sim | Chave HMAC que assina o cookie de sessão | Mínimo 16 caracteres (recomendado 32 bytes). Sem ela, o servidor **recusa iniciar sessões** em produção (`src/lib/auth-constants.ts` lança erro) — comportamento intencional, não é bug |

Não existem variáveis `NEXT_PUBLIC_*` no projeto atualmente (`grep -r "NEXT_PUBLIC_" src` não retorna resultados). Nenhum segredo é ou deve ser exposto ao cliente. Caso uma variável `NEXT_PUBLIC_*` seja introduzida no futuro, ela é embutida no bundle do navegador — **nunca** usar para segredos.

## Geração do `AUTH_SESSION_SECRET`

```bash
openssl rand -hex 32
```

Gerar um valor **exclusivo por ambiente** (produção ≠ desenvolvimento ≠ homologação/staging). Rotacionar o segredo invalida todas as sessões ativas (usuários precisam logar de novo) — não é destrutivo para dados.

## Onde configurar

Definir as variáveis diretamente no provedor de hospedagem (painel de variáveis de ambiente) ou em um `.env.production` **local ao servidor**, nunca commitado. O arquivo `.env.production` já está no `.gitignore` do projeto.

## Checklist de variáveis antes do deploy

- [ ] `NODE_ENV=production` definido no ambiente de execução.
- [ ] `DATABASE_URL` aponta para o banco de **produção**, confirmado por nome de host/banco (nunca `localhost` de máquina de dev, nunca os bancos `upa_do_tenis_dev`/`upa_do_tenis_test`).
- [ ] `AUTH_SESSION_SECRET` gerado com `openssl rand -hex 32` (ou equivalente), único para produção, com pelo menos 16 caracteres.
- [ ] Nenhum arquivo `.env`, `.env.local`, `.env.production` com valores reais foi commitado (`git ls-files | grep '^\.env'` deve listar apenas `.env.example` e `.env.production.example`).
- [ ] Nenhuma variável `NEXT_PUBLIC_*` contém segredo.
