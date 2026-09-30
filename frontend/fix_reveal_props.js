const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(
  /<RevealCeremony[\s\S]*?\/>/,
  `<RevealCeremony 
                meetingLink={activeProject?.meeting_link} 
                meetingDate={activeProject?.meeting_date} 
                pdfUrl={activeProject?.presentation_url} 
                brandOsUrl={activeProject?.brand_os_url} 
                isUnlocked={activeProject?.status === 'delivered' || activeProject?.status === 'completed'} 
                clientName={clientProfile?.nome || 'Cliente'} 
              />`
);

fs.writeFileSync('src/app/page.tsx', code);
