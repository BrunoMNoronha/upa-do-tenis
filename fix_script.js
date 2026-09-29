const fs = require('fs');
let content = fs.readFileSync('src/app/api/atendimentos-rapidos/route.ts', 'utf8');
content = content.replace(
  'const usuario = await obterUsuarioSessaoDaRequest(req);',
  'const usuario = (await obterUsuarioSessaoDaRequest(req))!;'
);
fs.writeFileSync('src/app/api/atendimentos-rapidos/route.ts', content);
