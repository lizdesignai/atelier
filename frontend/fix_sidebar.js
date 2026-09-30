const fs = require('fs');
let code = fs.readFileSync('src/components/layout/AppSidebar.tsx', 'utf-8');
code = code.replace(/\} label="Brand Lab" collapsed=\{isCollapsed\} active=\{pathname === '\/brandbook'\} \/>/, '');
fs.writeFileSync('src/components/layout/AppSidebar.tsx', code);
