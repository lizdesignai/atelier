const fs = require('fs'); 
let code = fs.readFileSync('src/app/admin/analytics/idv/page.tsx', 'utf-8'); 
if (!code.includes('"use client"')) {
  code = '"use client";\n' + code;
  fs.writeFileSync('src/app/admin/analytics/idv/page.tsx', code);
}
