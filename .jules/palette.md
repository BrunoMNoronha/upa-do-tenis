## 2024-05-18 - Added loading state to Button component
**Learning:** Adding a native loading state (`isLoading`) to a core UI component (`Button`) improves feedback across the entire application simultaneously. This is highly effective as it prevents multiple manual, inconsistent loading implementations. Wait, I should make this entry according to the guidelines.
**Action:** Always verify if a core UI component supports native loading states. If not, implementing it centrally adds immense value and consistency, specifically by rendering an SVG spinner while retaining the disabled state.

## 2024-05-18 - Substituição de div por button em elementos interativos
**Learning:** Elementos de interface como opções de Combobox, implementados originalmente com `div` e manipuladores `onClick`, impedem a acessibilidade via teclado e leitores de tela por não serem nativamente interativos ou focalizáveis.
**Action:** Sempre verificar e substituir estruturas de `div` interativas por `<button type="button">`. Ao realizar essa troca, aplicar classes de utilitários como `w-full text-left` para garantir que o comportamento e layout visual permaneçam idênticos ao do elemento de bloco anterior, prevenindo quebras visuais enquanto se garante o suporte a navegação por teclado e semântica de acessibilidade.
