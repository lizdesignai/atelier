const fs = require('fs');

// AppSidebar.tsx
const appFile = 'src/components/layout/AppSidebar.tsx';
let appContent = fs.readFileSync(appFile, 'utf8');

// Restore Agenda in ROUTE_NAMES
if (!appContent.includes("'/admin/agenda': 'Agenda'")) {
    appContent = appContent.replace(
        "'/admin/projetos': 'Studio Veronna',",
        "'/admin/projetos': 'Studio Veronna',\n  '/admin/agenda': 'Agenda',"
    );
}

// Restore Agenda in manager ROUTE_NAMES array
if (appContent.includes("href: '/admin/gestao'") && !appContent.includes("href: '/admin/agenda'")) {
    appContent = appContent.replace(
        "{ href: '/admin/gestao', icon: <LayoutDashboard size={20} strokeWidth={1.5} />, label: 'Produtividade' },",
        "{ href: '/admin/gestao', icon: <LayoutDashboard size={20} strokeWidth={1.5} />, label: 'Produtividade' },\n      { href: '/admin/agenda', icon: <Calendar size={20} strokeWidth={1.5} />, label: 'Agenda' },"
    );
}

// Restore Agenda in desktop NavItems
const targetAppGestao = '<NavItem href="/admin/gestao" icon={<LayoutDashboard size={18} strokeWidth={1.5} />} label="Produtividade" collapsed={isCollapsed} active={pathname === \'/admin/gestao\'} />';
const replaceAppGestao = targetAppGestao + '\n                  <NavItem href="/admin/agenda" icon={<Calendar size={18} strokeWidth={1.5} />} label="Agenda" collapsed={isCollapsed} active={pathname === \'/admin/agenda\'} />';

if (appContent.includes(targetAppGestao) && !appContent.includes('/admin/agenda"')) {
    appContent = appContent.replace(targetAppGestao, replaceAppGestao);
}

fs.writeFileSync(appFile, appContent);

// MobileSidebar.tsx
const mobileFile = 'src/components/layout/MobileSidebar.tsx';
let mobileContent = fs.readFileSync(mobileFile, 'utf8');

// Restore Agenda in MobileSidebar NavItems
const targetMobileGestao = '<NavItem href="/admin/gestao" icon={<LayoutDashboard size={18} strokeWidth={1.5} />} label="Produtividade" collapsed={isMobileDrawerOpen} active={pathname === \'/admin/gestao\'} onClick={() => setIsMobileDrawerOpen(false)} />';
const replaceMobileGestao = targetMobileGestao + '\n                  <NavItem href="/admin/agenda" icon={<Calendar size={18} strokeWidth={1.5} />} label="Agenda" collapsed={isMobileDrawerOpen} active={pathname === \'/admin/agenda\'} onClick={() => setIsMobileDrawerOpen(false)} />';

if (mobileContent.includes(targetMobileGestao) && !mobileContent.includes('/admin/agenda"')) {
    mobileContent = mobileContent.replace(targetMobileGestao, replaceMobileGestao);
    fs.writeFileSync(mobileFile, mobileContent);
}

console.log('Added Agenda cleanly to sidebars');
