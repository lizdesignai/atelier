const fs = require('fs');

function inspect(file) {
  if (!fs.existsSync(file)) {
    console.log(file, 'does not exist');
    return;
  }
  const content = fs.readFileSync(file, 'utf8');
  console.log(`=== ${file} ===`);
  const lines = content.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    const key = parts[0];
    const val = parts.slice(1).join('=');
    if (key.includes('URL') || key.includes('DOMAIN') || key.includes('HOST')) {
      console.log(`${key}=${val}`);
    } else {
      console.log(`${key}=${val.substring(0, 8)}... (len: ${val.length})`);
    }
  }
}

inspect('frontend/.env.local');
inspect('backend/.env');
