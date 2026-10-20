import fs from 'fs';

const files = [
  'frontend/src/app/admin/fio/page.tsx',
  'frontend/src/app/api/sintonia/route.ts',
  'frontend/src/app/api/notify/route.ts',
  'frontend/src/lib/NotificationEngine.ts',
  'frontend/src/app/canais/page.tsx',
  'frontend/src/components/layout/DailyJamDropdown.tsx'
];

for (const f of files) {
  if (!fs.existsSync(f)) {
    console.error(`File missing: ${f}`);
  } else {
    const stat = fs.statSync(f);
    console.log(`✓ ${f} (${stat.size} bytes)`);
  }
}
