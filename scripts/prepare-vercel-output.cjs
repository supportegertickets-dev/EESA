const fs = require('fs');
const path = require('path');

const projectRoot = path.resolve(__dirname, '..');
const frontendDist = path.join(projectRoot, 'frontend', 'dist');
const rootDist = path.join(projectRoot, 'dist');

if (!fs.existsSync(frontendDist)) {
  console.error('Missing frontend/dist after Vite build.');
  process.exit(1);
}

fs.rmSync(rootDist, { recursive: true, force: true });
fs.mkdirSync(rootDist, { recursive: true });
fs.cpSync(frontendDist, rootDist, { recursive: true });

console.log('Prepared Vercel output at dist/');
