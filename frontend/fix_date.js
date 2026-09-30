const fs = require('fs'); 
let code = fs.readFileSync('src/app/admin/projetos/page.tsx', 'utf-8'); 
code = code.replace(
  'setDeadlineDate(currentProject.data_limite || "");',
  "setDeadlineDate(currentProject.data_limite ? currentProject.data_limite.split('T')[0] : '');"
);
fs.writeFileSync('src/app/admin/projetos/page.tsx', code);
