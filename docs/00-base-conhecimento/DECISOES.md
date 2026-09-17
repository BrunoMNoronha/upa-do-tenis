# DECISOES

## Decisões técnicas

- Usar Next.js com TypeScript como base do frontend e das rotas iniciais.
- Usar Prisma com SQLite para acelerar a primeira versão local do MVP.
- Manter o saldo como valor calculado no backend.
- Manter a entrega no nível da OS inteira, sem entrega parcial por item.
- Login protegido por rate limiting persistido (#82) e reCAPTCHA v3 invisível (#123), nesta ordem, antes da verificação de senha. Recusa de captcha é `403` uniforme e não consome o rate limit; indisponibilidade do Google falha aberto (nunca concede acesso); chaves ausentes desligam o captcha. A site key chega ao cliente como prop da página, sem `NEXT_PUBLIC_*`.
- Migrations pendentes são detectadas em tempo de execução (#224), não bloqueadas no build: a lista do código é embutida no build pelo `next.config.mjs` e comparada com `_prisma_migrations` em `GET /api/saude/migrations` (público; `200`/`503`, nomes só com sessão) e no aviso do `pnpm run dev`. Descartados: `migrate status` no build da Vercel (falharia em todo push com migration, porque o workflow `Migrations (Neon)` migra depois do merge, e exigiria banco no build) e `migrate deploy` no build (aplicaria migration em Production sem a aprovação do environment). Deploy com migration em Production só pelo workflow `Migrations (Neon)`; promoção manual só para deploys sem migration nova.

## Decisões de negócio já consolidadas

- Toda OS deve estar vinculada a um cliente.
- CPF/CNPJ é opcional no MVP.
- Aprovação pode ser verbal, presencial ou por WhatsApp, com registro manual.
- Sinal é opcional por OS.
- Desconto existe no modelo, mas a regra de permissão por perfil será implementada depois.
