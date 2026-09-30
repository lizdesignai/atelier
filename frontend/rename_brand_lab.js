const fs = require('fs'); 
let code = fs.readFileSync('src/app/page.tsx', 'utf-8'); 

code = code.replace(/name: "Brand Lab"/g, 'name: "Brand DNA"');

fs.writeFileSync('src/app/page.tsx', code);
