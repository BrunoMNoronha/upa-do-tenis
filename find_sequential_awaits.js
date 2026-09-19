const fs = require('fs');
const { execSync } = require('child_process');

const result = execSync('find src -type f -name "*.ts" -o -name "*.tsx"', { encoding: 'utf8' }).trim().split('\n');

for (const file of result) {
  const content = fs.readFileSync(file, 'utf8');
  const lines = content.split('\n');
  let awaitCount = 0;
  let linesAccumulator = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.match(/await prisma/)) {
      awaitCount++;
      linesAccumulator.push(i + 1);
    } else if (line.trim() !== '' && !line.trim().startsWith('//')) {
      if (awaitCount >= 2) {
        // Checking if these are in the same block/function is tricky, but let's just print them
        // if they are close to each other.
        if (linesAccumulator[linesAccumulator.length -1] - linesAccumulator[0] < 10) {
            console.log(`File: ${file} lines: ${linesAccumulator.join(', ')}`);
        }
      }
      if (line.match(/^[}\]]/)) {
          awaitCount = 0;
          linesAccumulator = [];
      } else {
          // just reset if we see some normal code without await prisma?
          // No, they might be interleaved with variable assignments.
          // Let's be less strict.
      }
    }
  }
}
