const fs = require('fs');

// 1. Copy file
let code = fs.readFileSync('src/app/referencias/page.tsx', 'utf-8');

// 2. Modify signature
code = code.replace(
  'export default function ReferenciasPage() {',
  'export function BrandDNACuradoria({ projectId, clientProfile }: { projectId: string | null; clientProfile: any; }) {'
);

// 3. Remove conflicting states
code = code.replace(/const \[projectId, setProjectId\] = useState<string \| null>\(null\);\n/, '');
code = code.replace(/const \[clientProfile, setClientProfile\] = useState<any>\(null\);\n/, '');

// 4. Modify useEffect
const fetchStart = code.indexOf('const fetchReferencesData = async () => {');
const fetchEnd = code.indexOf('if (strategicData && strategicData.moodboard_urls)');
const oldFetch = code.substring(fetchStart, fetchEnd);

code = code.replace(oldFetch, `const fetchReferencesData = async () => {
      if (!projectId) return;

      // 3. Busca o Moodboard (strategic_answers)
      const { data: strategicData } = await supabase
        .from('strategic_answers')
        .select('moodboard_urls')
        .eq('project_id', projectId)
        .single();
      
      `);

// 5. Replace `project.id` with `projectId`
code = code.replace(/\.eq\('project_id', project\.id\)/g, `.eq('project_id', projectId)`);

// 6. Fix full height issue (h-[calc(100vh-80px)])
code = code.replace(/h-\[calc\(100vh-80px\)\]/g, 'min-h-[500px]');

fs.writeFileSync('src/components/brand/BrandDNACuradoria.tsx', code);
