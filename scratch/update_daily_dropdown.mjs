import fs from 'fs';

const filePath = 'frontend/src/components/layout/DailyJamDropdown.tsx';
let content = fs.readFileSync(filePath, 'utf8');

const oldSub = `  useEffect(() => {
    fetchJamMembers();
    
    const channel = supabase.channel('profiles-jam')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles' }, () => {
        fetchJamMembers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    }
  }, []);`;

const newSub = `  useEffect(() => {
    fetchJamMembers();
    
    const handleJamUpdated = () => fetchJamMembers();
    window.addEventListener("jamUpdated", handleJamUpdated);

    // Polling suave enquanto o dropdown estiver aberto
    const interval = setInterval(fetchJamMembers, 6000);

    return () => {
      window.removeEventListener("jamUpdated", handleJamUpdated);
      clearInterval(interval);
    };
  }, []);`;

content = content.replace(oldSub, newSub);

// dispatch jamUpdated on save/clear
content = content.replace(
  'window.dispatchEvent(new CustomEvent("showToast", { detail: "Vibe atualizada com sucesso!" }));',
  'window.dispatchEvent(new CustomEvent("showToast", { detail: "Vibe atualizada com sucesso!" }));\n      window.dispatchEvent(new CustomEvent("jamUpdated"));'
);

content = content.replace(
  'setIsEditing(false);',
  'setIsEditing(false);\n      window.dispatchEvent(new CustomEvent("jamUpdated"));'
);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Updated DailyJamDropdown.tsx successfully!');
