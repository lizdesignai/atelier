const fs = require('fs');
let code = fs.readFileSync('src/app/page.tsx', 'utf-8');

code = code.replace(
  /<BrandSnapshot[\s\S]*?\/>/,
  `<BrandSnapshot
                data={brandSnapshot}
                onApprove={handleApproveSnapshot}
                onRequestRevision={handleRejectSnapshot}
                isClient={true}
              />`
);

code = code.replace(
  /<Territories[\s\S]*?\/>/,
  `<Territories
                evaluationId={territoryEval.id}
                territories={territoryEval.territories}
                status={territoryEval.status}
                chosenTerritoryId={territoryEval.chosen_territory_id}
                feedback={territoryEval.client_feedback}
                onEvaluate={handleEvaluateTerritory}
                isClient={true}
              />`
);

fs.writeFileSync('src/app/page.tsx', code);
