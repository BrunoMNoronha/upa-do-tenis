# Documento Técnico — Bootstrap do Primeiro Admin

**Data:** 2026-07-04
**Fase anterior:** Autenticação/Login (homologada, commit `d8036cf`)

## Problema

Com a autenticação ativa, todas as telas e APIs (incluindo `/usuarios`) exigem login.
Em um ambiente novo (banco vazio), não existe usuário para fazer login, e o seed
(`prisma/seed.ts`) não cria usuários. O sistema fica travado.

## Solução

Script CLI de bootstrap que cria o primeiro usuário administrador **somente quando o
banco não possui nenhum usuário**. Não existe endpoint HTTP para isso — o bootstrap
só pode ser executado por quem tem acesso ao servidor/terminal e ao banco.

## Componentes

| Arquivo | Papel |
| --- | --- |
| `src/lib/bootstrap-admin.ts` | Serviço `criarPrimeiroAdmin()`: valida, conta usuários, cria só se zero |
| `scripts/bootstrap-admin.ts` | CLI que coleta credenciais e chama o serviço |
| `src/lib/bootstrap-admin.test.ts` | Testes unitários (prisma mockado) |
| `package.json` | Novo script `bootstrap:admin` |

Reutiliza integralmente o que já foi homologado:

- Validação: `usuarioCriarSchema` (`src/lib/usuarios-schema.ts`) — nome ≥ 2, e-mail válido, senha ≥ 6.
- Hash: `hashPassword` (`src/lib/passwords.ts`) — scrypt com salt aleatório.
- Normalização: nome com `trim()`, e-mail com `trim().toLowerCase()` (mesmo padrão da API `/api/usuarios`).
- Exposição: `usuarioPublicoSelect` — `senhaHash` nunca sai do banco para resposta/log.

## Uso

### Interativo (recomendado)

```bash
npm run bootstrap:admin
```

O script pergunta nome, e-mail e senha (a senha é digitada sem eco no terminal).

### Não interativo (deploy/automação)

```bash
BOOTSTRAP_ADMIN_NOME="Nome" BOOTSTRAP_ADMIN_EMAIL="admin@dominio.com" BOOTSTRAP_ADMIN_SENHA="senha-forte" npm run bootstrap:admin
```

> Atenção: no modo não interativo a senha fica na variável de ambiente da chamada.
> Prefira o modo interativo; em automação, limpe o histórico do shell depois.

### Comportamento

| Situação | Resultado | Exit code |
| --- | --- | --- |
| Banco sem usuários + dados válidos | Admin criado, ativo, senha com hash scrypt | 0 |
| Já existe ≥ 1 usuário | Bloqueado com mensagem clara; nada é criado | 1 |
| Dados inválidos (e-mail, senha < 6, nome < 2) | Erros listados; banco não é tocado | 1 |
| Sem TTY e sem variáveis de ambiente | Mensagem de instrução; nada é criado | 1 |

Em nenhum caso a senha ou o `senhaHash` são exibidos em tela ou log.

## Segurança

- Sem endpoint público: o bootstrap não é acessível via HTTP.
- Autolimitado: bloqueia se existir qualquer usuário — não serve para criar usuários adicionais nem para reset de senha.
- `/usuarios` e demais rotas continuam protegidas por sessão (nada foi alterado na autenticação).
- Requisito de produção continua o mesmo: `AUTH_SESSION_SECRET` definido.

## Roteiro de homologação manual

Pré-requisito: banco de testes vazio (ou apenas sem registros na tabela `Usuario`).
**Não execute em banco com dados reais sem verificar antes.**

1. **Criação do primeiro admin**
   - Rodar `npm run bootstrap:admin` em banco sem usuários.
   - Informar nome, e-mail e senha válidos.
   - Esperado: mensagem "Administrador criado com sucesso" com nome e e-mail (sem senha/hash).
2. **Login**
   - Acessar `/login` e entrar com o e-mail/senha informados.
   - Esperado: login funciona e o sistema navega normalmente.
3. **Proteção mantida**
   - Em janela anônima (sem sessão), acessar `/usuarios`.
   - Esperado: redirecionamento para login (rota continua protegida).
4. **Bloqueio de segunda execução**
   - Rodar `npm run bootstrap:admin` novamente.
   - Esperado: "Bootstrap bloqueado: o banco já possui 1 usuário(s)" e exit code 1; nenhum usuário novo criado.
5. **Validação de dados**
   - Em banco vazio (ou confiando nos testes automatizados), rodar com e-mail inválido ou senha de 5 caracteres.
   - Esperado: erros de validação listados, nada criado.
6. **Hash no banco**
   - Conferir via `npm run prisma:studio` que `senhaHash` começa com `scrypt:` e não contém a senha em texto puro.
