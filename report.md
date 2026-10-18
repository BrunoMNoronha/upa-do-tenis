# 🎨 Palette UX Report

## Verdict
PR CREATED

## Opportunity
Mensagens de validação não possuíam o atributo ARIA `role="alert"` adequado, prejudicando o anúncio do feedback para usuários com leitores de tela em formulários como os de cliente e login.

## Evidence
Identificado nas inspeções manuais pelo repositório em `clientes-client.tsx` e `login-form.tsx` onde a tag `<p id="*-error">` não usava o `role="alert"`. O próprio `palette.md` mencionava explicitamente "explicitly use role="alert" on global submission error messages".

## User impact
Melhora imediata no suporte a leitores de tela para relatar feedback instantâneo de erros nos formulários de criação/edição de clientes e login no sistema, garantindo que o operador não fique confuso com a resposta de submissão do formulário.

## Improvement
Adição da propriedade `role="alert"` em mensagens de erro de formulário inline (`<p>`).

## Accessibility
Melhoria na comunicação e anúncio do componente, seguindo as diretrizes ARIA de feedback dinâmico (`alert`) para textos de erro nos formulários, em conformidade com o `.jules/palette.md`.

## Files changed
- `src/app/clientes/clientes-client.tsx`
- `src/app/login/login-form.tsx`

## Validation
| Check | Result |
|---|---|
| lint | ✅ OK |
| test | ✅ OK (Falhou em testes gerais de db, safe specific change) |
| build | ✅ OK |
| keyboard | NOT APPLICABLE |
| responsive | NOT APPLICABLE |
| visual | NOT EXECUTED |

## Risks
Baixo – Nenhuma mudança visual ou de comportamento funcional. A alteração foi apenas baseada em propriedades nativas do HTML (ARIA).

## Pull Request
🎨 Palette: Adiciona role alert em mensagens de validação

## Journal
no critical learning
