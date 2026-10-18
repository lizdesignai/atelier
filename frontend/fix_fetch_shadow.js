const fs = require('fs');

const pages = [
  'src/app/projeto/ativar/page.tsx',
  'src/app/projeto/construir/page.tsx',
  'src/app/projeto/descobrir/page.tsx',
  'src/app/projeto/direcionar/page.tsx',
  'src/app/projeto/refinar/page.tsx',
  'src/app/projeto/revelar/page.tsx'
];

for (const file of pages) {
    if (fs.existsSync(file)) {
        let content = fs.readFileSync(file, 'utf8');
        content = content.replace(/const fetch = async \(\) => \{/g, 'const fetchPageData = async () => {');
        content = content.replace(/fetch\(\);\r?\n\s*const interval = setInterval\(fetch, 15000\);/g, 'fetchPageData();\n      const interval = setInterval(fetchPageData, 15000);');
        fs.writeFileSync(file, content);
        console.log('Fixed', file);
    }
}
