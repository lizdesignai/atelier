const fs = require('fs');

function addIcon(file) {
    let content = fs.readFileSync(file, 'utf8');
    let importRegex = /import\s*\{([\s\S]*?)\}\s*from\s*['"]lucide-react['"];/;
    let match = content.match(importRegex);
    if (match) {
        if (!match[1].includes('Calendar')) {
            let newImport = match[0].replace('}', ', Calendar }');
            content = content.replace(match[0], newImport);
            fs.writeFileSync(file, content);
            console.log('Added Calendar to', file);
        } else {
            console.log('Calendar already exists in', file);
        }
    }
}

addIcon('src/components/layout/AppSidebar.tsx');
addIcon('src/components/layout/MobileSidebar.tsx');
