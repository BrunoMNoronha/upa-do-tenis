import * as fs from 'fs';

let content = fs.readFileSync('src/lib/vendas.ts', 'utf-8');

content = content.replace(
  /    const valorTotal = arredondarMoeda\(\n      linhas\.reduce\(\(acc, linha\) => acc \+ linha\.precoTotal, 0\),\n    \);/g,
  `    let acc = 0;\n    for (const linha of linhas) {\n      acc += linha.precoTotal;\n    }\n    const valorTotal = arredondarMoeda(acc);`
);

fs.writeFileSync('temp_vendas.ts', content, 'utf-8');
