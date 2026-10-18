const fs = require('fs');
const files = [
  'frontend/src/app/admin/analytics/views/ProjectsManager.tsx',
  'frontend/src/app/admin/analytics/views/OverviewDashboard.tsx',
  'frontend/src/app/admin/analytics/page.tsx',
  'frontend/src/app/admin/clientes/page.tsx'
];

for (const file of files) {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf8');
    fs.writeFileSync(file, content.replace(/\r\n/g, '\n'), 'utf8');
    console.log(`Normalized LF: ${file}`);
  }
}
