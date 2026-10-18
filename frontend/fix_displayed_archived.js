const fs = require('fs');
const file = 'src/app/admin/jtbd/page.tsx';
let content = fs.readFileSync(file, 'utf8');

let regex = /return t\.status !== 'completed' && t\.status !== 'pending_client_approval';/;
let repl = `return t.status !== 'completed' && t.status !== 'pending_client_approval' && t.status !== 'archived';`;

if (content.match(regex)) {
    content = content.replace(regex, repl);
    fs.writeFileSync(file, content);
    console.log('Fixed displayedTasks archived filter');
}
