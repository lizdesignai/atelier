const fs = require('fs'); 
let code = fs.readFileSync('src/components/brand/Territories.tsx', 'utf-8'); 
code = code.replace(/isEvaluated/g, "status === 'evaluated'");
fs.writeFileSync('src/components/brand/Territories.tsx', code);
