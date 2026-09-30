const fs = require('fs');
const code = fs.readFileSync('src/app/curadoria/page.tsx', 'utf-8');
const tables = code.match(/from\(['"](.*?)['"]\)/g);
console.log(tables);
