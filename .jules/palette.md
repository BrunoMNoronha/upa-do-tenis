## 2024-05-25 — Estado de carregamento inconsistente

**Learning:** Componentes interativos de ação possuíam manipulação manual de texto em conjunto com a propriedade \`disabled\` para expressar estado de submissão (ex: \`"Salvando..."\` ou \`"Carregando..."\`), causando saltos visuais na UI e feedback divergente no sistema, embora a base ofereça a propriedade nativa \`isLoading\` no próprio componente \`<Button>\`.

**Action:** Sempre verificar e utilizar a propriedade nativa \`isLoading\` do design system para padronizar o UX com um spinner claro e manter o \`aria-disabled\`/\`disabled\` corretamente isolado das checagens semânticas ou de regras de negócio adicionais, priorizando consistência (consistency) em componentes repetitivos.
