const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');
code = code.replace(/activeProject\.stage/g, 'activeProject.idv_phase');
fs.writeFileSync('src/app/page.tsx', code);
