const fs = require('fs'); 
let code = fs.readFileSync('src/app/admin/projetos/page.tsx', 'utf-8'); 
code = code.replace(
  '  const handleDownloadCuradoriaPDF = async () => {', 
  `  const handleGenerateIDVTasks = async () => {
    if (!activeProjectId) return;
    setIsGeneratingIDVTasks(true);
    showToast("AIDV: Gerando Trilha da Marca...");
    try {
      const res = await fetch(\`/api/projects/\${activeProjectId}/generate-idv-tasks\`, { method: 'POST' });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      
      showToast("Trilha da Marca gerada com sucesso! As tarefas foram populadas.");
      refreshGlobalData();
    } catch (e) {
      showToast(e.message || "Erro ao gerar tarefas da trilha.");
    } finally {
      setIsGeneratingIDVTasks(false);
    }
  };

  const handleDownloadCuradoriaPDF = async () => {`
); 
fs.writeFileSync('src/app/admin/projetos/page.tsx', code);
