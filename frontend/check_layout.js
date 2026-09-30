const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');
const s = code.indexOf('CONTEÚDO PRINCIPAL');
console.log(code.substring(s, s + 1000));
