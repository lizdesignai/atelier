// scripts/migrate_tessera_wave2_3.js
// Onda 2/3: sessões de trabalho no servidor, comentários, limites de WIP.
// Idempotente: pode ser executado mais de uma vez.
const { getSql } = require('./lib/neon');

async function run() {
  const sql = getSql();
  console.log('🚀 Tessera — migração Onda 2/3');

  // 1. Sessões de trabalho (cronômetro autoritativo no servidor)
  await sql.query(`
    CREATE TABLE IF NOT EXISTS public.tessera_work_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_item_id UUID NOT NULL REFERENCES public.tessera_work_items(id) ON DELETE CASCADE,
      user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
      started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      ended_at TIMESTAMPTZ,
      minutes INTEGER,
      capped BOOLEAN DEFAULT FALSE,
      source VARCHAR(20) NOT NULL DEFAULT 'timer',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  // Garantia no banco: no máximo UMA sessão aberta por usuário.
  await sql.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS uq_tessera_one_open_session_per_user
    ON public.tessera_work_sessions(user_id) WHERE ended_at IS NULL;
  `);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_tessera_sessions_item ON public.tessera_work_sessions(work_item_id);`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_tessera_sessions_user_day ON public.tessera_work_sessions(user_id, started_at);`);
  console.log('✅ tessera_work_sessions (+ índice único de sessão aberta por usuário)');

  // 2. Comentários
  await sql.query(`
    CREATE TABLE IF NOT EXISTS public.tessera_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      work_item_id UUID NOT NULL REFERENCES public.tessera_work_items(id) ON DELETE CASCADE,
      author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_tessera_comments_item ON public.tessera_comments(work_item_id, created_at);`);
  console.log('✅ tessera_comments');

  // 3. Limites de WIP por coluna do Kanban (configuração da organização)
  await sql.query(`
    UPDATE public.tessera_organizations
    SET settings = jsonb_set(
      COALESCE(settings, '{}'::jsonb),
      '{wip_limits}',
      COALESCE(settings->'wip_limits', '{"in_progress": 6, "internal_review": 8, "client_approval": 12}'::jsonb)
    ),
    updated_at = NOW()
    WHERE slug = 'studio-veronna';
  `);
  console.log('✅ wip_limits padrão registrados em tessera_organizations.settings');

  // 4. Índices úteis para Focus/Inbox
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_tessera_work_items_owner_status ON public.tessera_work_items(owner_id, status_id) WHERE archived_at IS NULL;`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_tessera_reviews_item ON public.tessera_reviews(work_item_id, created_at);`);
  await sql.query(`CREATE INDEX IF NOT EXISTS idx_tessera_status_history_item ON public.tessera_status_history(work_item_id, created_at);`);

  // 5. Correção da Onda 1: apenas equipe (admin/gestor/colaborador) pode ser membro.
  //    O seed original vinculou TODOS os perfis (inclusive clientes) como "colaborador".
  const removed = await sql.query(`
    DELETE FROM public.tessera_memberships m
    USING public.profiles p
    WHERE p.id = m.user_id AND p.role NOT IN ('admin', 'gestor', 'colaborador')
    RETURNING m.user_id;
  `);
  console.log(`🧹 ${removed.length} vínculo(s) de não-equipe removido(s) de tessera_memberships`);
  await sql.query(`
    UPDATE public.tessera_memberships m
       SET role = CASE p.role WHEN 'admin' THEN 'owner' WHEN 'gestor' THEN 'gestor' ELSE 'colaborador' END,
           updated_at = NOW()
      FROM public.profiles p
     WHERE p.id = m.user_id
       AND m.role IS DISTINCT FROM CASE p.role WHEN 'admin' THEN 'owner' WHEN 'gestor' THEN 'gestor' ELSE 'colaborador' END;
  `);

  console.log('🎉 Migração Onda 2/3 concluída.');
}

run().catch(err => { console.error('❌ Falha:', err); process.exit(1); });
