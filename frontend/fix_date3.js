const fs = require('fs'); 
let code = fs.readFileSync('src/app/admin/projetos/page.tsx', 'utf-8'); 

const target = "const dataLimite = currentProject.data_limite ? currentProject.data_limite.split('T')[0] : \"\";";
const replacement = `let dataLimite = "";
      if (currentProject.data_limite) {
        try {
          const d = new Date(currentProject.data_limite);
          if (!isNaN(d.getTime())) {
            dataLimite = d.toISOString().split('T')[0];
          }
        } catch (e) {}
      }`;

code = code.replace(target, replacement);
fs.writeFileSync('src/app/admin/projetos/page.tsx', code);
