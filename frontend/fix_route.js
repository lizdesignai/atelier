const fs = require('fs');
let code = fs.readFileSync('src/app/api/db/query/route.ts', 'utf-8');

code = code.replace(
  /'brand_snapshots', 'territory_evaluations', 'activation_checklists'/,
  "'brand_snapshots', 'territory_evaluations', 'activation_checklists', 'activation_checklist', 'client_briefings', 'studio_diary'"
);

fs.writeFileSync('src/app/api/db/query/route.ts', code);
