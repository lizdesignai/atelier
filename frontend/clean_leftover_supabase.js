const fs = require('fs');

const dnaFile = 'src/components/brand/BrandDNACuradoria.tsx';
let dnaContent = fs.readFileSync(dnaFile, 'utf8');

// The file still has 'import { supabase } from "../../lib/supabase";'
dnaContent = dnaContent.replace('import { supabase } from "../../lib/supabase";', '');
dnaContent = dnaContent.replace('// ESTADOS DO SUPABASE E DADOS', '// ESTADOS E DADOS');

// directionsData query replacement
const badDir = `const { data: directionsData } = await supabase
        .from('design_directions')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });`;

const newDir = `const dirRes = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT * FROM design_directions WHERE project_id = $1 ORDER BY created_at ASC', values: [projectId] }) });
      const dirJson = await dirRes.json();
      const directionsData = dirJson.data || [];`;

dnaContent = dnaContent.replace(badDir, newDir);

// upload replacement
const badUp = `const { error: uploadError } = await supabase.storage.from('moodboard').upload(filePath, file);
      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage.from('moodboard').getPublicUrl(filePath);
      const newUrls = [...clientMoodboard, publicUrlData.publicUrl];`;

const newUp = `const formData = new FormData();
      formData.append('bucket', 'moodboard');
      formData.append('path', filePath);
      formData.append('file', file);
      const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: formData });
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok) throw new Error(uploadData.error?.message);
      
      const newUrls = [...clientMoodboard, uploadData.data.publicUrl];`;

dnaContent = dnaContent.replace(badUp, newUp);

// upsert replacement
const badDbError = `const { error: dbError } = await supabase
        .from('strategic_answers')
        .upsert({ project_id: projectId, moodboard_urls: newUrls }, { onConflict: 'project_id' });`;

const newDbError = `await fetch('/api/db/query', { 
        method: 'POST', 
        body: JSON.stringify({ 
          query: 'INSERT INTO strategic_answers (project_id, moodboard_urls) VALUES ($1, $2) ON CONFLICT (project_id) DO UPDATE SET moodboard_urls = EXCLUDED.moodboard_urls', 
          values: [projectId, JSON.stringify(newUrls)] 
        }) 
      });`;

dnaContent = dnaContent.replace(badDbError, newDbError);

// update directions replacement
const badUpdate = `const { error } = await supabase
        .from('design_directions')
        .update({ 
          score: currentDir.score || 0, 
          feedback: currentDir.feedback || '' 
        })
        .eq('id', currentDir.id);`;

const newUpdate = `const dirUpdateRes = await fetch('/api/db/query', {
        method: 'POST',
        body: JSON.stringify({
          query: 'UPDATE design_directions SET score = $1, feedback = $2 WHERE id = $3',
          values: [currentDir.score || 0, currentDir.feedback || '', currentDir.id]
        })
      });`;

dnaContent = dnaContent.replace(badUpdate, newUpdate);

fs.writeFileSync(dnaFile, dnaContent);
console.log('BrandDNACuradoria cleaned.');

// CURADORIA STAGE CLEANUP
const curaFile = 'src/components/brand/CuradoriaStage.tsx';
let curaContent = fs.readFileSync(curaFile, 'utf8');
curaContent = curaContent.replace('import { supabase } from "../../lib/supabase";\n', '');

// upload replacement
const badLogoUp = `const { error: uploadError } = await supabase.storage.from('briefing_assets').upload(fileName, logoFile);
        
        if (!uploadError) {
          const { data } = supabase.storage.from('briefing_assets').getPublicUrl(fileName);
          finalLogoUrl = data.publicUrl;
        }`;

const newLogoUp = `const formData = new FormData();
        formData.append('bucket', 'briefing_assets');
        formData.append('path', fileName);
        formData.append('file', logoFile);
        const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: formData });
        const uploadData = await uploadRes.json();
        
        if (uploadRes.ok && uploadData.data?.publicUrl) {
          finalLogoUrl = uploadData.data.publicUrl;
        }`;

curaContent = curaContent.replace(badLogoUp, newLogoUp);

// upsert replacement
const badBriefUpsert = `const { error } = await supabase.from('client_briefings').upsert({
        project_id: projectId,
        client_id: clientId,
        answers: finalData,
      });`;

const newBriefUpsert = `const upsertRes = await fetch('/api/db/query', {
        method: 'POST',
        body: JSON.stringify({
          query: 'INSERT INTO client_briefings (project_id, client_id, answers) VALUES ($1, $2, $3) ON CONFLICT (project_id) DO UPDATE SET answers = EXCLUDED.answers',
          values: [projectId, clientId, JSON.stringify(finalData)]
        })
      });
      const error = !(await upsertRes.json()).data;`;

curaContent = curaContent.replace(badBriefUpsert, newBriefUpsert);

fs.writeFileSync(curaFile, curaContent);
console.log('CuradoriaStage cleaned.');
