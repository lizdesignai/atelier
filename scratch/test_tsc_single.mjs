import ts from '../frontend/node_modules/typescript/lib/typescript.js';
import fs from 'fs';

const filesToTest = [
  'frontend/src/app/admin/fio/page.tsx',
  'frontend/src/app/admin/sintonia/page.tsx',
  'frontend/src/app/api/sintonia/route.ts',
  'frontend/src/app/api/notify/route.ts',
  'frontend/src/lib/NotificationEngine.ts'
];

let allPassed = true;

for (const file of filesToTest) {
  const content = fs.readFileSync(file, 'utf8');
  const result = ts.transpileModule(content, {
    compilerOptions: {
      jsx: ts.JsxEmit.ReactJSX,
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.ESNext
    },
    fileName: file
  });

  if (result.diagnostics && result.diagnostics.length > 0) {
    console.error(`❌ Diagnostics for ${file}:`, result.diagnostics);
    allPassed = false;
  } else {
    console.log(`✓ Syntax & transpile passed: ${file}`);
  }
}

if (allPassed) {
  console.log('\n🎉 ALL FILES COMPILED AND PASSED TRANSPILE CHECK!');
}
