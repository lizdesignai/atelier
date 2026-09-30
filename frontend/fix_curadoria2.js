const fs = require('fs');

let code = fs.readFileSync('src/components/brand/BrandDNACuradoria.tsx', 'utf-8');

code = code.replace(/const \[projectId, setProjectId\] = useState<string \| null>\(null\);\r?\n/g, '');
code = code.replace(/const \[clientProfile, setClientProfile\] = useState<any>\(null\); \/\/ Para usar nas notificações\r?\n/g, '');

fs.writeFileSync('src/components/brand/BrandDNACuradoria.tsx', code);
