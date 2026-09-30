const fs = require('fs');
let code = fs.readFileSync('src/components/layout/AppSidebar.tsx', 'utf-8');
code = code.replace(/<NavItem href="\/curadoria" icon=\{<Compass size=\{18\} strokeWidth=\{1\.5\} \/>\} label="Curadoria Visual" collapsed=\{isCollapsed\} active=\{pathname === '\/curadoria'\} \/>\r?\n?/g, '');
fs.writeFileSync('src/components/layout/AppSidebar.tsx', code);
