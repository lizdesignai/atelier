const fs = require('fs');

const f1 = 'src/components/layout/AppSidebar.tsx';
let c1 = fs.readFileSync(f1, 'utf8');
if (!c1.includes('Package, Calendar')) {
    c1 = c1.replace('Presentation, Package', 'Presentation, Package, Calendar');
    fs.writeFileSync(f1, c1);
}

const f2 = 'src/components/layout/MobileSidebar.tsx';
let c2 = fs.readFileSync(f2, 'utf8');
c2 = c2.replace(/useRouter\s*,\s*Calendar\s*\}\s*from\s*['"]next\/navigation['"]/, 'useRouter } from "next/navigation"');
if (!c2.includes('Grid, Calendar')) {
    c2 = c2.replace('Briefcase, Grid', 'Briefcase, Grid, Calendar');
}
fs.writeFileSync(f2, c2);
