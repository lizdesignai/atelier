const fs = require('fs');

// APP SIDEBAR
let fileApp = 'src/components/layout/AppSidebar.tsx';
let contentApp = fs.readFileSync(fileApp, 'utf8');
if (!contentApp.includes('/admin/agenda')) {
  // ROUTE_NAMES
  contentApp = contentApp.replace(
    "'/admin/projetos': 'Studio Veronna',",
    "'/admin/projetos': 'Studio Veronna',\n    '/admin/agenda': 'Agenda',"
  );
  
  // manager items
  contentApp = contentApp.replace(
    "{ href: '/admin/gestao', icon: <LayoutDashboard size={20} strokeWidth={1.5} />, label: 'Produtividade' },",
    "{ href: '/admin/gestao', icon: <LayoutDashboard size={20} strokeWidth={1.5} />, label: 'Produtividade' },\n        { href: '/admin/agenda', icon: <Calendar size={20} strokeWidth={1.5} />, label: 'Agenda' },"
  );

  contentApp = contentApp.replace(
    `<NavItem href="/admin/gestao" icon={<LayoutDashboard size={18} strokeWidth={1.5} />} label="Produtividade" collapsed={isCollapsed} active={pathname === '/admin/gestao'} />`,
    `<NavItem href="/admin/gestao" icon={<LayoutDashboard size={18} strokeWidth={1.5} />} label="Produtividade" collapsed={isCollapsed} active={pathname === '/admin/gestao'} />\n                    <NavItem href="/admin/agenda" icon={<Calendar size={18} strokeWidth={1.5} />} label="Agenda" collapsed={isCollapsed} active={pathname === '/admin/agenda'} />`
  );

  fs.writeFileSync(fileApp, contentApp);
}

// MOBILE SIDEBAR
let fileMobile = 'src/components/layout/MobileSidebar.tsx';
let contentMobile = fs.readFileSync(fileMobile, 'utf8');
if (!contentMobile.includes('/admin/agenda')) {
  contentMobile = contentMobile.replace(
    "{ href: '/admin/gestao', icon: <LayoutDashboard size={20} strokeWidth={1.5} />, label: 'Produtividade' },",
    "{ href: '/admin/gestao', icon: <LayoutDashboard size={20} strokeWidth={1.5} />, label: 'Produtividade' },\n        { href: '/admin/agenda', icon: <Calendar size={20} strokeWidth={1.5} />, label: 'Agenda' },"
  );
  fs.writeFileSync(fileMobile, contentMobile);
}

console.log('Sidebars updated with Agenda tab');
