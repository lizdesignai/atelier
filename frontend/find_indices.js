const fs = require('fs');
const code = fs.readFileSync('src/app/page.tsx', 'utf-8');
const lines = code.split('\n');
const findBlock = (startMatch, endMatch) => {
  const s = lines.findIndex(l => l.includes(startMatch));
  let e = s;
  while (e < lines.length && !lines[e].includes(endMatch)) e++;
  return [s, e];
};
console.log('IDV:', findBlock('const IDV_MOVEMENTS', '];'));
console.log('Header:', findBlock('<header', '</header>'));
console.log('Timeline:', findBlock('{/* TIMELINE DE MOVIMENTOS */}', '</div>'));
console.log('Você Está Aqui:', findBlock('{/* VOCÊ ESTÁ AQUI */}', '{/* TRILHA DA MARCA (TASKS) */}'));
console.log('Trilha tasks:', findBlock('{/* TRILHA DA MARCA (TASKS) */}', '          <div className="lg:col-span-4'));
