# Relatório de Homologação Manual — Cadastro Básico de Usuários

## Ambiente

- **Projeto:** UPA do Tênis - Sapataria Alves
- **Branch:** `main` (implementação ainda não commitada no momento da homologação)
- **Data da homologação:** 04/07/2026
- **Responsável pela execução:** Claude Code (agente), a pedido de Bruno M Noronha
- **Ambiente:** `npm run dev` local, Next.js 14.2.35, banco PostgreSQL local (`upa_do_tenis_dev`)
- **Método:** Execução manual guiada via browser automatizado (preview), com verificação direta do banco de dados para os critérios de segurança de senha; sem alteração de código-fonte durante a execução

## Escopo executado

CRUD básico de usuários do sistema (`/usuarios`): cadastro, listagem, edição, ativação/inativação, validações de formulário e proteção de senha. **Fora de escopo (por definição da fase):** perfis, permissões e controle de acesso.

Dados de teste identificáveis criados na sessão: "Usuário Homologação QA" / `usuario.homologacao@sapatariaalves.com` — **removidos do banco ao final da homologação**.

---

## Cenários executados — ✅ TODOS APROVADOS

| # | Cenário | Dado usado | Resultado esperado | Resultado obtido |
|---|---|---|---|---|
| 1 | Acesso pelo menu lateral | Clique em "Usuários" (viewport desktop) | Navegar para `/usuarios` com item de menu destacado | ✅ URL `/usuarios`, título "Usuários", item ativo no menu |
| 2 | Validação frontend — formulário vazio | Envio sem preenchimento | Três mensagens de erro, sem requisição | ✅ "O nome deve ter pelo menos 2 caracteres." / "O e-mail é obrigatório." / "A senha deve ter pelo menos 6 caracteres." |
| 3 | Validação frontend — e-mail inválido e senha curta | `nao-e-um-email` / senha `123` | Erros em tempo real (modo onChange) | ✅ "Informe um e-mail válido." e erro de senha; erro de nome limpo após correção |
| 4 | Cadastro válido | Usuário Homologação QA / `usuario.homologacao@sapatariaalves.com` / senha de 12 caracteres | Usuário criado, listado como Ativo, formulário limpo | ✅ Listado com badge "Ativo", contador Total: 1, formulário resetado |
| 5 | E-mail duplicado (caixa variada) | `USUARIO.HOMOLOGACAO@sapatariaalves.COM` | Bloqueio com mensagem | ✅ "Já existe um usuário cadastrado com este e-mail." — **HTTP 409 confirmado na aba de rede**; nada criado |
| 6 | Edição sem trocar senha | Nome alterado, campo senha em branco | Nome atualizado, senha mantida | ✅ Nome refletido na lista; hash no banco **idêntico** antes/depois (`scrypt:9d7e8ea…`) |
| 7 | Edição trocando senha | Nova senha de 14 caracteres | Hash substituído | ✅ Hash mudou (`scrypt:9d7e8ea…` → `scrypt:c0a6748…`), formato scrypt mantido |
| 8 | Inativar usuário | Botão "Inativar" | Badge "Inativo", botão vira "Reativar" | ✅ |
| 9 | Reativar usuário | Botão "Reativar" | Badge "Ativo" restaurado | ✅ |
| 10 | Senha nunca em texto puro | Consulta direta ao banco | `senhaHash` no formato `scrypt:<salt>:<hash>`, sem conter a senha digitada | ✅ Verificado após cadastro e após troca de senha |
| 11 | `senhaHash` não exposto na UI | Inspeção do HTML/payload RSC renderizado | Nenhuma ocorrência de `scrypt` ou `senhaHash` | ✅ Listagem usa `select` explícito sem o campo |
| 12 | Console do browser | Toda a sessão | Sem erros/warnings | ✅ Nenhum log de erro ou warning |

---

## Registro técnico (ressalvas do veredito)

### 1. Alteração aditiva de schema de banco

Foi adicionado o model `Usuario` ao `prisma/schema.prisma` com a migração `20260704211729_create_usuario` (apenas `CREATE TABLE "Usuario"` + índices + constraint única em `email`). **Nenhuma tabela, coluna ou regra existente foi alterada.** A alteração foi informada previamente no plano de implementação, conforme regra do projeto.

### 2. Ajuste no banco do `.env.production` (pré-existente, não causado pela fase)

Durante a validação, `npm run build` falhou no prerender de páginas antigas (/caixa, /insumos, /servicos etc.) com `P2021 — table does not exist`. Foi comprovado via `git stash` + build no HEAD limpo que **a falha já existia antes desta fase**: o `.env.production` aponta para o banco local `upa_do_tenis_prd`, que estava sem *nenhuma* migração aplicada (nem a `init_postgres`, anterior a esta fase). Correção aplicada: `prisma migrate deploy` nesse banco (operação aditiva sobre banco vazio). Após o ajuste, o build passou integralmente. Fica registrado que o **deploy real deve incluir `prisma migrate deploy` como etapa obrigatória** (ver `CHECKLIST_DEPLOY.md`).

### 3. Tela sem controle de acesso (escopo da fase)

A rota `/usuarios` e as APIs `POST /api/usuarios` e `PATCH /api/usuarios/[id]` **não possuem autenticação nem autorização** — qualquer pessoa com acesso ao sistema pode gerenciar usuários. Isso é intencional nesta fase (cadastro básico sem perfis/permissões), mas deve ser tratado como pré-requisito antes de expor o sistema fora do ambiente controlado da sapataria. A função `verifyPassword` já foi implementada e testada para suportar o futuro login.

## Riscos remanescentes

- Ausência de autenticação/controle de acesso (ressalva 3 acima).
- A suíte de testes (`npm run test`) continua apagando dados de insumos do banco do `.env` — condição pré-existente do projeto, já documentada, que voltou a ocorrer nas validações desta fase.

## Pendências

- Implementar autenticação/login utilizando `verifyPassword` (fase futura).
- Definir se haverá exclusão física de usuários ou apenas inativação (hoje, por segurança, só há inativação — sem endpoint DELETE).
- Incluir `prisma migrate deploy` no procedimento de deploy.

## Veredito

```markdown
# Veredito — Cadastro de Usuários

[ ] Aprovado
[x] Aprovado com ressalvas
[ ] Reprovado

Ressalvas:
- Funcionalidade ainda sem autenticação/permissão por escopo.
- Alteração aditiva de schema precisa constar no relatório técnico. (registrada na seção "Registro técnico" deste relatório)
- Necessária homologação manual registrada antes do fechamento. (atendida por este relatório)
```

## Recomendação

Fase apta para commit e fechamento. Antes de qualquer exposição do sistema fora do ambiente local da sapataria, priorizar a fase de autenticação/controle de acesso.
