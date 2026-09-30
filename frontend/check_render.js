const fs = require('fs');
const code = fs.readFileSync('src/app/page.tsx', 'utf-8');
const start = code.indexOf('return (\n    <div className="flex flex-col');
console.log(code.substring(start, start + 3000));
