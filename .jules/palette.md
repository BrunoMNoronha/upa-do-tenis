## 2025-02-12 — Contexto Acessível em Botões Repetidos (Listas/Carrinhos)

**Learning:** Quando botões de ação idênticos (como "Diminuir quantidade" e "Aumentar quantidade") se repetem em listas ou itens de carrinho, a ausência de um contexto explícito no `aria-label` pode tornar a navegação por leitores de tela confusa, pois o usuário não sabe a qual item a ação se aplica sem ler o contexto adjacente.

**Action:** Sempre adicione dinamicamente o nome ou identificador do item ao `aria-label` de botões de controle de quantidade, edição, ou remoção repetidos. Exemplo: Substituir `aria-label="Diminuir quantidade"` por `aria-label={\`Diminuir quantidade de \${item.nome}\`}`.
