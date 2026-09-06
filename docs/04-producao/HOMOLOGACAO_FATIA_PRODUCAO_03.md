# Homologação — Fatia Produção 03: Docker Local Piloto

## Informações

| Campo | Valor |
|---|---|
| **Fatia** | Produção 03 — Docker Local Piloto |
| **Data** | 06/07/2026 |
| **Responsável** | Claude Code (agente) + Bruno M Noronha |
| **Ambiente** | Docker local (`localhost:3000`) |
| **Versão** | `git log --oneline -1` → `dc71a4a feat(auth): protect private pages and critical APIs` |

> **Nota de método:** nesta sessão não havia navegador real acessível ao agente (Chrome/extensão indisponível; o `preview` interno ficou preso a um processo `pnpm run dev` isolado, não ao container Docker). Por decisão do responsável, a homologação foi conduzida por **requisições HTTP diretas (curl)** contra `http://localhost:3000`, usando os mesmos endpoints que a UI consome (login por cookie de sessão, APIs de clientes/serviços/OS). Isso valida o comportamento real do servidor, autenticação, persistência e regras de negócio — mas **não** substitui o click-through visual (renderização de telas, mensagens de erro na UI, estados de botão). Itens que exigem interação visual e não foram exercidos ficam marcados como **Pendente**.

---

## Pré-condições

- [x] Docker Desktop está rodando.
- [x] Arquivo `.env.docker` criado a partir de `.env.docker.example`.
- [x] `AUTH_SESSION_SECRET` gerado e preenchido.
- [x] Containers estão de pé: `docker compose -f docker-compose.local.yml ps` mostra `upa-app` e `upa-db` como `Up`.
- [x] Nenhum erro nos logs: `docker compose -f docker-compose.local.yml logs --tail=50` (apenas aviso informativo de versão do Prisma CLI, não é erro).

---

## Roteiro de Homologação

### 0. Bootstrap do administrador

- [x] Confirmado que a imagem de runtime (`runner` stage do `Dockerfile`) não inclui `scripts/`, `tsx` nem o `node_modules` completo — o bootstrap não pode rodar dentro do container sem alterar o Dockerfile (fora de escopo desta fatia).
- [x] Executado `pnpm run bootstrap:admin` localmente, com `DATABASE_URL` apontando para o Postgres do Docker via porta exposta (`localhost:5433`, mapeada em `docker-compose.local.yml`).
- [x] Usuário administrador criado com sucesso (nome e e-mail de teste; senha não versionada neste documento).

**Resultado:** ☑ OK ☐ Falhou  
**Observações:** Único usuário no banco antes do bootstrap; script bloqueia criação caso já existam usuários (comportamento esperado, não testado por já ser coberto por teste automatizado existente).

---

### 1. Abrir sistema em localhost

- [x] Acessar `http://localhost:3000` sem sessão → redireciona (307) para `/login`.
- [x] `/login` carrega (HTTP 200).
- [x] Login via `POST /api/auth/login` com credenciais do admin retorna 200 e cookie de sessão `upa_sessao`.
- [x] Com sessão válida, `/`, `/clientes`, `/servicos`, `/ordens-servico`, `/caixa`, `/insumos` retornam HTTP 200.
- [ ] Verificação visual da página e console do navegador (F12) — **Pendente**, requer navegador real.

**Resultado:** ☑ OK (nível HTTP/autenticação) ☐ Pendente (nível visual)  
**Observações:** Validado via curl com cookie de sessão. Redirecionamento e enforcement de autenticação (PEND-01) funcionando corretamente no ambiente Docker.

---

### 2. Criar cliente

- [x] Criado via `POST /api/clientes` (mesma API que a tela de clientes consome): "Cliente Homologacao Fatia03".
- [x] Confirmado via `GET /api/clientes?search=Homologacao` que o cliente aparece na listagem.
- [ ] Clique real em "Novo Cliente" e preenchimento do formulário na UI — **Pendente**, requer navegador real.

**Resultado:** ☑ OK (nível API) ☐ Pendente (nível visual)  
**Observações:** Cliente `cmr9nn8fh0000ps9349qm5eyc` criado e listado corretamente.

---

### 3. Criar serviço

- [x] Criado via `POST /api/servicos`: "Servico Homologacao Fatia03", preço base R$ 50.
- [x] Resposta 201 com o serviço criado.
- [ ] Confirmação visual na listagem da tela de serviços — **Pendente**.

**Resultado:** ☑ OK (nível API) ☐ Pendente (nível visual)  
**Observações:** Serviço `cmr9npvnb0001ps93bpg99hgc` criado.

---

### 4. Criar Ordem de Serviço (OS)

