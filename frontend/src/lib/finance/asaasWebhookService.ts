// src/lib/finance/asaasWebhookService.ts
// Processamento Seguro, Idempotente e Contábil de Webhooks do Asaas (Fase 7).

import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { getDb } from '../db';
import { logFinanceAudit } from './auditService';
import type { FinEntry, FinSettlement } from '../../types/finance';

export interface AsaasPaymentPayload {
  id: string;
  customer?: string;
  customerEmail?: string;
  email?: string;
  customerName?: string;
  name?: string;
  value: number;
  netValue?: number;
  originalValue?: number;
  interestValue?: number;
  billingType?: string; // 'PIX' | 'BOLETO' | 'CREDIT_CARD' | 'UNDEFINED'
  status?: string;
  description?: string;
  externalReference?: string;
  confirmedDate?: string;
  paymentDate?: string;
  dueDate?: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  transactionReceiptUrl?: string;
  [key: string]: any;
}

export interface AsaasWebhookEvent {
  event: string;
  payment: AsaasPaymentPayload;
  [key: string]: any;
}

export interface ProcessAsaasResult {
  success: boolean;
  action: 'processed' | 'ignored_event' | 'already_processed';
  idempotent?: boolean;
  entryId?: string;
  settlementId?: string;
  clientId?: string;
  projectId?: string;
  message: string;
}

/**
 * Validação rigorosa do token de webhook enviado pelo Asaas.
 */
export function verifyAsaasWebhookToken(tokenHeader: string | null | undefined): boolean {
  const expectedToken = process.env.ASAAS_WEBHOOK_TOKEN;
  
  // Em ambiente de teste, permitir mock se ASAAS_WEBHOOK_TOKEN não estiver na env
  if (process.env.NODE_ENV === 'test' && !expectedToken) {
    return tokenHeader === 'test-webhook-token';
  }

  // Em produção/homologação, o token deve estar obrigatoriamente configurado
  if (!expectedToken || expectedToken.trim() === '') {
    return false;
  }

  return tokenHeader === expectedToken;
}

/**
 * Processa um webhook recebido do Asaas garantindo:
 * 1. Idempotência estrita (chave única external_ref).
 * 2. Segurança contra senhas padrão fixas.
 * 3. Preservação do valor contratual de projetos existentes (sem sobrescrever).
 * 4. Registro contábil completo em fin_entries e fin_settlements.
 */
