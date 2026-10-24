# 🎨 Palette UX Report

## Verdict
PR CREATED

## Opportunity
O formulário de movimentação de insumo não era claro em seus estados de validação quando lido por um Screen Reader. Isso impossibilitava que o usuário identificasse qual input estaria incorreto ou a mensagem gerada, sem a vinculação correta entre labels e suas caixas de preenchimento, e do atributo nativo `noValidate` para dar prioridade de lidar com os erros para o React Hook Form.

## Evidence
Formulário sem indicação de ids que conectassem a estrutura de acessibilidade na página localizada em `src/app/insumos/[id]/movimentacoes/movimentacoes-client.tsx`. Além da ausência de atributos `aria-invalid`, e `aria-describedby` que estivessem associados a elementos de error `span` que tivessem também o `role="alert"`.

## User impact
Usuários portadores de deficiência visual agora terão feedbacks completos quando as suas ações no input ou validação se derem início ou falharem. O screen reader conseguirá anunciar essas alterações dinâmicas e onde elas ocorreram com muito mais assertividade.

## Improvement
Adição de atributos `id` em todos os inputs ou selections e sua vinculação os Labels correspondentes da estrutura React/Next com `htmlFor`. Adição das tags nativas de aria (`aria-invalid` e `aria-describedby` quando o formulário apresentasse a presença de erro em seu registro do React Hook Form). Adição do `role="alert"` em todas as mensagens de erro nos elementos `<span/>`. Adição da regra `noValidate` no `<form>`.

## Accessibility
Forte melhoria, já que a alteração possibilita usuários a conseguirem ouvir as mensagens de validação e se situarem nos campos específicos que erraram por não contarem com esse anúncio através do React Hook Form, o que foi resolvido ao atrelar os campos à ARIA, ids, htmlFors e atributos nativos desabilitados para previnir choques de feedback.

## Files changed
- src/app/insumos/[id]/movimentacoes/movimentacoes-client.tsx

## Validation
| Check | Result |
|---|---|
| lint | SUCCESS |
| test | SUCCESS |
| build | SUCCESS |
| keyboard | NOT EXECUTED |
| responsive | NOT EXECUTED |
| visual | NOT EXECUTED |


## Risks
Low — presentation/accessibility-only change; business behavior preserved.

## Pull Request
Submetido.

## Journal
[no critical learning]
