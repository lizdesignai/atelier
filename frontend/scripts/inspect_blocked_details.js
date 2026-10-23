const { neon } = require('@neondatabase/serverless');
const sql = neon('postgresql://neondb_owner:npg_K0DUPzW4splG@ep-divine-cherry-acjd0tmq-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require');

async function inspectBlocked() {
  const rows = await sql`
    SELECT 
      t.id, 
      t.title, 
      t.task_type, 
      t.type, 
      t.status, 
      t.stage, 
      t.is_adhoc, 
      t.depends_on, 
      t.temp_dependency_index,
      t.ig_is_piece,
      t.ig_format,
      p.nome as client_name,
      pr.type as project_type
    FROM tasks t
    LEFT JOIN projects pr ON pr.id = t.project_id
    LEFT JOIN profiles p ON p.id = pr.client_id
    WHERE t.is_blocked = true;
  `;

  console.log('Total blocked tasks:', rows.length);

  // Group by task_type / type
  const byTaskType = {};
  const byStatus = {};
  const byProjectType = {};
  const byDependency = { has_depends_on: 0, has_temp_dep: 0, neither: 0 };

  rows.forEach(r => {
    byTaskType[r.task_type || r.type || 'unknown'] = (byTaskType[r.task_type || r.type || 'unknown'] || 0) + 1;
    byStatus[r.status] = (byStatus[r.status] || 0) + 1;
    byProjectType[r.project_type || 'unknown'] = (byProjectType[r.project_type || 'unknown'] || 0) + 1;
    if (r.depends_on) byDependency.has_depends_on++;
    else if (r.temp_dependency_index !== null) byDependency.has_temp_dep++;
    else byDependency.neither++;
  });

  console.log('By Type:', byTaskType);
  console.log('By Status:', byStatus);
  console.log('By Project Type:', byProjectType);
  console.log('By Dependency:', byDependency);

  const tesseraReasons = await sql`
    SELECT blocked_reason, COUNT(*) as cnt
    FROM tessera_work_items
    WHERE blocked_at IS NOT NULL
    GROUP BY blocked_reason;
  `;
  console.log('\nTessera blocked reasons:', tesseraReasons);


  // Sample tasks that have is_blocked = true
  console.log('\nSample 25 titles:');
  rows.slice(0, 25).forEach(r => {
    console.log(`- [${r.status}] [${r.project_type}] ${r.client_name}: ${r.title} (dep: ${r.depends_on}, temp_dep: ${r.temp_dependency_index})`);
  });
}

inspectBlocked().catch(console.error);
