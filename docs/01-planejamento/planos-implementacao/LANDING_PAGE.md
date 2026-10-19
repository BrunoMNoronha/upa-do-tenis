# Landing page do produto — TechLab+ Sapataria

Decisão do usuário em 2026-10-19: apresentar o sistema como produto comercial para outras sapatarias e assistências de calçados, em uma landing pública na raiz do site (`/`), com identidade visual própria e preço derivado de Análise de Pontos de Função (APF).

## Rota e segurança

- `/` entra em `PAGINAS_PUBLICAS` (`src/middleware.ts`). O casamento é exato: `/dashboard` e qualquer outra rota continuam privadas.
- A página (`src/app/page.tsx`) não importa `auth-server`, `prisma`, `dados-cache` nem `dados-empresa`. Todo o conteúdo vem de `src/config/landing.ts` (dados do produto e contatos) e `src/lib/landing-precos.ts` (preço). `src/app/paginas-privadas.test.ts` garante isso.
- O geo-bloqueio (só Brasil) continua valendo para a landing, como para as demais rotas públicas.
- Quem já tem sessão também vê a landing; o acesso ao sistema é pelo botão "Entrar" (`/login` → `/dashboard`).
- O painel inicial do MVP que estava em `/` foi removido: nenhum link do app apontava para ele.

## Identidade visual

Separada da identidade da loja (`globals.css`), definida como tokens `--lp-*` no root da página:

| Token | Valor | Uso |
|---|---|---|
| `--lp-bg` | `#F4F4F1` | fundo |
| `--lp-ink` | `#17191C` | texto e bloco escuro |
| `--lp-muted` | `#4B5057` | texto secundário (≥ 4,5:1 sobre o fundo) |
| `--lp-accent` | `#1E6B4E` | botões primários, destaques |
| `--lp-accent-2` | `#C9731B` | marcadores, sempre com texto escuro |

Tipografia: Bricolage Grotesque (títulos), IBM Plex Sans (texto) e IBM Plex Mono (códigos e valores), carregadas por `<link>` do Google Fonts com `display=swap` só nesta página. `next/font/google` não é usado porque foi removido no #259 por quebrar o build. `font-size-adjust: from-font` reduz o salto visual entre a fonte de sistema e a fonte carregada.

Sem imagens externas: os mocks de tela (painel, catálogo, insight) são HTML, marcados como "Dados de exemplo".

## Conteúdo

Só funcionalidades existentes no sistema. Não afirmar: multi-loja, modo offline/PWA, perfis e permissões (o sistema registra quem fez cada ação, mas não tem papéis), geração de PDF (o recibo é impressão do navegador), métricas de clientes.

Seções: navegação; herói com mock do painel; faixa "criado dentro de uma sapataria em Brasília"; fluxo em 4 passos (foto no celular → link de acompanhamento → aviso de pronto no WhatsApp → entrega com pedido de avaliação); 8 funcionalidades; catálogo público; insights com IA; controle e segurança; preço com a contagem APF; perguntas frequentes; chamada final; rodapé.

## Contagem APF (IFPUG, não ajustada)

Inventário feito sobre `prisma/schema.prisma` (27 models), os 54 route handlers em `src/app/api/**` e as 27 páginas em `src/app/**`.

### Funções de dados

| Arquivo lógico interno | RETs | Complexidade | PF |
|---|---|---|---|
| Ordem de Serviço (OS, item, foto, serviço do item, insumo do item, histórico) | 6 | alta | 15 |
| Configuração (dados da empresa, link de avaliação, chave Claude) | 3 | média | 10 |
| Venda (venda, item) | 2 | baixa | 7 |
| Atendimento Rápido (atendimento, item) | 2 | baixa | 7 |
| Pagamento (pagamento, estorno) | 2 | baixa | 7 |
| Caixa (caixa, movimentação) | 2 | baixa | 7 |
| Conversa do Assistente (conversa, mensagem) | 2 | baixa | 7 |
| Movimentação de estoque de produto | 1 | baixa | 7 |
| Movimentação de estoque de insumo | 1 | baixa | 7 |
| Cliente, Serviço, Produto, Insumo, Forma de Pagamento, Usuário, Análise de Insight (7 × 7) | 1 cada | baixa | 49 |
| **Total ILF** | | | **123** |

Arquivos de interface externa: nenhum. Claude API, reCAPTCHA, Vercel Blob e links `wa.me` são interfaces de processamento ou armazenamento, não arquivos lidos pelo sistema. `RegistroRateLimit` é técnico e não conta.

### Funções transacionais

