## 2024-05-24 — Form noValidate

**Learning:** Formulários gerenciados por bibliotecas como `react-hook-form` podem causar conflitos ou confusão visual quando o navegador exibe as mensagens de validação nativas. O uso do atributo `noValidate` previne a renderização dessas mensagens, permitindo que a aplicação cuide da exibição dos erros customizados de forma acessível.

**Action:** Sempre verificar se os novos formulários possuem o atributo `noValidate` quando a validação do lado do cliente for provida por bibliotecas do projeto.
