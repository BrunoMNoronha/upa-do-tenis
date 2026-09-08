# DECISOES

## Decisões técnicas

- Usar Next.js com TypeScript como base do frontend e das rotas iniciais.
- Usar Prisma com SQLite para acelerar a primeira versão local do MVP.
- Manter o saldo como valor calculado no backend.
- Manter a entrega no nível da OS inteira, sem entrega parcial por item.
- Login protegido por rate limiting persistido (#82) e reCAPTCHA v3 invisível (#123), nesta ordem, antes da verificação de senha. Recusa de captcha é `403` uniforme e não consome o rate limit; indisponibilidade do Google falha aberto (nunca concede acesso); chaves ausentes desligam o captcha. A site key chega ao cliente como prop da página, sem `NEXT_PUBLIC_*`.

## Decisões de negócio já consolidadas

- Toda OS deve estar vinculada a um cliente.
- CPF/CNPJ é opcional no MVP.
- Aprovação pode ser verbal, presencial ou por WhatsApp, com registro manual.
- Sinal é opcional por OS.
- Desconto existe no modelo, mas a regra de permissão por perfil será implementada depois.
