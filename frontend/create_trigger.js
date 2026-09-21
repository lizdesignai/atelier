const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({ connectionString: process.env.POSTGRES_URL });

async function createTrigger() {
  const query = `
    -- Função para briefings_identidade_visual (transforma em CLIENTE)
    CREATE OR REPLACE FUNCTION sync_briefing_idv_to_clients()
    RETURNS TRIGGER AS $$
    DECLARE
      new_client_id UUID;
      final_email TEXT;
      final_nome TEXT;
      final_empresa TEXT;
    BEGIN
      final_email := COALESCE(NEW."Email", NEW.dados_completos->>'Email');
      final_nome := COALESCE(NEW."Nome_Cliente", NEW.dados_completos->>'Nome_Cliente');
      final_empresa := COALESCE(NEW."Nome_Logotipo", NEW.dados_completos->>'Nome_Logotipo');

      IF final_email IS NULL OR final_email = '' THEN
        RETURN NEW;
      END IF;

      SELECT id INTO new_client_id FROM profiles WHERE email = final_email;

      IF new_client_id IS NULL THEN
        new_client_id := gen_random_uuid();
        INSERT INTO profiles (id, email, nome, role, empresa)
        VALUES (new_client_id, final_email, final_nome, 'client', final_empresa);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM projects WHERE client_id = new_client_id AND service_type = 'Identidade Visual') THEN
        INSERT INTO projects (client_id, service_type, status, created_at)
        VALUES (new_client_id, 'Identidade Visual', 'active', NOW());
      END IF;

      DELETE FROM leads WHERE email = final_email;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE OR REPLACE FUNCTION sync_briefing_insta_to_clients()
    RETURNS TRIGGER AS $$
    DECLARE
      new_client_id UUID;
      final_email TEXT;
      final_nome TEXT;
      final_empresa TEXT;
    BEGIN
      final_email := COALESCE(NEW.email, NEW.dados_completos->>'Email');
      final_nome := COALESCE(NEW.nome_cliente, NEW.dados_completos->>'Nome_Cliente');
      final_empresa := COALESCE(NEW.instagram, NEW.dados_completos->>'Instagram');

      IF final_email IS NULL OR final_email = '' THEN
        RETURN NEW;
      END IF;

      SELECT id INTO new_client_id FROM profiles WHERE email = final_email;

      IF new_client_id IS NULL THEN
        new_client_id := gen_random_uuid();
        INSERT INTO profiles (id, email, nome, role, empresa)
        VALUES (new_client_id, final_email, final_nome, 'client', final_empresa);
      END IF;

      IF NOT EXISTS (SELECT 1 FROM projects WHERE client_id = new_client_id AND service_type = 'Gestão de Instagram') THEN
        INSERT INTO projects (client_id, service_type, status, created_at)
        VALUES (new_client_id, 'Gestão de Instagram', 'active', NOW());
      END IF;

      DELETE FROM leads WHERE email = final_email;

      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `;

  try {
    await pool.query(query);
    console.log('Triggers for briefings updated');
  } catch(e) {
    console.error('Error creating triggers', e);
  } finally {
    pool.end();
  }
}

createTrigger();
