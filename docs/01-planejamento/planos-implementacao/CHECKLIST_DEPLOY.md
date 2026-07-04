# Checklist de Deploy (Em Produção)

Para realizar o deploy em um ambiente produtivo (ex: VPS Linux ou plataforma como Vercel/Render), siga as validações abaixo.

## Pré-Requisitos

1. **Repositório**: Ter o código versionado em um Git host (GitHub, GitLab, etc).
2. **Banco de Dados**: O projeto usa PostgreSQL via `DATABASE_URL`. Certifique-se de que o provedor de hospedagem oferece uma instância PostgreSQL acessível (gerenciada ou própria) e que as variáveis de ambiente de produção apontam para o banco correto.
3. **Node.js**: Máquina ou plataforma deve rodar Node >= 18.x.

## Checklist

- [ ] **1. Variáveis de Ambiente:** O arquivo `.env` de produção foi criado com `DATABASE_URL` configurado?
- [ ] **2. Instalação:** `npm install --production=false` (Para garantir que Typescript/Prisma e outras deves necessárias no build estão disponíveis).
- [ ] **3. Geração Prisma:** Comando `npx prisma generate` configurado como post-install ou pré-build.
- [ ] **4. Migrações:** O banco de produção está atualizado? Executar `npx prisma migrate deploy` no pipeline de CI/CD (não use `dev` em prod).
- [ ] **5. Dados Mínimos:** Executar `npm run seed` apenas uma vez no primeiro deploy para inserir Catálogos e Formas de Pagamento (os dados de cliente serão ignorados graças à trava de segurança).
- [ ] **6. Build Seguro:** `npm run build` passa sem erros (tipo ou lint estrito)?
- [ ] **7. Start:** O serviço sobe e responde em `npm start` (porta 3000 por padrão)?

## Erros Comuns

- **Erro de Prisma Client:** Significa que o step `prisma generate` foi esquecido no deploy script.
- **Tabela não existe:** As migrações não foram rodadas no host. Execute `prisma migrate deploy`.
