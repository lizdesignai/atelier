const fs = require('fs');

const file = 'src/components/layout/MobileSidebar.tsx';
let content = fs.readFileSync(file, 'utf8');

const badTeamItems = `] : isTeamMember ? [
      { href: '/admin/analytics', icon: <Activity size={20} strokeWidth={1.5} />, label: 'Analytics' },
      { href: '/admin/jtbd', icon: <Crosshair size={20} strokeWidth={1.5} />, label: 'Focus' },
      { href: '/admin/clientes', icon: <Users size={20} strokeWidth={1.5} />, label: 'Clientes' },
      { href: '/admin/fio', icon: <MessageCircle size={20} strokeWidth={1.5} />, label: 'Sintonia', badge: globalUnreadCount },
      { href: '/comunidade', icon: <Globe2 size={20} strokeWidth={1.5} />, label: 'Comunidade' }
    ]`;

const newTeamItems = `] : isTeamMember ? [
      ...(isManagerOrAdmin ? [{ href: '/admin', icon: <FileText size={20} strokeWidth={1.5} />, label: 'QG Liziane' }] : []),
      { href: '/admin/projetos', icon: <FolderKanban size={20} strokeWidth={1.5} />, label: 'Projetos' },
      { href: '/admin/jtbd', icon: <Crosshair size={20} strokeWidth={1.5} />, label: 'Focus' },
      { href: '/admin/fio', icon: <MessageCircle size={20} strokeWidth={1.5} />, label: 'Sintonia', badge: globalUnreadCount },
      { href: '/admin/analytics', icon: <Activity size={20} strokeWidth={1.5} />, label: 'Analytics' }
    ]`;

content = content.replace(badTeamItems, newTeamItems);

fs.writeFileSync(file, content);
console.log('Mobile sidebar updated.');
