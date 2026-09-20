const fs = require('fs');

const content = fs.readFileSync('src/lib/dashboard-service.ts', 'utf8');
console.log(content.match(/await Promise.all\(\[/g));
console.log(content.match(/await prisma/g));
