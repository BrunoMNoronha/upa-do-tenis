# 🎨 Palette UX Report

## Verdict
PR CREATED

## Opportunity
O formulário de formas de pagamento no componente `src/app/formas-pagamento/formas-pagamento-client.tsx` não utilizava o atributo `noValidate`.

## Evidence
Uma busca por `<form` mostrou vários formulários que utilizavam `noValidate` para gerenciar a acessibilidade via `react-hook-form`, exceto este de Formas de Pagamento.

## User impact
O usuário deixará de ver mensagens de validação duplicadas, inconsistentes ou estilisticamente inadequadas (tooltips nativos do navegador) quando falhas de validação ocorrerem.

## Improvement
Adicionado o atributo `noValidate` à tag `<form>` no arquivo `src/app/formas-pagamento/formas-pagamento-client.tsx`.

## Accessibility
Previne a exibição de tooltips HTML5 inacessíveis do navegador, forçando a aplicação a renderizar e anunciar as mensagens customizadas que possuem marcações aria corretas.

## Files changed
- `src/app/formas-pagamento/formas-pagamento-client.tsx`

## Validation
| Check | Result |
|---|---|
| lint | PASS |
| test | PASS |
| build | PASS |
| keyboard | NOT APPLICABLE |
| responsive | NOT APPLICABLE |
| visual | NOT APPLICABLE |

## Risks
Low — presentation/accessibility-only change; business behavior preserved.

## Pull Request
N/A

## Journal
entry added
