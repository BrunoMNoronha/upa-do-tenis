# Homologação do cache seletivo de dados

## Contrato e preparação

O cache cobre serviços ativos, formas de pagamento operacionais e as configurações `dadosEmpresa`/`linkAvaliacaoGoogle`. Clientes, autenticação, caixa, estoque, pagamentos, OS, estatísticas e listagens de gestão permanecem com consulta atual. Todas as entradas usam `revalidate: 300`, com invalidação por recurso após gravações confirmadas da aplicação.

`CACHE_DADOS_ENABLED` é desligado por padrão. A flag `true` habilita somente leituras; as escritas continuam invalidando mesmo quando a flag está desligada. Os GETs privados preservam `Cache-Control: private, no-store`. Scripts externos não invalidam o cache Next; 300s é intervalo de revalidação, não prazo rígido de atualização.

Utilize exclusivamente `.env.test` com PostgreSQL local e um nome de banco contendo o segmento `test`, separado de desenvolvimento/produção. A suíte completa apaga registros de teste. O harness HTTP não cria schema nem executa migrations: exige banco com as migrations existentes já aplicadas e um build de produção atual. Não execute suíte e harness simultaneamente. Não use dados reais.

## Validação automatizada

```powershell
pnpm run lint
pnpm run typecheck
pnpm run test
pnpm run build
pnpm exec node scripts/verificar-cache-dados.mjs
```

O harness carrega `.env.test`, valida o destino antes de escrever, cria fixtures com identificação única e inicia seu próprio `pnpm run start` em porta livre, com cache habilitado. Um preload temporário conta operações Prisma no servidor, sem SQL, argumentos, dados, cookies ou credenciais. A saída JSON contém cenários e contagens. Ao terminar, remove somente suas fixtures, restaura as duas configurações originais e encerra somente a árvore de processos que criou.

Aceite HTTP:

- Serviços: uma consulta no cache frio e nenhuma consulta do catálogo no quente; autenticação consulta usuário a cada requisição. JSON, preços e datas idênticos nos dois estados.
- POST/PATCH/DELETE de serviços e formas: próximas leituras refletem edição, inativação, reativação e exclusão; erro de validação não invalida catálogo.
- Formas: cache frio/quente comprovado na página `/caixa`, mantendo a autorização específica para fechamento.
- Nova OS: cada GET de opções consulta clientes; serviços aquecidos são reutilizados.
- Empresa: PUT altera o GET e metadados do login; leituras aquecidas não repetem a consulta institucional.
- Link Google: alteração e limpeza para `null` refletem no GET utilizado após entrega.
- Sem sessão ou com usuário desativado: APIs negam acesso mesmo com cache aquecido.

Os testes unitários cobrem isolamento de namespace/ambiente, serialização, fallback, invalidação após persistência, ausência de invalidação em 400/401/404/409/falha SQL e sucesso preservado quando a invalidação falha. A prova HTTP exercita o Data Cache real; mocks não substituem essa evidência.

## Homologação no navegador e Preview

1. Habilitar `CACHE_DADOS_ENABLED=true` somente no ambiente alvo de homologação e iniciar/publicar o build validado.
2. Editar preço/nome de serviço, inativar, reativar e excluir uma fixture sem vínculos. Abrir nova OS e atendimento rápido após cada mudança; conferir opções e valores. O servidor deve rejeitar serviços inativos mesmo em formulário aberto anteriormente.
3. Repetir com forma de pagamento, conferindo seletores de caixa, balcão, vendas e detalhe da OS. Confirmar que a gestão continua identificando movimento financeiro atual e bloqueando troca indevida de tipo.
4. Salvar nome da empresa; conferir formulário, shell, nova navegação, título e login. `router.refresh()` deve aplicar os dados persistidos no shell de Configurações sem recarregamento manual.
5. Alterar o link Google, confirmar uma entrega e conferir a URL usada na mensagem; limpar o link e repetir, verificando ausência do link.
6. Encerrar sessão e desativar um usuário de teste; conferir acesso negado com os catálogos previamente aquecidos.
7. Registrar ambiente, revisão, evidências e resultado de aceite. Homologação local não comprova comportamento do provedor nem autoriza ativação em Production.

## Ativação e recuperação

Manter Production desligado até aceite de Preview. Para recuperação, definir `CACHE_DADOS_ENABLED=false` e reiniciar/publicar conforme o provedor: as leituras voltam ao banco e as invalidações permanecem. A flag não representa sincronização entre abas nem atualização de formulários já abertos; nova leitura/refresh consulta os dados correspondentes.

Após gravações externas, aceitar convergência pela revalidação temporal escolhida. Se houver erro de atualização, consultar os logs e desligar a flag para exigir leitura direta. Não presumir que um novo deploy elimina entradas persistidas do Data Cache. O cache nativo cobre Vercel e uma instância standalone; infraestrutura própria com múltiplas instâncias não é homologada por este roteiro.

## Evidência local — 2026-10-05

Na revisão atualizada com a `main` de `bc72287`, `pnpm run lint`, `pnpm run typecheck`, `pnpm run test` e `pnpm run build` passaram: 1.737 testes em 153 arquivos. A verificação final do middleware também passou nos seus 16 testes. O build utilizou Next.js 15.5.25, com limite local de memória e um worker (`NODE_OPTIONS`/`CIRCLE_NODE_TOTAL`), sem mudar a configuração versionada.

Após o build, `pnpm exec node scripts/verificar-cache-dados.mjs` iniciou `pnpm run start` e passou nos 50 cenários HTTP, com cache habilitado somente nesse processo e banco local isolado. As contagens abaixo observam apenas a consulta do recurso indicado:

| Recurso | Leitura fria | Leitura quente |
|---|---:|---:|
| Serviços ativos | 1 | 0 |
| Formas operacionais | 1 | 0 |
| Dados da empresa | 1 | 0 |
| Link Google, incluindo `null` | 1 | 0 |

Autenticação continuou consultando o usuário nas requisições autenticadas e clientes foram consultados em ambas as leituras das opções de OS. Gravações confirmadas atualizaram a próxima leitura; ausência de sessão e usuário desativado retornaram 401 com cache aquecido. Um serviço inativado diretamente no banco permaneceu no catálogo temporal, mas a criação de OS o rejeitou com consulta atual do validador, sem gravar uma OS. O runner restaurou as configurações e removeu suas fixtures.

Esta evidência é de execução local e HTTP. A interação visual de Configurações, a entrega real de OS e o aceite em Preview continuam pendentes do roteiro acima. Production permanece sem ativação nesta entrega.
