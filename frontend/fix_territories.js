const fs = require('fs'); 
let code = fs.readFileSync('src/components/brand/Territories.tsx', 'utf-8'); 
code = code.replace(/status === 'evaluated'/g, 'isEvaluated');
code = code.replace(/const isEvaluated = isEvaluated;/g, "const isEvaluated = status === 'evaluated';");
fs.writeFileSync('src/components/brand/Territories.tsx', code);