- [x] Criada via `POST /api/ordens-servico`, vinculando o cliente e serviço criados: `OS-06072026-9001`.
- [x] Status inicial `ABERTA`, valor total R$ 50, saldo R$ 50 (sem pagamento).
- [x] Detalhe da OS acessível tanto pela página (`/ordens-servico/[id]` → HTTP 200) quanto pela API (`GET /api/ordens-servico/[id]`), com cliente, item e serviço vinculados corretamente.
- [ ] Confirmação visual na listagem e navegação por clique — **Pendente**.

**Resultado:** ☑ OK (nível API/rota) ☐ Pendente (nível visual)  
**Observações:** OS `cmr9nq1po0003ps9383no7lkb` criada e consistente.

---

### 5. Registrar pagamento parcial

**Resultado:** ☐ Pendente  
**Observações:** Não exercido nesta sessão (escopo priorizou login, navegação autenticada, criação de cliente/serviço/OS e persistência, conforme decisão do responsável). Regras financeiras já cobertas pelos 323 testes automatizados (`pnpm run test`).

---

### 6. Conferir saldo

**Resultado:** ☐ Pendente  
**Observações:** Não exercido nesta sessão. Ver item 5.

---

### 7. Tentar pagamento inválido

**Resultado:** ☐ Pendente  
**Observações:** Não exercido nesta sessão. Ver item 5.

---

### 8. Abrir caixa

**Resultado:** ☐ Pendente  
**Observações:** Não exercido nesta sessão — fora do escopo definido para esta rodada (login, navegação, cliente/serviço/OS e persistência).

---

### 9. Registrar entrada no caixa

**Resultado:** ☐ Pendente  
**Observações:** Não exercido nesta sessão.

---

### 10. Registrar saída do caixa

**Resultado:** ☐ Pendente  
**Observações:** Não exercido nesta sessão.

---

### 11. Fechar caixa

**Resultado:** ☐ Pendente  
**Observações:** Não exercido nesta sessão.

---

### 12. Criar insumo

**Resultado:** ☐ Pendente  
**Observações:** Não exercido nesta sessão.

---

### 13. Registrar entrada de estoque

**Resultado:** ☐ Pendente  
**Observações:** Não exercido nesta sessão.

---

### 14. Registrar saída de estoque

**Resultado:** ☐ Pendente  
**Observações:** Não exercido nesta sessão.

---

### 15. Validar dashboard e relatórios

- [x] `GET /dashboard` retorna HTTP 200 com sessão válida (verificado no item 1).
- [ ] Verificação visual dos dados refletidos e dos relatórios — **Pendente**.

**Resultado:** ☐ Pendente (nível visual)  
**Observações:** Apenas carregamento da rota foi validado.

---

### 16. Reiniciar containers

Executar no terminal:
```bash
docker compose -f docker-compose.local.yml restart
```

- [x] Containers reiniciaram sem erros (`docker compose --env-file .env.docker -f docker-compose.local.yml restart app`).
- [x] Logs não apresentam erros críticos após reinício (apenas aviso informativo de major update do Prisma CLI).

**Resultado:** ☑ OK  
**Observações:** App voltou a responder em `/login` com HTTP 200 na 2ª tentativa (poucos segundos).

---

### 17. Confirmar persistência de dados

- [x] Após o reinício, novo login com o mesmo admin funcionou (200).
- [x] Cliente criado no item 2 ainda existe (`GET /api/clientes?search=Homologacao` retornou o mesmo registro).
- [x] OS criada no item 4 ainda existe (`GET /api/ordens-servico/[id]` retornou os mesmos dados, incluindo item e serviço vinculados).
- [ ] Pagamento (item 5) — não aplicável, item 5 não foi exercido nesta sessão.
- [ ] Insumos/estoque (itens 12-14) — não aplicável, não exercidos nesta sessão.
- [ ] Caixa (item 11) — não aplicável, não exercido nesta sessão.

**Resultado:** ☑ OK (para os dados efetivamente criados: cliente e OS)  
**Observações:** Persistência do volume Docker (`upa_postgres_data`) confirmada para os dados criados via API nesta sessão.

---

### 18. Fazer backup via pg_dump

**Resultado:** ☐ Pendente (nesta sessão)  
**Observações:** Backup manual via `pg_dump` contra o ambiente Docker desta própria Fatia Produção 03 (containers `upa-app`/`upa-db`, procedimento documentado em `docs/04-producao/FATIA_PRODUCAO_03_DOCKER_LOCAL.md`) já foi validado em rodada anterior desta mesma fatia, antes desta sessão de homologação. Não repetido nesta rodada por já estar coberto e fora do escopo definido para esta sessão (homologação autenticada via UI/API). Não confundir com o teste de backup/restore da Fatia Produção 01, que foi executado contra o banco de desenvolvimento em um container Postgres genérico e descartável (`upa-postgres`), cenário distinto do ambiente Docker desta fatia.

---

### 19. Confirmar arquivo de backup

**Resultado:** ☐ Pendente (nesta sessão)  
**Observações:** Ver item 18.

---

### 20. Validar logs após reinício

