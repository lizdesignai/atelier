// src/lib/finance/alertsService.ts
// Motor de Alertas Contábeis, Vencimentos, DAS e Notificações (Fase 7).

import { getDb } from '../db';
import { sendStudioEmail } from '../serverNotifications';
import type { FinanceCapability } from '../rbac';

export interface FinancialAlert {
  id: string;
  category: 'payable_due_soon' | 'receivable_overdue' | 'tax_due_soon' | 'period_closing_pending';
  priority: 'high' | 'medium' | 'urgent';
  title: string;
  message: string;
  actionUrl: string;
  count?: number;
  totalAmount?: number;
}

export interface FinancialAlertsSummary {
  date: string;
  totalAlertsCount: number;
  hasUrgentAlerts: boolean;
  alerts: FinancialAlert[];
}

/**
 * Calcula a competência do mês anterior no formato YYYY-MM.
 */
export function getPreviousMonth(date = new Date()): string {
  const d = new Date(date.getFullYear(), date.getMonth() - 1, 1);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

/**
 * Motor puro de apuração dos alertas contábeis e fiscais do dia.
 */
export async function getFinancialAlerts(referenceDate = new Date()): Promise<FinancialAlertsSummary> {
  const sql = getDb();
  const alerts: FinancialAlert[] = [];
  const todayStr = referenceDate.toISOString().slice(0, 10);
  const currentDay = referenceDate.getDate();
  const prevMonth = getPreviousMonth(referenceDate);

  // 1. Contas a Pagar Vencendo nos Próximos 3 Dias
  const payablesDueSoon = await sql`
    SELECT
      COUNT(*)::int AS count,
      COALESCE(SUM(amount), 0)::numeric(14,2) AS total_amount
    FROM fin_entries
    WHERE kind = 'expense'
      AND status = 'pending'
      AND due_date >= ${todayStr}::date
      AND due_date <= (${todayStr}::date + INTERVAL '3 days')
  `;
  const payableCount = Number(payablesDueSoon[0]?.count || 0);
  const payableAmount = Number(payablesDueSoon[0]?.total_amount || 0);

  if (payableCount > 0) {
    alerts.push({
      id: `payable_due_soon_${todayStr}`,
      category: 'payable_due_soon',
      priority: 'high',
      title: `${payableCount} conta(s) a pagar vencem em até 3 dias`,
      message: `Total de R$ ${payableAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} com vencimento iminente. Realize as baixas ou agendamentos bancários.`,
      actionUrl: '/admin/financeiro/pagar',
      count: payableCount,
      totalAmount: payableAmount,
    });
  }

  // 2. Contas a Receber Inadimplentes / Vencidas
  const receivablesOverdue = await sql`
    SELECT
      COUNT(*)::int AS count,
      COALESCE(SUM(amount), 0)::numeric(14,2) AS total_amount
    FROM fin_entries
    WHERE kind = 'revenue'
      AND status = 'pending'
      AND due_date < ${todayStr}::date
  `;
  const overdueCount = Number(receivablesOverdue[0]?.count || 0);
  const overdueAmount = Number(receivablesOverdue[0]?.total_amount || 0);

  if (overdueCount > 0) {
    alerts.push({
      id: `receivable_overdue_${todayStr}`,
      category: 'receivable_overdue',
      priority: 'urgent',
      title: `${overdueCount} recebimento(s) em atraso (Inadimplência)`,
      message: `R$ ${overdueAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} pendentes de cobrança. Verifique clientes e envie lembretes de pagamento.`,
      actionUrl: '/admin/financeiro/receber',
      count: overdueCount,
      totalAmount: overdueAmount,
    });
  }

  // 3. Alerta Fiscal — Guia DAS do Simples Nacional (Vencimento Dia 20)
  // O DAS vence dia 20. Se estivermos entre o dia 14 e o dia 20, verifica pagamento da competência anterior
  if (currentDay >= 14 && currentDay <= 20) {
    const dasObligation = await sql`
      SELECT id, status, amount, due_date
      FROM fin_tax_obligations
      WHERE (tax_type ILIKE '%DAS%' OR tax_type ILIKE '%Simples%')
        AND competence = ${prevMonth}
      ORDER BY created_at DESC
      LIMIT 1
    `;

    const isPaid = dasObligation.length > 0 && dasObligation[0].status === 'paid';

    if (!isPaid) {
      const dasAmount = dasObligation.length > 0 ? Number(dasObligation[0].amount) : 0;
      alerts.push({
        id: `tax_das_${prevMonth}`,
        category: 'tax_due_soon',
        priority: 'urgent',
        title: `Vencimento do DAS (Simples Nacional) da competência ${prevMonth}`,
        message: `O DAS vence dia 20! ${
          dasAmount > 0
            ? `Valor previsto: R$ ${dasAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}.`
            : 'Emita a guia no portal do Simples Nacional e anexe o comprovante.'
        }`,
        actionUrl: '/admin/financeiro/impostos',
        totalAmount: dasAmount,
      });
    }
  }

  // 4. Lembrete de Fechamento Contábil Mensal
  // Entre os dias 1 e 10 de cada mês, alertar para fechar a competência anterior
  if (currentDay >= 1 && currentDay <= 10) {
    const closedPeriod = await sql`
      SELECT id, status
      FROM fin_periods
      WHERE closing_month = ${prevMonth} AND status = 'closed'
      LIMIT 1
    `;

    if (closedPeriod.length === 0) {
      alerts.push({
        id: `period_closing_${prevMonth}`,
        category: 'period_closing_pending',
        priority: 'high',
        title: `Fechamento Contábil de ${prevMonth} pendente`,
        message: `Início de mês: concilie lançamentos, despesas e receitas de ${prevMonth} e execute o fechamento contábil para congelar a DRE.`,
        actionUrl: '/admin/financeiro/fechamento',
      });
    }
  }

  return {
    date: todayStr,
    totalAlertsCount: alerts.length,
    hasUrgentAlerts: alerts.some((a) => a.priority === 'urgent'),
    alerts,
  };
}

/**
 * Dispara notificações in-app para os usuários contábeis (contador, gestor, admin)
 * registrando na tabela `notifications` do banco de forma deduplicada nas últimas 24h.
 */
export async function dispatchFinancialAlertNotifications(
  referenceDate = new Date()
): Promise<{ dispatchedCount: number; recipientCount: number }> {
  const sql = getDb();
  const summary = await getFinancialAlerts(referenceDate);

  if (summary.alerts.length === 0) {
    return { dispatchedCount: 0, recipientCount: 0 };
  }

  // 1. Busca os líderes e contadora
  const recipients = await sql`
    SELECT id, email, role, nome
    FROM profiles
    WHERE role IN ('contador', 'gestor', 'admin')
      AND COALESCE(contract_status, 'active') != 'inactive'
  `;

  if (recipients.length === 0) {
    return { dispatchedCount: 0, recipientCount: 0 };
  }

  let dispatchedCount = 0;
  const newlyDispatchedAlerts: FinancialAlert[] = [];

  for (const alert of summary.alerts) {
    let sentForAlert = false;
    for (const user of recipients) {
      // 2. Deduplicação: verifica se já notificou esse usuário sobre o mesmo título nas últimas 24h
      const existing = await sql`
        SELECT id FROM notifications
        WHERE user_id = ${user.id}
          AND title = ${alert.title}
          AND created_at >= (NOW() - INTERVAL '24 hours')
        LIMIT 1
      `;

      if (existing.length === 0) {
        await sql`
          INSERT INTO notifications (
            id, user_id, title, message, type, is_read, action_url, created_at
          ) VALUES (
            gen_random_uuid(),
            ${user.id},
            ${alert.title},
            ${alert.message},
            ${alert.priority === 'urgent' ? 'error' : 'warning'},
            FALSE,
            ${alert.actionUrl},
            NOW()
          )
        `;
        dispatchedCount++;
        sentForAlert = true;
      }
    }
    if (sentForAlert) {
      newlyDispatchedAlerts.push(alert);
    }
  }

  // 3. Dispara e-mail consolidado via Resend para contadora e gestores quando houver novos alertas
  if (newlyDispatchedAlerts.length > 0) {
    try {
      const recipientEmails = recipients
        .map((r: any) => r.email)
        .filter(Boolean);

      if (recipientEmails.length > 0) {
        const alertLines = newlyDispatchedAlerts
          .map(
            (a) =>
              `<div style="background-color:${a.priority === 'urgent' ? '#fef2f2' : '#faf9f6'}; border-left:3px solid ${a.priority === 'urgent' ? '#dc2626' : '#a45037'}; padding:10px 14px; border-radius:8px; margin-bottom:10px; text-align:left;">` +
              `<strong>${a.title}</strong><br/><span style="font-size:13px; color:#52525b;">${a.message}</span></div>`
          )
          .join('');

        await sendStudioEmail({
          to: recipientEmails,
          type: 'financial_alert',
          templateData: {
            subject: `[Financeiro] ${newlyDispatchedAlerts.length} alerta(s) operacional(is) — Studio Veronna`,
            body: `Identificamos <strong>${newlyDispatchedAlerts.length} pendência(s) financeira(s)</strong> que requerem acompanhamento da gestão e contabilidade:<br/><br/>${alertLines}`,
            link: '/admin/financeiro/alertas',
          },
        });
      }
    } catch (emailErr) {
      console.warn('[FinanceAlerts] Falha ao enviar e-mail de alerta financeiro:', emailErr);
    }
  }

  return {
    dispatchedCount,
    recipientCount: recipients.length,
  };
}
