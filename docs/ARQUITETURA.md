# Arquitetura do Sistema: UPA do Tênis

## Visão Geral

O projeto adota uma arquitetura full-stack moderna centralizada no **Next.js 14**, aproveitando o paradigma de **App Router** e **Server Components (RSC)**.

## Fluxo de Dados e Camadas

O modelo adotado minimiza a necessidade de APIs REST externas tradicionais, integrando o backend diretamente no framework através das **Server Actions** e **Route Handlers**.

### 1. Camada de Apresentação (Frontend)
- Construída com **React** e **Tailwind CSS**.
- **Client Components** (`"use client"`) são restritos a partes da interface que necessitam de interatividade (Formulários, Modais, State, Hooks).
- Os Formulários são validados utilizando **React Hook Form** + **Zod**, garantindo a sanidade dos dados antes do envio.

### 2. Camada de Lógica (Next.js Server / API)
- **Server Components**: Usados por padrão para listagens e páginas estáticas/dinâmicas. Fazem consultas ao banco de dados diretamente no momento da renderização do lado do servidor (SSR), o que garante velocidade e zero dependência no cliente.
- **Server Actions / Route Handlers (`src/app/api/...`)**: Onde ocorrem as mutações (POST/PUT/DELETE) e se concentra a regra de negócio antes da persistência.

### 3. Camada de Persistência (Prisma ORM)
- O **Prisma** atua como camada de mapeamento e abstração (`src/lib/prisma.ts`).
- Ele consome o `schema.prisma` e expõe métodos fortemente tipados baseados nos modelos de dados.
- Todo o ciclo de vida do banco (migrations, esquema) é controlado e versionado pela pasta `prisma/`.

### 4. Banco de Dados (SQLite)
- A instância local para o MVP é um banco de dados relacional **SQLite**, armazenado como arquivo físico (`dev.db`).
- Estruturado de forma relacional estrita (regras de chaves estrangeiras, deleção em cascata e restrições lógicas mantidas no motor relacional).

## Padrões Adotados
1.  **Separação de Componentes**: Diretório `src/components/` focado em UI isolada (botões, inputs, cards) ou complexa (Forms).
2.  **Validação Única (Single Source of Truth)**: O `zod` serve tanto como fonte de validação de interface quanto para inferir os tipos estáticos (ex: `z.infer<typeof schema>`).
