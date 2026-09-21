import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import bcrypt from 'bcryptjs';

const DEFAULT_PASSWORD = 'Atelier2026!'; // The standard password

export async function POST(request: Request) {
  try {
    const body = await request.json();

    // Verificação de segurança: O Asaas envia esse header para confirmar que é ele mesmo
    const tokenAsaas = request.headers.get('asaas-access-token');
    if (tokenAsaas !== process.env.ASAAS_WEBHOOK_TOKEN) {
      console.warn("Tentativa de acesso não autorizado ao Webhook do Asaas");
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { event, payment } = body;

    // Apenas nos importamos quando o pagamento for recebido ou confirmado
    if (event !== 'PAYMENT_RECEIVED' && event !== 'PAYMENT_CONFIRMED') {
      return NextResponse.json({ received: true });
    }

    // Identificação do Produto pelo Asaas. 
    // DICA: No painel do Asaas, ao criar o Link de Pagamento, coloque a tag na 'Descrição' ou 'Referência Externa'
    const description = (payment.description || '').toLowerCase();
    const externalRef = (payment.externalReference || '').toLowerCase();
    
    let serviceType = 'Identidade Visual';
    let recurrence = 'Único';

    if (description.includes('mapa') || externalRef.includes('mapa')) {
      serviceType = 'O Mapa';
      recurrence = 'Único';
    } else if (description.includes('gestão') || description.includes('instagram') || description.includes('recorrente') || externalRef.includes('insta')) {
      serviceType = 'Gestão de Instagram';
      recurrence = 'Mensal';
    } else {
      serviceType = 'Identidade Visual';
      recurrence = 'Único';
    }

    // Cliente
    const customerEmail = payment.customerEmail || payment.email;
    const customerName = payment.customerName || payment.name || 'Cliente Asaas';
    
    if (!customerEmail) {
      return NextResponse.json({ error: 'Email do cliente não encontrado no payload do Asaas' }, { status: 400 });
    }

    const sql = getDb();

    // 1. Apagar dos Leads (se existir)
    await sql`DELETE FROM leads WHERE email = ${customerEmail}`;

    // 2. Criar ou Atualizar Profile
    let users = await sql`SELECT id FROM profiles WHERE email = ${customerEmail}`;
    let clientId;

    if (users.length === 0) {
      // Cria o hash da senha padrão
      const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);

      const result = await sql`
        INSERT INTO profiles (id, email, nome, role, status, password_hash)
        VALUES (gen_random_uuid(), ${customerEmail}, ${customerName}, 'client', 'active', ${passwordHash})
        RETURNING id
      `;
      clientId = result[0].id;
    } else {
      clientId = users[0].id;
    }

    // 3. Criar ou Ativar Projeto
    let projects = await sql`SELECT id FROM projects WHERE client_id = ${clientId} AND service_type = ${serviceType}`;
    
    if (projects.length === 0) {
      // Inicia novo projeto
      await sql`
        INSERT INTO projects (client_id, service_type, status, payment_recurrence, financial_value)
        VALUES (${clientId}, ${serviceType}, 'active', ${recurrence}, ${payment.value || 0})
      `;
    } else {
      // Se for gestão recorrente e o projeto já existe, a mensalidade foi renovada!
      // Aqui podemos atualizar a data da última cobrança, status, etc.
      await sql`
        UPDATE projects 
        SET status = 'active', financial_value = ${payment.value || 0}
        WHERE id = ${projects[0].id}
      `;

      // NOTA: Para automação pesada de Gerenciamento, aqui você poderia fazer um INSERT na tabela 'tasks' 
      // recriando os 12 posts e 4 vídeos mensais para esse mês!
    }

    return NextResponse.json({ success: true, message: 'Onboarding financeiro processado com sucesso' });

  } catch (error: any) {
    console.error('Erro no Webhook do Asaas:', error);
    return NextResponse.json({ error: 'Erro interno ao processar webhook' }, { status: 500 });
  }
}
