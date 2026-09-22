import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

const DEFAULT_PASSWORD = 'Atelier2026!'; // Senha padrão para novos clientes do mapa

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { lead_id, email, nome, nicho } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email é obrigatório para converter o lead' }, { status: 400 });
    }

    const sql = getDb();

    // 1. Apagar da tabela leads se existir (para não duplicar)
    if (lead_id) {
      await sql`DELETE FROM leads WHERE id = ${lead_id}`;
    } else {
      await sql`DELETE FROM leads WHERE email = ${email}`;
    }

    // 2. Criar ou Atualizar Profile na tabela profiles
    let users = await sql`SELECT id FROM profiles WHERE email = ${email}`;
    let clientId;

    if (users.length === 0) {
      // Cria o hash da senha padrão
      const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
      const empresa = nicho || 'Cliente Mapa';

      const result = await sql`
        INSERT INTO profiles (id, email, nome, role, status, empresa, password_hash)
        VALUES (gen_random_uuid(), ${email}, ${nome || email.split('@')[0]}, 'client', 'active', ${empresa}, ${passwordHash})
        RETURNING id
      `;
      clientId = result[0].id;
    } else {
      clientId = users[0].id;
      // Atualizar role se estiver como 'lead'
      await sql`UPDATE profiles SET role = 'client', status = 'active' WHERE id = ${clientId}`;
    }

    // 3. Criar Projeto "O Mapa" para entrar no faturamento
    let projects = await sql`SELECT id FROM projects WHERE client_id = ${clientId} AND service_type = 'O Mapa'`;
    
    if (projects.length === 0) {
      // Adiciona R$ 32,90 ao faturamento mensal
      await sql`
        INSERT INTO projects (client_id, service_type, type, status, payment_recurrence, financial_value, created_at)
        VALUES (${clientId}, 'O Mapa', 'O Mapa', 'active', 'Único', 32.90, NOW())
      `;
    }

    // 4. (Opcional) Já iniciar um Mapa vazio na nova tabela `mapas` para não dar erro se ele logar
    let mapas = await sql`SELECT id FROM mapas WHERE client_id = ${clientId}`;
    if (mapas.length === 0) {
      await sql`
        INSERT INTO mapas (
          client_id, score_total, score_clareza, score_autoridade, score_percepcao, score_conversao,
          principal_gargalo, recomendacao
        ) VALUES (
          ${clientId}, 0, 0, 0, 0, 0, 'Não diagnosticado', 'Aguardando preenchimento'
        )
      `;
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Lead convertido com sucesso em cliente do Mapa!', 
      data: {
        login: email,
        senha_padrao: DEFAULT_PASSWORD
      }
    });

  } catch (error: any) {
    console.error('[api/mapa/convert-lead] Erro:', error);
    return NextResponse.json({ error: error?.message || 'Erro interno ao converter lead' }, { status: 500 });
  }
}
