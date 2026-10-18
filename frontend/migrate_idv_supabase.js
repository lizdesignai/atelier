const fs = require('fs');
const path = require('path');

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

  // Remove supabase import
  content = content.replace(/import \{ supabase \} from ".*";\n/g, '');

  // Add the getClientActiveProjectAction if not exists
  if (!content.includes('getClientActiveProjectAction')) {
    content = content.replace(/export default function/, "import { getClientActiveProjectAction } from \"../../actions/clientProject\";\n\nexport default function");
  }

  // Rewrite the fetch inside useEffect
  if (file.includes('ativar/page.tsx')) {
    content = content.replace(/const fetch = async \(\) => \{[\s\S]*?setIsLoading\(false\);\n    \};/, 
      `const fetch = async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        if (authData.authenticated) setProfile(authData.user);
        
        const proj = await getClientActiveProjectAction();
        if (proj) {
          setProject(proj);
          const res = await fetch('/api/db/query', {
            method: 'POST',
            body: JSON.stringify({ query: 'SELECT * FROM activation_checklist WHERE project_id = $1', values: [proj.id] })
          });
          const { data } = await res.json();
          if (data) setChecklist(data);
        }
      } catch (err) {
        console.error(err);
      }
      setIsLoading(false);
    };`);
  }

  else if (file.includes('descobrir/page.tsx')) {
    content = content.replace(/const fetch = async \(\) => \{[\s\S]*?setIsLoading\(false\);\n    \};/, 
      `const fetch = async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        if (authData.authenticated) setProfile(authData.user);
        
        const proj = await getClientActiveProjectAction();
        if (proj) {
          setProject(proj);
          const res = await fetch('/api/db/query', {
            method: 'POST',
            body: JSON.stringify({ query: 'SELECT * FROM client_briefings WHERE project_id = $1 LIMIT 1', values: [proj.id] })
          });
          const { data } = await res.json();
          if (data && data.length > 0) setBriefingData(data[0]);
        }
      } catch (err) {
        console.error(err);
      }
      setIsLoading(false);
    };`);
  }

  else if (file.includes('direcionar/page.tsx')) {
    content = content.replace(/const fetch = async \(\) => \{[\s\S]*?setIsLoading\(false\);\n  \};/, 
      `const fetch = async () => {
    setIsLoading(true);
    try {
      const authRes = await fetch('/api/auth/me');
      const authData = await authRes.json();
      if (authData.authenticated) setProfile(authData.user);
      
      const proj = await getClientActiveProjectAction();
      if (proj) {
        setProject(proj);
        const evalData = await getTerritoryEvaluationAction(proj.id);
        setEvaluation(evalData);
      }
    } catch (err) {
      console.error(err);
    }
    setIsLoading(false);
  };`);
  }

  else if (file.includes('revelar/page.tsx')) {
    content = content.replace(/const fetch = async \(\) => \{[\s\S]*?setIsLoading\(false\);\n    \};/, 
      `const fetch = async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        if (authData.authenticated) setProfile(authData.user);
        
        const proj = await getClientActiveProjectAction();
        if (proj) {
          setProject(proj);
        }
      } catch (err) {
        console.error(err);
      }
      setIsLoading(false);
    };`);
  }

  else if (file.includes('construir/page.tsx')) {
    // Has polling / interval instead of websocket
    content = content.replace(/let subscription: any;\n\n    const fetch = async \(\) => \{[\s\S]*?return \(\) => \{\n      if \(subscription\) supabase.removeChannel\(subscription\);\n    \};\n/g, 
      `const fetchData = async () => {
      try {
        const proj = await getClientActiveProjectAction();
        if (proj) {
          setProject(proj);
          const res = await fetch('/api/db/query', {
            method: 'POST',
            body: JSON.stringify({ query: "SELECT * FROM tasks WHERE project_id = $1 AND stage IN ('develop', 'qa')", values: [proj.id] })
          });
          const { data } = await res.json();
          if (data) setTasks(data);
        }
      } catch (err) {
        console.error(err);
      }
      setIsLoading(false);
    };
    
    fetchData();
    const interval = setInterval(fetchData, 15000); // Polling 15s instead of websocket
    
    return () => clearInterval(interval);
`);
  }

  else if (file.includes('refinar/page.tsx')) {
    // Has polling / interval instead of websocket
    content = content.replace(/let subscription: any;\n\n    const fetch = async \(\) => \{[\s\S]*?return \(\) => \{\n      if \(subscription\) supabase.removeChannel\(subscription\);\n    \};\n/g, 
      `const fetchData = async () => {
      try {
        const authRes = await fetch('/api/auth/me');
        const authData = await authRes.json();
        if (authData.authenticated) setProfile(authData.user);

        const proj = await getClientActiveProjectAction();
        if (proj) {
          setProject(proj);
          const res = await fetch('/api/db/query', {
            method: 'POST',
            body: JSON.stringify({ query: "SELECT * FROM tasks WHERE project_id = $1 AND stage = 'refine'", values: [proj.id] })
          });
          const { data } = await res.json();
          if (data) setTasks(data);
        }
      } catch (err) {
        console.error(err);
      }
      setIsLoading(false);
    };
    
    fetchData();
    const interval = setInterval(fetchData, 15000); // Polling 15s instead of websocket
    
    return () => clearInterval(interval);
`);
  }

  fs.writeFileSync(file, content);
  console.log(`Updated ${file}`);
});
