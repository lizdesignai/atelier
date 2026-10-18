const fs = require('fs');

function replaceAll(str, find, replace) {
    return str.split(find).join(replace);
}

function migrateAdminPage() {
    let file = 'src/app/admin/page.tsx';
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/import \{ supabase \} from "\.\.\/\.\.\/lib\/supabase";\s*/g, '');

    content = content.replace(
        "supabase.from('prospect_meetings').select('*, leads(nome, instagram, telefone)').order('meeting_date', { ascending: true })",
        "fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT pm.*, l.nome, l.instagram, l.telefone FROM prospect_meetings pm LEFT JOIN leads l ON pm.lead_id = l.id ORDER BY meeting_date ASC' }) }).then(r => r.json())"
    );

    content = content.replace(
        "supabase.from('profiles').select('email').eq('role', 'cliente')",
        "fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT email FROM profiles WHERE role = $1', values: ['cliente'] }) }).then(r => r.json())"
    );

    content = content.replace(
        "const { error } = await supabase.from('prospect_meetings').insert({",
        `const res = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'INSERT INTO prospect_meetings (lead_id, title, meeting_date, notes) VALUES ($1, $2, $3, $4)', values: [meetingForm.leadId, meetingForm.title, new Date(meetingForm.date).toISOString(), meetingForm.notes] }) });
      const error = !(await res.json()).data;
      if (false) {`
    );

    fs.writeFileSync(file, content);
}

