const fs = require('fs');
const file = 'src/app/admin/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// fix imports
content = content.replace(
    /Star, ThumbsUp, TrendingUp, Award, MessageSquareHeart, Activity\r?\n\}\s*from\s*["']lucide-react["'];/,
    'Star, ThumbsUp, TrendingUp, Award, MessageSquareHeart, Activity, LayoutDashboard, Users, FileSignature, FileEdit, Compass\n} from "lucide-react";'
);

fs.writeFileSync(file, content);
console.log('Fixed imports!');