export async function processAsaasWebhook(
  eventData: AsaasWebhookEvent,
  tokenHeader?: string | null
): Promise<ProcessAsaasResult> {
  // 1. Verificação de segurança
  if (!verifyAsaasWebhookToken(tokenHeader)) {
    throw new Error('UNAUTHORIZED_ASAAS_TOKEN');
  }

  const { event, payment } = eventData;

  // Apenas eventos de recebimento/confirmação financeira geram quitação contábil
  const receivableEvents = ['PAYMENT_RECEIVED', 'PAYMENT_CONFIRMED'];
  if (!receivableEvents.includes(event)) {
    return {
      success: true,
      action: 'ignored_event',
      message: `Evento '${event}' não requer liquidação financeira imediata.`,
    };
  }

  if (!payment || !payment.id) {
    throw new Error('INVALID_PAYMENT_PAYLOAD: payment.id ausente');
  }

  const sql = getDb();
  const entryExtRef = `asaas_pay_${payment.id}`;
  const settleExtRef = `asaas_settle_${payment.id}`;

  // 2. Verificação de Idempotência
  // Se a liquidação ou o lançamento com este external_ref já existe, retorna sem duplicar
  const existingSettlement = await sql`
    SELECT id, entry_id FROM fin_settlements WHERE external_ref = ${settleExtRef} LIMIT 1
  `;
  if (existingSettlement.length > 0) {
    return {
      success: true,
      action: 'already_processed',
      idempotent: true,
      settlementId: existingSettlement[0].id,
      entryId: existingSettlement[0].entry_id,
      message: 'Pagamento Asaas já processado e liquidado anteriormente (idempotente).',
    };
  }

  const existingEntry = await sql`
    SELECT id FROM fin_entries WHERE external_ref = ${entryExtRef} LIMIT 1
  `;

  // 3. Determinação do Serviço e Recorrência baseada nos metadados do pagamento
  const description = (payment.description || '').toLowerCase();
  const externalRef = (payment.externalReference || '').toLowerCase();

  let serviceType = 'Identidade Visual';
  let recurrence = 'Único';

  if (description.includes('mapa') || externalRef.includes('mapa')) {
    serviceType = 'O Mapa';
    recurrence = 'Único';
  } else if (
    description.includes('gestão') ||
    description.includes('instagram') ||
    description.includes('recorrente') ||
    description.includes('mensal') ||
    externalRef.includes('insta')
  ) {
    serviceType = 'Gestão de Instagram';
    recurrence = 'Mensal';
  }

  // 4. Identificação do Cliente
  const customerEmail = (payment.customerEmail || payment.email || '').trim().toLowerCase();
  const customerName = (payment.customerName || payment.name || 'Cliente Asaas').trim();

  if (!customerEmail) {
    throw new Error('INVALID_PAYMENT_PAYLOAD: E-mail do cliente não informado pelo Asaas');
  }

  // 4.1 Remove dos leads se houver
  await sql`DELETE FROM leads WHERE LOWER(email) = ${customerEmail}`;

  // 4.2 Cria ou busca perfil de cliente (SEM SENHA PADRÃO HARDCODED)
  let userRows = await sql`
    SELECT id, email, role FROM profiles WHERE LOWER(email) = ${customerEmail} LIMIT 1
  `;
  let clientId: string;

  if (userRows.length === 0) {
    // Gera senha aleatória forte e temporária com hash bcrypt
    const randomSecret = crypto.randomBytes(24).toString('hex');
    const passwordHash = await bcrypt.hash(randomSecret, 12);
    const resetToken = crypto.randomUUID();

    const newProfile = await sql`
      INSERT INTO profiles (
        id, email, nome, role, status, password_hash, password_reset_token, password_reset_expires
      ) VALUES (
        gen_random_uuid(),
        ${customerEmail},
        ${customerName},
        'client',
        'active',
        ${passwordHash},
        ${resetToken},
        NOW() + INTERVAL '48 hours'
      )
      RETURNING id
    `;
    clientId = newProfile[0].id;
  } else {
    clientId = userRows[0].id;
  }

  // 5. Criação ou Reativação de Projeto (PRESERVANDO FINANCIAL_VALUE EXISTENTE)
  let projectRows = await sql`
    SELECT id, financial_value, status
    FROM projects
    WHERE client_id = ${clientId} AND service_type = ${serviceType}
    LIMIT 1
  `;
  let projectId: string;

  const paymentValue = Number(payment.value || 0);

  if (projectRows.length === 0) {
    // Novo projeto criado com o valor da contratação inicial
    const newProject = await sql`
      INSERT INTO projects (
        client_id, service_type, status, payment_recurrence, financial_value
      ) VALUES (
        ${clientId}, ${serviceType}, 'active', ${recurrence}, ${paymentValue}
      )
      RETURNING id
    `;
    projectId = newProject[0].id;
  } else {
    projectId = projectRows[0].id;
    // IMPORTANTE: NÃO sobrescreve financial_value! Apenas reativa o projeto caso esteja pausado
    await sql`
      UPDATE projects
      SET status = 'active', updated_at = NOW()
      WHERE id = ${projectId}
    `;
  }

  // 6. Resolução de Contas Contábeis e Bancárias Padrão
  // 6.1 Conta de Receita (tipo 'revenue', ex: 1.1.01)
  const revenueAccountRows = await sql`
    SELECT id FROM fin_accounts
    WHERE type = 'revenue' AND is_active = TRUE
    ORDER BY code ASC
    LIMIT 1
  `;
  if (revenueAccountRows.length === 0) {
    throw new Error('CONFIGURATION_ERROR: Nenhuma conta contábil de receita cadastrada em fin_accounts');
  }
  const accountId = revenueAccountRows[0].id;

  // 6.2 Conta Bancária do Gateway / Padrão
  const bankRows = await sql`
    SELECT id FROM fin_bank_accounts
    WHERE (account_type = 'gateway' OR is_default = TRUE) AND is_active = TRUE
    ORDER BY is_default DESC
    LIMIT 1
  `;
  const bankAccountId = bankRows.length > 0 ? bankRows[0].id : null;

  // 7. Datas e Valores
  const today = new Date().toISOString().slice(0, 10);
  const paymentDate = (payment.confirmedDate || payment.paymentDate || today).slice(0, 10);
  const dueDate = (payment.dueDate || paymentDate).slice(0, 10);
  const competenceDate = paymentDate.slice(0, 7) + '-01';

  const grossAmount = paymentValue;
  const netAmount = Number((payment.netValue || grossAmount).toFixed(2));
  const feeAmount = Number(Math.max(0, grossAmount - netAmount).toFixed(2));

  let entryId: string;

  if (existingEntry.length > 0) {
    entryId = existingEntry[0].id;
    // Atualiza lançamento para pago
    await sql`
      UPDATE fin_entries
      SET
        status = 'paid',
        paid_date = ${paymentDate},
        amount_paid = ${grossAmount},
        updated_at = NOW()
      WHERE id = ${entryId}
    `;
  } else {
    // Cria lançamento de receita
    const title = `Pagamento Asaas — ${customerName} (${serviceType})`;
    const createdEntries = await sql`
      INSERT INTO fin_entries (
        kind,
        source,
        title,
        description,
        account_id,
        bank_account_id,
        client_id,
        project_id,
        competence_date,
        due_date,
        paid_date,
        amount,
        amount_paid,
        status,
        payment_method,
        external_ref,
        notes
      ) VALUES (
        'revenue',
        'asaas',
        ${title},
        ${payment.description || `Cobrança Asaas ID ${payment.id}`},
        ${accountId},
        ${bankAccountId},
        ${clientId},
        ${projectId},
        ${competenceDate},
        ${dueDate},
        ${paymentDate},
        ${grossAmount},
        ${grossAmount},
        'paid',
        ${payment.billingType || 'asaas'},
        ${entryExtRef},
        ${`Liquidado automaticamente via Webhook Asaas. ID: ${payment.id}`}
      )
      RETURNING id
    `;
    entryId = createdEntries[0].id;
  }

  // 8. Registro da Baixa Contábil (Settlement)
  const createdSettlement = await sql`
    INSERT INTO fin_settlements (
      entry_id,
      bank_account_id,
      payment_date,
      amount,
      fee_amount,
      net_amount,
      payment_method,
      external_ref,
      receipt_url,
      notes
    ) VALUES (
      ${entryId},
      ${bankAccountId},
      ${paymentDate},
      ${grossAmount},
      ${feeAmount},
      ${netAmount},
      ${payment.billingType || 'asaas'},
      ${settleExtRef},
      ${payment.transactionReceiptUrl || payment.invoiceUrl || null},
      ${`Cobrança Asaas ${payment.id} processada com taxa de R$ ${feeAmount.toFixed(2)}`}
    )
    RETURNING id
  `;
  const settlementId = createdSettlement[0].id;

  // 9. Atualizar saldo da conta bancária se vinculada
  if (bankAccountId) {
    await sql`
      UPDATE fin_bank_accounts
      SET current_balance = current_balance + ${netAmount}
      WHERE id = ${bankAccountId}
    `;
  }

  // 10. Trilha de Auditoria
  await logFinanceAudit({
    entity_type: 'fin_settlements',
    entity_id: settlementId,
    action: 'insert',
    after_state: {
      asaas_payment_id: payment.id,
      gross_amount: grossAmount,
      net_amount: netAmount,
      fee_amount: feeAmount,
      client_id: clientId,
      project_id: projectId,
    },
    reason: `Liquidação automática de recebimento Asaas (${payment.id})`,
    user_id: clientId,
  });

  return {
    success: true,
    action: 'processed',
    entryId,
    settlementId,
    clientId,
    projectId,
    message: 'Pagamento Asaas liquidado e contabilizado com sucesso.',
  };
}
