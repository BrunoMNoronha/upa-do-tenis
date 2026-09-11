import * as fs from 'fs';

let content = fs.readFileSync('src/lib/carrinho.ts', 'utf-8');

// totalCarrinho
content = content.replace(
  /export function totalCarrinho\(itens: ItemCarrinho\[\]\): number {\n  return arredondar\(itens\.reduce\(\(acc, i\) => acc \+ subtotalItem\(i\), 0\)\);\n}/g,
  `export function totalCarrinho(itens: ItemCarrinho[]): number {\n  let total = 0;\n  for (const i of itens) {\n    total += subtotalItem(i);\n  }\n  return arredondar(total);\n}`
);

fs.writeFileSync('temp_carrinho.ts', content, 'utf-8');
