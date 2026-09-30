const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

// 1. Remove BriefingModal import
code = code.replace(/const BriefingModal = dynamic\([\s\S]*?\);\n/g, '');

// 2. Add CuradoriaStage import
code = code.replace(
  /import \{ BrandSnapshot \} from "\.\.\/components\/brand\/BrandSnapshot";/,
  'import { BrandSnapshot } from "../components/brand/BrandSnapshot";\nimport { CuradoriaStage } from "../components/brand/CuradoriaStage";'
);

// 3. Update state
code = code.replace(
  /const \[hasBriefing, setHasBriefing\] = useState\(false\);\n  const \[isBriefingModalOpen, setIsBriefingModalOpen\] = useState\(false\);/,
  'const [briefingData, setBriefingData] = useState<any>(null);'
);

// 4. Update fetch
code = code.replace(
  /if \(briefing && briefing\.is_completed\) setHasBriefing\(true\);/,
  'if (briefing) setBriefingData(briefing);'
);
// Wait, we need the whole briefing, not just `is_completed`! Let's fix the query.
code = code.replace(
  /\.select\('is_completed'\)/,
  '.select(\'*\')'
);

// 5. Remove `<BriefingModal ... />`
code = code.replace(/<BriefingModal[\s\S]*?\/>/, '');

// 6. Update Timeline logic
code = code.replace(
  /const isCurrent = index === currentStageIndex && hasBriefing;/g,
  'const isCurrent = index === currentStageIndex;'
);
code = code.replace(
  /const isPending = index > currentStageIndex \|\| \(!hasBriefing && index > 0\);/g,
  'const isPending = index > currentStageIndex;'
);

// 7. Update Dynamic Area
// We will replace the entire dynamic area block.
const dynamicStart = code.indexOf('{/* AREA DINAMICA DE ACÃO - BRAND SNAPSHOT, ETC */}');
const dynamicEnd = code.indexOf('{/* COLUNA LATERAL (REGISTRO DE DECISÕES) */}');

const newDynamicArea = `{/* AREA DINAMICA DE ACÃO */}
            {currentStageIndex === 0 && (
              <div className="flex flex-col gap-8">
                <CuradoriaStage 
                  projectId={activeProject?.id} 
                  clientId={userId!} 
                  projectData={activeProject} 
                  briefingData={briefingData} 
                  onComplete={() => setBriefingData({ ...briefingData, is_completed: true })} 
                />
                
                {briefingData?.is_completed && brandSnapshot && (
                  <BrandSnapshot
                    data={brandSnapshot}
                    onApprove={handleApproveSnapshot}
                    onRequestRevision={handleRejectSnapshot}
                    isClient={true}
                  />
                )}
              </div>
            )}

            {currentStageIndex === 2 && (
              <Territories
                evaluationId={territoryEval?.id}
                territories={territoryEval?.territories}
                status={territoryEval?.status}
                chosenTerritoryId={territoryEval?.chosen_territory_id}
                feedback={territoryEval?.client_feedback}
                onEvaluate={handleEvaluateTerritory}
                isClient={true}
              />
            )}

            {currentStageIndex === 4 && (
              <RevealCeremony 
                meetingLink={activeProject?.meeting_link} 
                meetingDate={activeProject?.meeting_date} 
                pdfUrl={activeProject?.presentation_url} 
                brandOsUrl={activeProject?.brand_os_url} 
                isUnlocked={activeProject?.status === 'delivered' || activeProject?.status === 'completed'} 
                clientName={clientProfile?.nome || 'Cliente'} 
              />
            )}

            {currentStageIndex === 5 && (
              <ActivationChecklist
                items={checklistItems}
                onToggleItem={handleToggleChecklistItem}
                isClient={true}
              />
            )}

          </div>
`;

code = code.substring(0, dynamicStart) + newDynamicArea + code.substring(dynamicEnd);

fs.writeFileSync('src/app/page.tsx', code);