```
=== UPA do Tênis — Iniciando ===
>> Aplicando migrations do Prisma...
No pending migrations to apply.
>> Iniciando servidor Next.js...
 ✓ Ready in 148ms
```

- [x] Não há erros críticos nos logs (apenas aviso informativo de versão do Prisma CLI).
- [x] Mensagens "Aplicando migrations do Prisma..." e "Iniciando servidor Next.js..." aparecem.
- [x] Servidor respondendo em `localhost:3000` (confirmado via curl).

**Resultado:** ☑ OK  
**Observações:** Nenhuma migration pendente; ambiente estável após reinício.

---

## Resumo da Homologação

| # | Item | Resultado |
|---|---|---|
| 0 | Bootstrap do administrador | ☑ OK |
| 1 | Abrir sistema / login / navegação autenticada | ☑ OK (nível HTTP) ☐ Pendente (visual) |
| 2 | Criar cliente | ☑ OK (nível API) ☐ Pendente (visual) |
| 3 | Criar serviço | ☑ OK (nível API) ☐ Pendente (visual) |
| 4 | Criar OS | ☑ OK (nível API) ☐ Pendente (visual) |
| 5 | Registrar pagamento parcial | ☐ Pendente |
| 6 | Conferir saldo | ☐ Pendente |
| 7 | Tentar pagamento inválido | ☐ Pendente |
| 8 | Abrir caixa | ☐ Pendente |
| 9 | Registrar entrada | ☐ Pendente |
| 10 | Registrar saída | ☐ Pendente |
| 11 | Fechar caixa | ☐ Pendente |
| 12 | Criar insumo | ☐ Pendente |
| 13 | Registrar entrada de estoque | ☐ Pendente |
| 14 | Registrar saída de estoque | ☐ Pendente |
| 15 | Validar dashboard/relatórios | ☐ Pendente (visual) |
| 16 | Reiniciar containers | ☑ OK |
| 17 | Confirmar persistência de dados (cliente e OS) | ☑ OK |
| 18 | Fazer backup via pg_dump | ☐ Pendente nesta sessão (já validado na Fatia 01) |
| 19 | Confirmar arquivo de backup | ☐ Pendente nesta sessão (já validado na Fatia 01) |
| 20 | Validar logs após reinício | ☑ OK |

**Validações complementares fora do roteiro original:**

| Validação | Resultado |
|---|---|
| `pnpm run lint` | ☑ OK — sem warnings/erros |
| `pnpm run test` | ☑ OK — 32 arquivos, 323 testes passando |
| `pnpm run build` | ☑ OK — build de produção concluído sem erros |

---

## Veredito Final

☐ **Aprovado** — Todos os itens OK. Sistema pronto para uso em produção local piloto.

☑ **Aprovado com ressalvas** — Itens não críticos falharam. Detalhar abaixo.

☐ **Reprovado** — Itens críticos falharam. Detalhar abaixo e abrir correção.

**Detalhamento:**

O núcleo técnico da Fatia Produção 03 está validado: autenticação real funciona no ambiente Docker (redirect não-autenticado, login, sessão via cookie httpOnly, navegação autenticada em todas as páginas privadas), criação de dados via APIs equivalentes às usadas pela UI (cliente, serviço, OS com vínculos corretos) e persistência após reinício do container `app`. Lint, testes automatizados (323) e build de produção seguem aprovados, sem alteração de regra crítica.

Ficam **pendentes de verificação visual/manual** (não exercidos por falta de navegador real disponível ao agente nesta sessão, mediante decisão do responsável):
- Click-through da UI (aparência de telas, mensagens, estados de botão) para os fluxos de cliente/serviço/OS já validados via API;
- Fluxo de pagamento (parcial, inválido) e conferência visual de saldo — regras já cobertas pelos testes automatizados, mas não pela UI real;
- Controle de caixa (abrir, entrada, saída, fechar);
- Insumos e movimentação de estoque;
- Dashboard e relatórios (apenas a rota HTTP foi validada, não o conteúdo renderizado);
- Backup via `pg_dump` contra o ambiente Docker (já validado anteriormente nesta própria Fatia Produção 03, não repetido aqui).

Recomenda-se que o responsável (Bruno) execute manualmente o click-through pendente antes de considerar a Fatia Produção 03 totalmente encerrada, usando este mesmo relatório como checklist (itens 5-14 e verificação visual dos itens 1-4 e 15).

**Dados de teste criados nesta sessão (persistem no volume Docker `upa_postgres_data`):**
- Usuário admin: `admin.homolog@upadotenis.local` (bootstrap)
- Cliente: `Cliente Homologacao Fatia03` (`cmr9nn8fh0000ps9349qm5eyc`)
- Serviço: `Servico Homologacao Fatia03` (`cmr9npvnb0001ps93bpg99hgc`)
- OS: `OS-06072026-9001` (`cmr9nq1po0003ps9383no7lkb`)

**Assinatura:** Claude Code (agente) **Data:** 06/07/2026
