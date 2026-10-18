const fs = require('fs');
const file = 'src/app/admin/analytics/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    "import { BrainCircuit, Loader2, X, Cpu, Play, CheckSquare, Check, Activity, FolderKanban, GitMerge, Crown, DollarSign, Users, SlidersHorizontal, LayoutDashboard, Target } from \\"lucide-react\\";",
    "import { BrainCircuit, Loader2, X, Cpu, Play, CheckSquare, Check, Activity, FolderKanban, GitMerge, Crown, DollarSign, Users, SlidersHorizontal, LayoutDashboard, Target, Plus } from \\"lucide-react\\";"
);

fs.writeFileSync(file, content);
