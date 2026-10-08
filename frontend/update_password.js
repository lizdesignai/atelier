const fs = require('fs');

let content = fs.readFileSync('src/app/admin/clientes/page.tsx', 'utf8');

// Replace the hardcoded password generation in GerarAcesso action
const targetMatch = /const inviteRes = await fetch\('\/api\/auth\/invite', \{\s*method: 'POST',\s*headers: \{ 'Content-Type': 'application\/json' \},\s*body: JSON\.stringify\(\{\s*nome,\s*email,\s*empresa,\s*role: 'client',\s*skipProjectCreation: true,\s*allowExisting: true\s*\}\)\s*\}\);/;

const replacement = `const generatedPassword = Array.from(crypto.getRandomValues(new Uint32Array(8))).map(x => 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$'[x % 64]).join('');
  
          const inviteRes = await fetch('/api/auth/invite', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              nome,
              email,
              empresa,
              password: generatedPassword,
              role: 'client',
              skipProjectCreation: true,
              allowExisting: true
            })
          });`;

content = content.replace(targetMatch, replacement);

// Replace the setAccessPopupData hardcoded string
const setAccessMatch = /setAccessPopupData\(\{\s*email,\s*pass:\s*"Atelier2026!",\s*nome\s*\}\);/;
const setAccessReplacement = `setAccessPopupData({ email, pass: generatedPassword, nome });`;

content = content.replace(setAccessMatch, setAccessReplacement);

fs.writeFileSync('src/app/admin/clientes/page.tsx', content);
console.log('Random password generation updated successfully!');
