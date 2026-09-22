// Script para aplicar as migrações da Fase 1 do Mapa 4D no Neon
require('dotenv').config({ path: '.env.local' });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function migrate() {
  const client = await pool.connect();
  try {
    console.log('🔧 Aplicando migrações da Fase 1 — Mapa 4D...\n');

    // 0. Criar tabela mapas se não existir
    console.log('0/4 — Criando tabela mapas (se não existir)...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS mapas (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          client_id UUID NOT NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          
          -- Scores
          score_total INTEGER NOT NULL DEFAULT 0,
          score_clareza INTEGER NOT NULL DEFAULT 0,
          score_autoridade INTEGER NOT NULL DEFAULT 0,
          score_percepcao INTEGER NOT NULL DEFAULT 0,
          score_conversao INTEGER NOT NULL DEFAULT 0,
          
          -- Benchmarks (snapshots no momento da geração)
          benchmark_total INTEGER DEFAULT 0,
          benchmark_clareza INTEGER DEFAULT 0,
          benchmark_autoridade INTEGER DEFAULT 0,
          benchmark_percepcao INTEGER DEFAULT 0,
          benchmark_conversao INTEGER DEFAULT 0,
          
          -- Diagnóstico
          principal_gargalo TEXT NOT NULL DEFAULT 'Não diagnosticado',
          recomendacao TEXT NOT NULL DEFAULT 'Aguardando preenchimento',
          
          -- Respostas/Evidências do teste original
          respostas_json JSONB,
          
          -- Analytics & Instrumentação
          mapa_visualizado BOOLEAN DEFAULT false,
          tempo_consumo_segundos INTEGER DEFAULT 0,
          modulos_visualizados JSONB DEFAULT '[]'::jsonb,
          cliques_identidade INTEGER DEFAULT 0,
          cliques_gestao INTEGER DEFAULT 0,
          contratou_identidade BOOLEAN DEFAULT false,
          contratou_gestao BOOLEAN DEFAULT false,
          
          -- Evolução / Checklist (legado)
          checklist_status JSONB
      )
    `);
    console.log('   ✓ Tabela mapas pronta.\n');

    // 1. Adicionar colunas de progressão da jornada semanal
    console.log('1/4 — Adicionando colunas etapa_atual e progresso_etapas...');
    await client.query(`ALTER TABLE mapas ADD COLUMN IF NOT EXISTS etapa_atual INTEGER DEFAULT 0`);
    await client.query(`ALTER TABLE mapas ADD COLUMN IF NOT EXISTS progresso_etapas JSONB DEFAULT '{}'::jsonb`);
    console.log('   ✓ Colunas adicionadas.\n');

    // 2. Criar tabela de evidências
    console.log('2/4 — Criando tabela mapa_evidencias...');
    await client.query(`
      CREATE TABLE IF NOT EXISTS mapa_evidencias (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          mapa_id UUID REFERENCES mapas(id) ON DELETE CASCADE,
          client_id UUID NOT NULL,
          etapa INTEGER NOT NULL,
          tipo TEXT NOT NULL DEFAULT 'texto',
          conteudo TEXT,
          arquivo_url TEXT,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      )
    `);
    console.log('   ✓ Tabela criada.\n');

    // 3. Índices
    console.log('3/4 — Criando índices...');
    await client.query(`CREATE INDEX IF NOT EXISTS idx_mapas_client_id ON mapas(client_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_mapa_evidencias_mapa_id ON mapa_evidencias(mapa_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_mapa_evidencias_client_id ON mapa_evidencias(client_id)`);
    console.log('   ✓ Índices criados.\n');

    // 4. Verificação
    console.log('4/4 — Verificando schema...');
    const cols = await client.query(`
      SELECT column_name, data_type FROM information_schema.columns 
      WHERE table_name = 'mapas'
      ORDER BY ordinal_position
    `);
    console.log('   Colunas da tabela mapas:');
    cols.rows.forEach(r => console.log(`     - ${r.column_name} (${r.data_type})`));

    const tableCheck = await client.query(`
      SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'mapa_evidencias')
    `);
    console.log('   Tabela mapa_evidencias existe:', tableCheck.rows[0].exists);

    console.log('\n✅ Migração da Fase 1 concluída com sucesso!');
  } catch (err) {
    console.error('❌ Erro na migração:', err);
  } finally {
    client.release();
    pool.end();
  }
}

migrate();
