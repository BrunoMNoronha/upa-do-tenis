const fs = require('fs');

const path = require('path');

function findSequentialAwaits(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      findSequentialAwaits(fullPath);
    } else if (fullPath.endsWith('.ts') && !fullPath.includes('.test.')) {
      const content = fs.readFileSync(fullPath, 'utf8');

      const lines = content.split('\n');
      let sequentialAwaits = [];
      let inBlock = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.includes('await prisma.')) {
           if (!inBlock) {
             inBlock = true;
             sequentialAwaits = [i];
           } else {
             sequentialAwaits.push(i);
           }
        } else if (line.trim() !== '' && !line.startsWith('//') && inBlock) {
           // allow some non-await lines in between, but if it's too many or another await happens...
        }
      }
    }
  }
}

findSequentialAwaits('src/lib');
