# UPA do Tênis - Sapataria Alves

Sistema web interno para apoiar a operação da sapataria, com foco na base administrativa inicial: clientes, ordens de serviço e a estrutura para evoluir itens, serviços, pagamentos e acompanhamento de status.

## Tecnologias e Arquitetura

- **Next.js 14**: Framework React (App Router).
- **TypeScript**: Tipagem estática para maior segurança.
- **Prisma ORM**: Comunicação com o banco de dados.
- **SQLite**: Banco de dados local (desenvolvimento).
- **Tailwind CSS**: Estilização utilitária.
- **Zod & React Hook Form**: Validação e gerenciamento de estado de formulários.

Para uma visão detalhada, consulte a [Documentação de Arquitetura](docs/ARQUITETURA.md) e [Documentação do Banco de Dados](docs/BANCO_DE_DADOS.md).

## Requisitos

- Node.js (v18 ou superior recomendado).
- NPM, Yarn ou PNPM.

## Instalação e Execução (Ambiente Local)

Siga os passos abaixo para configurar e executar o projeto do zero:

1. **Instale as dependências:**
   ```bash
   npm install
   ```

2. **Gere o Prisma Client:**
   ```bash
   npx prisma generate
   ```

3. **Configure as Variáveis de Ambiente:**
   Copie o arquivo `.env.example` para `.env` na raiz do projeto (ele já vem configurado para o banco local SQLite).

4. **Execute as Migrations:**
   ```bash
   npx prisma migrate deploy
   ```

5. **Popule o banco com Dados Fictícios (Seed):**
   ```bash
   npm run seed
   ```
   *(O seed possui proteção contra sobrescrita caso já existam dados no banco).*

6. **Inicie o servidor de desenvolvimento:**
   ```bash
   npm run dev
   ```
   Acesse a aplicação em [http://localhost:3000](http://localhost:3000).

## Estrutura do Projeto

- `src/app`: Rotas e páginas (App Router).
- `src/components`: Componentes reutilizáveis da interface.
- `src/lib`: Funções utilitárias e inicialização do Prisma Client.
- `prisma/`: Schema do banco de dados, migrations e scripts de seed.
- `docs/`: Documentações complementares (testes, deploy, homologação).

## Scripts Disponíveis

- `npm run dev`: Inicia o servidor de desenvolvimento.
- `npm run build`: Compila o projeto para produção.
- `npm start`: Inicia o servidor em modo de produção.
- `npm run lint`: Verifica erros de padronização de código.
- `npm run test`: Executa os testes unitários (Vitest).
- `npm run typecheck`: Valida a tipagem estática do projeto sem emitir arquivos.
- `npm run seed`: Popula o banco de dados com a massa inicial.

## Guias e Processos

- [Como Contribuir](CONTRIBUTING.md)
- [Changelog do Projeto](CHANGELOG.md)
- [Roadmap de Funcionalidades](ROADMAP.md)
- [Roteiro de Homologação](docs/ROTEIRO_HOMOLOGACAO.md)
- [Checklist de Deploy](docs/CHECKLIST_DEPLOY.md)
