const fs = require('fs');

const pages = [
  'src/app/projeto/ativar/page.tsx',
  'src/app/projeto/descobrir/page.tsx',
  'src/app/projeto/construir/page.tsx',
  'src/app/projeto/direcionar/page.tsx',
  'src/app/projeto/refinar/page.tsx',
  'src/app/projeto/revelar/page.tsx'
];

pages.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Standardize the main container layout wrapper
  // from: <div className="flex flex-col h-[calc(100vh-80px)] max-w-[1400px] mx-auto relative z-10 pb-6 gap-6 overflow-y-auto custom-scrollbar">
  // or: <div className="flex flex-col h-[calc(100vh-80px)] w-full px-6 lg:px-12 relative z-10 pb-6 gap-6 overflow-y-auto custom-scrollbar">
  // to: <div className="flex flex-col h-[calc(100vh-80px)] w-full max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 relative z-10 pb-6 gap-6 overflow-y-auto custom-scrollbar">

  content = content.replace(/className="flex flex-col h-\[calc\(100vh-80px\)\] max-w-\[1400px\] mx-auto relative z-10 pb-6 gap-6 overflow-y-auto custom-scrollbar"/g, 
    'className="flex flex-col h-[calc(100vh-80px)] w-full max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 relative z-10 pb-12 gap-6 overflow-y-auto custom-scrollbar"');
  
  content = content.replace(/className="flex flex-col h-\[calc\(100vh-80px\)\] w-full px-6 lg:px-12 relative z-10 pb-6 gap-6 overflow-y-auto custom-scrollbar"/g, 
    'className="flex flex-col h-[calc(100vh-80px)] w-full max-w-[1400px] mx-auto px-5 md:px-8 lg:px-12 relative z-10 pb-12 gap-6 overflow-y-auto custom-scrollbar"');
  
  // RefinarPage Header adjustments
  content = content.replace(/glass-panel p-8 rounded-\[2rem\] flex items-center gap-4 text-\[var\(--color-atelier-grafite\)\] mb-4/g,
    'glass-panel p-6 sm:p-8 rounded-[2rem] flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4 text-[var(--color-atelier-grafite)] mb-4');
  
  // ConstruirPage & RefinarPage Task Cards adjustments
  content = content.replace(/glass-panel p-6 rounded-\[2rem\] flex items-center justify-between/g,
    'glass-panel p-5 sm:p-6 rounded-[2rem] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4');

  // Loading indicator screen centering adjustments (ensure px-6 so it doesn't touch edges on mobile)
  content = content.replace(/<div className="p-8 text-\[var\(--color-atelier-grafite\)\]">Nenhum projeto ativo/g,
    '<div className="p-6 md:p-8 text-[var(--color-atelier-grafite)]">Nenhum projeto ativo');

  fs.writeFileSync(file, content);
  console.log(`Updated layout in ${file}`);
});
