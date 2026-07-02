# UPA do Tênis - Sapataria Alves

Sistema web interno para apoiar a operação da sapataria, com foco no MVP v1: clientes, ordens de serviço, itens, serviços, pagamentos e acompanhamento de status.

## Stack

- Next.js
- TypeScript
- Prisma
- SQLite
- Tailwind CSS
- Zod
- React Hook Form

## Como executar

1. Instale as dependências.
2. Copie `.env.example` para `.env`.
3. Rode a migração inicial do Prisma.
4. Inicie o servidor de desenvolvimento.
5. Acesse a home, clientes e a estrutura inicial de ordens de serviço.

## Comandos

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
npm run build
```

## Visão geral do MVP

- Cadastro e consulta de clientes.
- Cadastro e consulta de ordens de serviço.
- Itens, serviços e pagamentos ligados à OS.
- Saldo calculado no backend.
- Entrega sempre no nível da OS inteira.

## Estrutura inicial

- `src/app` para rotas e páginas.
- `src/lib` para utilitários e acesso ao Prisma.
- `prisma/schema.prisma` para o domínio e persistência.
