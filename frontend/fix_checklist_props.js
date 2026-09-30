const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(
  /onToggle=\{handleToggleChecklistItem\}/,
  `onToggleItem={handleToggleChecklistItem} isClient={true}`
);

fs.writeFileSync('src/app/page.tsx', code);
