const fs = require('fs'); 
let code = fs.readFileSync('src/app/admin/projetos/page.tsx', 'utf-8'); 
code = code.replace(
  "const dataLimite = currentProject.data_limite ? currentProject.data_limite.split('T')[0] : \"\";",
  "const dataLimite = currentProject.data_limite ? new Date(currentProject.data_limite).toISOString().split('T')[0] : \"\";"
);
fs.writeFileSync('src/app/admin/projetos/page.tsx', code);
