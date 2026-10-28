#!/usr/bin/env node
/**
 * Script de Backfill Idempotente dos Dados Financeiros Legados para o Sistema v2 (Fase 2).
 * - Normaliza projects.payment_recurrence e payment_split
 * - Migra financial_outflows para fin_entries e fin_tax_obligations
 * - Gera contas a receber iniciais a partir de agências e projetos com valor
 * - Usa external_ref único para garantir idempotência perfeita
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import pg from 'pg';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(rootDir, '.env.local'), quiet: true });
dotenv.config({ path: path.join(rootDir, '.env'), quiet: true });

const connStr = (process.env.POSTGRES_URL || process.env.DATABASE_URL || '').trim();
if (!connStr || connStr.includes('supabase.co')) {
  console.error('[backfill] ERRO: POSTGRES_URL ou DATABASE_URL ausente/inválida.');
  process.exit(1);
}

async function run() {
  const client = new pg.Client({ connectionString: connStr, ssl: { rejectUnauthorized: false } });
  await client.connect();

  try {
    console.log('[backfill] Iniciando migração e normalização de dados financeiros...');

    // 1. Obter contas do plano de contas
    const { rows: accounts } = await client.query('SELECT id, code, name FROM fin_accounts');
    const accMap = new Map(accounts.map((a) => [a.code, a.id]));

    const defaultBank = (await client.query('SELECT id FROM fin_bank_accounts WHERE is_default = TRUE LIMIT 1')).rows[0]?.id;

    // 2. Normalizar encoding e inconsistências em projects
    console.log('[backfill] Normalizando projects (payment_recurrence e payment_split)...');
    await client.query(`
      UPDATE projects
      SET payment_recurrence = 'Único'
      WHERE payment_recurrence ILIKE '%nico%' AND payment_recurrence != 'Mensal';
    `);

    await client.query(`
      UPDATE projects
      SET payment_split = '50% Entrada / 50% Entrega'
      WHERE payment_split = '50/50';
    `);

    // 3. Migrar financial_outflows para fin_entries
    const { rows: outflows } = await client.query('SELECT * FROM financial_outflows');
    console.log(`[backfill] Processando ${outflows.length} despesas legadas de financial_outflows...`);

    let outflowsCount = 0;
    for (const out of outflows) {
      const extRef = `legacy_outflow_${out.id}`;

      // Determinar conta adequada
      let accCode = '4.1.07'; // Geral
      const titleLower = (out.title || '').toLowerCase();
      const catLower = (out.category || '').toLowerCase();

      if (titleLower.includes('sn') || catLower.includes('imposto')) {
        accCode = '2.1.01'; // Simples Nacional
      } else if (catLower.includes('software') || titleLower.includes('adobe') || titleLower.includes('canva') || titleLower.includes('capcut')) {
        accCode = '4.1.01'; // Softwares
      } else if (titleLower.includes('liz') || titleLower.includes('igor')) {
        accCode = '4.1.06'; // Pró-labore Sócios
      } else if (catLower.includes('salário') || catLower.includes('fornecedor')) {
        accCode = '3.1.02'; // Fornecedores / Produção
      }

      const accountId = accMap.get(accCode) || accMap.get('4.1.07');
      const dueDate = out.due_date ? new Date(out.due_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      const compDate = dueDate.slice(0, 7) + '-01';
      const amount = Number(out.amount || 0);
      const isPaid = out.status === 'paid';

      // Insert na fin_entries com ON CONFLICT (external_ref) DO UPDATE
      const entryRes = await client.query(
        `
        INSERT INTO fin_entries (
          kind, source, title, description, account_id, bank_account_id,
          competence_date, due_date, paid_date, amount, amount_paid,
          status, external_ref, notes
        )
        VALUES (
          'expense', 'manual', $1, $2, $3, $4,
          $5, $6, $7, $8, $9,
          $10, $11, 'Migrado de financial_outflows legado'
        )
        ON CONFLICT (external_ref) DO UPDATE SET
          amount = EXCLUDED.amount,
          due_date = EXCLUDED.due_date,
          status = EXCLUDED.status
        RETURNING id
        `,
        [
          out.title || 'Despesa Legada',
          `Categoria legada: ${out.category || 'Geral'}`,
          accountId,
          defaultBank,
          compDate,
          dueDate,
          isPaid ? dueDate : null,
          amount,
          isPaid ? amount : 0,
          isPaid ? 'paid' : 'pending',
          extRef,
        ]
      );
      outflowsCount++;

      // Se for Fatura SN, registrar também em fin_tax_obligations
      if (accCode === '2.1.01' && entryRes.rows[0]?.id) {
        const competence = dueDate.slice(0, 7);
        await client.query(
          `
          INSERT INTO fin_tax_obligations (tax_type, competence, due_date, amount, status, entry_id)
          SELECT 'DAS Simples Nacional', $1, $2, $3, $4, $5
          WHERE NOT EXISTS (SELECT 1 FROM fin_tax_obligations WHERE entry_id = $5)
          `,
          [competence, dueDate, amount, isPaid ? 'paid' : 'pending', entryRes.rows[0].id]
        );
      }
    }

    // 4. Migrar agências parceiras ativas para contas a receber
    const { rows: agencies } = await client.query("SELECT * FROM agencies WHERE status = 'active' AND financial_value > 0");
    console.log(`[backfill] Processando ${agencies.length} agências ativas...`);
    const agencyAccId = accMap.get('1.1.02') || accMap.get('1.1.01');

    let agenciesCount = 0;
    for (const ag of agencies) {
      const extRef = `agency_contract_${ag.id}`;
      const amount = Number(ag.financial_value || 0);
      const dueDate = ag.billing_date ? new Date(ag.billing_date).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
      const compDate = dueDate.slice(0, 7) + '-01';

      await client.query(
        `
        INSERT INTO fin_entries (
          kind, source, title, description, account_id, bank_account_id,
          agency_id, competence_date, due_date, amount, amount_paid,
          status, payment_method, external_ref, notes
        )
        VALUES (
          'revenue', 'agency', $1, $2, $3, $4,
          $5, $6, $7, $8, 0.00,
          'pending', 'Boleto / PIX', $9, 'Contrato recorrente de agência parceira B2B'
        )
        ON CONFLICT (external_ref) DO UPDATE SET
          amount = EXCLUDED.amount,
          due_date = EXCLUDED.due_date
        `,
        [
          `Mensalidade Agência: ${ag.name}`,
          `Agência Parceira B2B - Contrato Mensal`,
          agencyAccId,
          defaultBank,
          ag.id,
          compDate,
          dueDate,
          amount,
          extRef,
        ]
      );
      agenciesCount++;
    }

    // 5. Migrar projetos ativos com valor
    const { rows: projects } = await client.query(`
      SELECT p.*, pr.nome as client_name
      FROM projects p
      LEFT JOIN profiles pr ON p.client_id = pr.id
      WHERE p.financial_value > 0 AND p.status IN ('active', 'delivered')
    `);
    console.log(`[backfill] Processando ${projects.length} projetos com valor financeiro cadastrado...`);

    let projectsCount = 0;
    for (const p of projects) {
      const isMRR = p.payment_recurrence === 'Mensal';
      const extRef = isMRR ? `project_mrr_${p.id}` : `project_order_${p.id}`;
      const accCode = isMRR ? '1.1.01' : (p.service_type === 'O Mapa' ? '1.2.02' : '1.2.01');
      const accountId = accMap.get(accCode) || accMap.get('1.1.01');
      const amount = Number(p.financial_value || 0);
      const dueDate = p.billing_date ? new Date(p.billing_date).toISOString().slice(0, 10) : (p.data_limite ? new Date(p.data_limite).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10));
      const compDate = dueDate.slice(0, 7) + '-01';

      await client.query(
        `
        INSERT INTO fin_entries (
          kind, source, title, description, account_id, bank_account_id,
          client_id, project_id, competence_date, due_date, amount, amount_paid,
          status, payment_method, external_ref, notes
        )
        VALUES (
          'revenue', 'contract', $1, $2, $3, $4,
          $5, $6, $7, $8, $9, 0.00,
          'pending', $10, $11, 'Lançamento gerado a partir do contrato de projeto'
        )
        ON CONFLICT (external_ref) DO UPDATE SET
          amount = EXCLUDED.amount,
          due_date = EXCLUDED.due_date
        `,
        [
          `${p.service_type || 'Projeto'}: ${p.client_name || 'Cliente'}`,
          `Contrato: ${p.payment_recurrence || 'Único'} (${p.payment_split || 'Valor Integral'})`,
          accountId,
          defaultBank,
          p.client_id,
          p.id,
          compDate,
          dueDate,
          amount,
          p.payment_method || 'PIX',
          extRef,
        ]
      );
      projectsCount++;
    }

    // 6. Auditoria do Backfill
    await client.query(
      `
      INSERT INTO fin_audit_log (entity_type, entity_id, action, reason, after_state)
      VALUES (
        'fin_entries',
        gen_random_uuid(),
        'insert',
        'Backfill inicial idempotente executado com sucesso',
        $1::jsonb
      )
      `,
      [
        JSON.stringify({
          migratedOutflows: outflowsCount,
          migratedAgencies: agenciesCount,
          migratedProjects: projectsCount,
          timestamp: new Date().toISOString(),
        }),
      ]
    );

    console.log('[backfill] Migração concluída com sucesso!');
    console.log(`  - Despesas migradas: ${outflowsCount}`);
    console.log(`  - Contratos de agências integrados: ${agenciesCount}`);
    console.log(`  - Contratos de projetos integrados: ${projectsCount}`);
  } finally {
    await client.end();
  }
}

run().catch((err) => {
  console.error('[backfill] Falha:', err.message);
  process.exit(1);
});
