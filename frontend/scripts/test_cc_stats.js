const { getCommandCenterData } = require('./src/lib/tessera/itemQueries');

async function test() {
  const ORG_ID = '9e4d0261-e26d-4d92-8097-bb1850c1d958';
  const data = await getCommandCenterData(ORG_ID);
  console.log('Command Center Stats:', data.stats);
  console.log('Total items in command center:', data.work_items.length);
  const blockedInCC = data.work_items.filter(i => i.blocked_at);
  console.log('Blocked items in command center:', blockedInCC.length);
}

test().catch(console.error);
