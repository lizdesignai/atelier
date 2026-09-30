const fs = require('fs'); 
let code = fs.readFileSync('src/app/admin/projetos/page.tsx', 'utf-8'); 

code = code.replace(
  /setDeadlineDate\(currentProject\.data_limite \? currentProject\.data_limite\.split\('T'\)\[0\] : ''\);/g,
  `let dataLimite = "";
      if (currentProject.data_limite) {
        try {
          // Trata tanto string ISO quanto o formato do banco
          const val = currentProject.data_limite;
          if (typeof val === 'string') {
             dataLimite = val.split('T')[0];
          } else if (val instanceof Date) {
             dataLimite = val.toISOString().split('T')[0];
          } else {
             const d = new Date(val);
             if (!isNaN(d.getTime())) dataLimite = d.toISOString().split('T')[0];
          }
        } catch (e) {}
      }
      setDeadlineDate(dataLimite);`
);
fs.writeFileSync('src/app/admin/projetos/page.tsx', code);