function migrateProjetosPage() {
    let file = 'src/app/admin/projetos/page.tsx';
    let content = fs.readFileSync(file, 'utf8');
    content = content.replace(/import \{ supabase \} from "\.\.\/\.\.\/\.\.\/lib\/supabase";\s*/g, '');

    // 1. agencies
    content = content.replace(
        "const { data } = await supabase.from('agencies').select('*').eq('status', 'active');",
        "const res = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT * FROM agencies WHERE status = $1', values: ['active'] }) }); const { data } = await res.json();"
    );

    // 2. project_assets
    content = content.replace(
        "const { data: assetsData, error: assetsError } = await supabase\n            .from('project_assets')\n            .select('*')\n            .eq('project_id', activeProjectId)\n            .order('created_at', { ascending: false });",
        "const assetsRes = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT * FROM project_assets WHERE project_id = $1 ORDER BY created_at DESC', values: [activeProjectId] }) }); const { data: assetsData, error: assetsError } = await assetsRes.json();"
    );

    // 3. client_briefings
    content = content.replace(
        "const { data: briefingData, error: briefingError } = await supabase\n            .from('client_briefings')\n            .select('*')\n            .eq('project_id', activeProjectId)\n            .maybeSingle();",
        "const briefingRes = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT * FROM client_briefings WHERE project_id = $1 LIMIT 1', values: [activeProjectId] }) }); const bJson = await briefingRes.json(); const briefingData = bJson.data?.[0]; const briefingError = bJson.error;"
    );

    // 4. subclients
    content = content.replace(
        "const { data: subclientsData, error: subError } = await supabase\n               .from('agency_subclients')\n               .select('*')\n               .eq('agency_id', activeProjectId);",
        "const subRes = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT * FROM agency_subclients WHERE agency_id = $1', values: [activeProjectId] }) }); const { data: subclientsData, error: subError } = await subRes.json();"
    );

    // 5. getSession
    content = content.replace(
        "const { data: { session } } = await supabase.auth.getSession();",
        "const authRes = await fetch('/api/auth/me'); const authData = await authRes.json(); const session = authData.authenticated ? { user: authData.user } : null;"
    );
    // There is another one
    content = content.replace(
        "const { data: { session } } = await supabase.auth.getSession();",
        "const authRes = await fetch('/api/auth/me'); const authData = await authRes.json(); const session = authData.authenticated ? { user: authData.user } : null;"
    );

    // 6. client_briefings update
    content = content.replace(
        "await supabase.from('client_briefings').update({ is_completed: false }).eq('project_id', activeProjectId);",
        "await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'UPDATE client_briefings SET is_completed = false WHERE project_id = $1', values: [activeProjectId] }) });"
    );

    // 7. vault upload 1
    content = content.replace(
        "const { error: uploadError } = await supabase.storage.from('vault_assets').upload(filePath, file);\n        if (uploadError) throw uploadError;\n  \n        const { data: publicUrlData } = supabase.storage.from('vault_assets').getPublicUrl(filePath);",
        `const formData = new FormData(); formData.append('bucket', 'vault_assets'); formData.append('path', filePath); formData.append('file', file); const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: formData }); const uploadData = await uploadRes.json(); if (!uploadRes.ok) throw new Error(uploadData.error?.message); const publicUrlData = uploadData.data;`
    );

    // 8. project assets insert
    content = content.replace(
        "const { data: insertedData, error: dbError } = await supabase\n          .from('project_assets')\n          .insert({\n            project_id: activeProjectId,\n            file_name: file.name,\n            file_url: publicUrlData.publicUrl,\n            file_type: fileExt.toUpperCase(),\n            file_size: fileSizeMB + ' MB'\n          })\n          .select()\n          .single();",
        `const insertRes = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'INSERT INTO project_assets (project_id, file_name, file_url, file_type, file_size) VALUES ($1, $2, $3, $4, $5) RETURNING *', values: [activeProjectId, file.name, publicUrlData.publicUrl, fileExt.toUpperCase(), fileSizeMB + ' MB'] }) }); const insertJson = await insertRes.json(); const insertedData = insertJson.data?.[0]; const dbError = insertJson.error;`
    );

    // 9. delete asset
    content = content.replace(
        "await supabase.from('project_assets').delete().eq('id', assetId);",
        "await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'DELETE FROM project_assets WHERE id = $1', values: [assetId] }) });"
    );

    // 10. vault contract
    content = content.replace(
        "const { error: uploadError } = await supabase.storage.from('vault_assets').upload(fileName, file);\n        if (uploadError) throw uploadError;\n        \n        const { data } = supabase.storage.from('vault_assets').getPublicUrl(fileName);",
        `const formData = new FormData(); formData.append('bucket', 'vault_assets'); formData.append('path', fileName); formData.append('file', file); const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: formData }); const uploadData = await uploadRes.json(); if (!uploadRes.ok) throw new Error(uploadData.error?.message); const data = uploadData.data;`
    );

    // 11. promise all moodboard & directions
    content = content.replace(
        "supabase.from('strategic_answers').select('moodboard_urls').eq('project_id', activeProjectId).maybeSingle(),",
        "fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT moodboard_urls FROM strategic_answers WHERE project_id = $1 LIMIT 1', values: [activeProjectId] }) }).then(r => r.json()).then(r => ({ data: r.data?.[0] })),"
    );
    content = content.replace(
        "supabase.from('design_directions').select('*').eq('project_id', activeProjectId).order('created_at', { ascending: true })",
        "fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'SELECT * FROM design_directions WHERE project_id = $1 ORDER BY created_at ASC', values: [activeProjectId] }) }).then(r => r.json())"
    );

    // 12. moodboard upload
    content = content.replace(
        "const { error: uploadError } = await supabase.storage.from('moodboard').upload(filePath, file);\n          if (uploadError) throw uploadError;\n          const { data } = supabase.storage.from('moodboard').getPublicUrl(filePath);",
        `const formData = new FormData(); formData.append('bucket', 'moodboard'); formData.append('path', filePath); formData.append('file', file); const uploadRes = await fetch('/api/storage/upload', { method: 'POST', body: formData }); const uploadData = await uploadRes.json(); if (!uploadRes.ok) throw new Error(uploadData.error?.message); const data = uploadData.data;`
    );

    // 13. insert ref
    content = content.replace(
        "const { data: newRefData, error: dbError } = await supabase.from('design_directions').insert({\n          project_id: activeProjectId,\n          title: newRefTitle,\n          image_url: uploadedUrls[0], \n          score: 0,\n          feedback: ''\n        }).select().single();",
        `const insertRefRes = await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'INSERT INTO design_directions (project_id, title, image_url, score, feedback) VALUES ($1, $2, $3, 0, \\'\\') RETURNING *', values: [activeProjectId, newRefTitle, uploadedUrls[0]] }) }); const insertRefJson = await insertRefRes.json(); const newRefData = insertRefJson.data?.[0]; const dbError = insertRefJson.error;`
    );

    // 14. delete ref
    content = content.replace(
        "try { await supabase.from('design_directions').delete().eq('id', id); } catch (error) { showToast(\"Erro ao excluir direção no banco.\"); }",
        "try { await fetch('/api/db/query', { method: 'POST', body: JSON.stringify({ query: 'DELETE FROM design_directions WHERE id = $1', values: [id] }) }); } catch (error) { showToast(\"Erro ao excluir direção no banco.\"); }"
    );

    fs.writeFileSync(file, content);
}

migrateAdminPage();
migrateProjetosPage();
console.log('Fixed syntax and migrated successfully.');