| Grupo | Entradas externas (EI) | Saídas externas (EO) | Consultas externas (EQ) |
|---|---|---|---|
| Autenticação | login (média), logout (baixa) | | |
| Clientes, serviços, formas de pagamento, usuários | criar, editar, ativar/inativar, excluir ou trocar senha (4 cada, baixas) | | lista (clientes média; demais baixas) |
| Produtos | criar com estoque inicial (média), editar, ativar/inativar, publicar no catálogo, excluir, enviar e remover imagem (baixas) | | lista (média), extrato de estoque (média) |
| Insumos | criar, editar, ativar/inativar, excluir (baixas); entrada, saída e ajuste manual (médias) | | lista (média), extrato (média) |
| Ordens de serviço | criar (alta), editar com recálculo (alta), excluir (baixa), mudar status (média), cancelar (média), favoritar (baixa), aplicar insumo (alta), receber pagamento (alta), estornar pagamento (alta), foto legada enviar/remover e galeria enviar/excluir (baixas) | estatísticas da fila (média) | lista com filtros (alta), detalhe (alta), opções de cadastro, insumos aplicados, histórico de pagamentos, galeria (baixas), busca para foto no celular (média) |
| Atendimento rápido | registrar (alta), estornar (alta) | | lista (média) |
| Vendas de balcão | registrar (alta), cancelar (alta) | recibo (média) | lista (média), detalhe (média) |
| Caixa | abrir (média), movimentação manual (média), fechar (alta) | caixa atual com resumo (média), detalhe com totais (média) | histórico (média) |
| Dashboard | | KPIs (alta); recebimentos por dia, situação financeira, serviços mais executados, insumos mais usados, alertas de estoque (médias); fila de ordens, alerta de caixa (baixas) | |
| Relatórios | | financeiro de OS (alta), estoque (alta) | |
| Insights e assistente | nova conversa (média), enviar pergunta (média), excluir conversa (baixa) | gerar análise (alta) | histórico de análises, ver análise, listar e abrir conversas (baixas) |
| Configurações | salvar link de avaliação, salvar chave Claude, remover chave (baixas); salvar dados da empresa (média) | | ler link, dados da empresa e status da chave (baixas), testar chave (baixa) |
| WhatsApp | | mensagens de acompanhamento, conclusão e avaliação (baixas), pedido do catálogo (média) | |
| Páginas públicas | | | catálogo (média), acompanhamento por token (média) |
| **Totais** | **62 EI = 219 PF** | **20 EO = 98 PF** | **28 EQ = 105 PF** |

Pesos IFPUG: EI 3/4/6, EO 4/5/7, EQ 3/4/6, ILF 7/10/15.

**Total: 545 PF** (123 + 0 + 219 + 98 + 105). Para referência, `src/` tem cerca de 33,7 mil linhas de código fora dos testes, ou ~62 linhas por PF, dentro do esperado para TypeScript.

## Premissas comerciais

Constantes em `src/lib/landing-precos.ts`, cobertas por `landing-precos.test.ts`:

| Premissa | Valor | Observação |
|---|---|---|
| Valor por ponto de função | R$ 500 | escolhido pelo usuário (faixa de entrada no mercado) |
| Valor de desenvolvimento | R$ 272.500 | 545 × 500 |
| Lojas-alvo para amortização | 20 | escolhido pelo usuário |
| Implantação por loja | **R$ 13.700** | 272.500 ÷ 20 = 13.625, arredondado para cima em R$ 100 |
| Infraestrutura por loja/mês | R$ 200 | estimativa (hospedagem, banco, armazenamento rateados); confirmar |
| Manutenção evolutiva | 15% a.a. do desenvolvimento ÷ 12 ÷ 20 lojas = R$ 170,31/mês | referência usual de mercado |
| Suporte por loja/mês | R$ 100 | estimativa (≈ 2 h/mês); confirmar |
| Margem | 30% sobre o preço | preço = custo ÷ 0,70 |
| Assinatura por loja | **R$ 680/mês** | (200 + 170,31 + 100) ÷ 0,70 = 671,88, arredondado para cima em R$ 10 |

Alterar qualquer premissa no módulo atualiza a landing e exige ajustar o teste.

## Pendências

- Preencher `whatsappUrl`, `email`, `razaoSocial` e `cnpj` em `src/config/landing.ts`. Enquanto vazios, os botões e textos correspondentes não aparecem.
- Logo, favicon, imagem Open Graph, `robots.txt` e `sitemap`: não existem assets; rotas sem extensão passariam pelo middleware e ficariam privadas, então exigem ajuste no matcher ou arquivos estáticos em `public/`.
- Confirmar as estimativas de infraestrutura e suporte com os custos reais da operação.
