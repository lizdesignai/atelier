const fs = require('fs');
let code = fs.readFileSync('src/components/layout/AppSidebar.tsx', 'utf-8');

code = code.replace(/<NavItem href="\/brandbook".*?\/>/g, '');
code = code.replace(/<NavItem href="\/canais".*?\/>/g, '');

const meuProjetoItem = '<NavItem href="/" icon={<Home size={18} strokeWidth={1.5} />} label="Meu Projeto" collapsed={isCollapsed} active={pathname === \'/\'} />';
const curadoriaItem = '<NavItem href="/curadoria" icon={<Compass size={18} strokeWidth={1.5} />} label="Curadoria Visual" collapsed={isCollapsed} active={pathname === \'/curadoria\'} />';

code = code.replace(
  meuProjetoItem,
  meuProjetoItem + '\n                  ' + curadoriaItem
);

fs.writeFileSync('src/components/layout/AppSidebar.tsx', code);
