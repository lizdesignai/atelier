const fs = require('fs');
let code = fs.readFileSync('src/components/layout/AppSidebar.tsx', 'utf-8');

// I will just remove the whole `{clientServiceType !== "O Mapa" && ...` block for Canais.
// Wait, is it `clientServiceType !== "O Mapa"` only wrapping Canais? Let's check:
const canaisRegex = /\{clientServiceType !== "O Mapa" && \([\s\S]*?\} label="Canais"[^\n]+\n\s*\)\}/;
code = code.replace(canaisRegex, '');

// Also let me just make sure `} label="Canais"` is removed if the above regex fails
code = code.replace(/\} label="Canais" collapsed=\{isCollapsed\} active=\{pathname === '\/canais'\} \/>/, '');

fs.writeFileSync('src/components/layout/AppSidebar.tsx', code);
