const fs = require('fs');
let content = fs.readFileSync('frontend/src/app/admin/jtbd/components/TaskCard.tsx', 'utf8');

const oldStr = "'rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl ` + (hasSpecializedManager ? 'max-w-4xl' : 'max-w-lg') + ` border border-white/20 max-h-[85vh] sm:max-h-[90vh] h-auto my-auto'";
const newStr = "`rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl ${hasSpecializedManager ? 'max-w-4xl' : 'max-w-lg'} border border-white/20 max-h-[85vh] sm:max-h-[90vh] h-auto my-auto`";

if (content.includes(oldStr)) {
  content = content.replace(oldStr, newStr);
  fs.writeFileSync('frontend/src/app/admin/jtbd/components/TaskCard.tsx', content, 'utf8');
  console.log('Successfully fixed modal class in TaskCard.tsx');
} else {
  console.log('oldStr not found, checking current state...');
}
