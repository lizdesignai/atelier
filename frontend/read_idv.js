const fs = require('fs');

const pages = [
  'src/app/projeto/ativar/page.tsx',
  'src/app/projeto/descobrir/page.tsx',
  'src/app/projeto/construir/page.tsx',
  'src/app/projeto/direcionar/page.tsx',
  'src/app/projeto/refinar/page.tsx',
  'src/app/projeto/revelar/page.tsx'
];

pages.forEach(page => {
  console.log(`\n\n=== ${page} ===`);
  console.log(fs.readFileSync(page, 'utf8'));
});
