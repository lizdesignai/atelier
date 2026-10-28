// src/app/api/cron/finance/route.ts
// Route Handler do Cron Diário de Automação e Notificações Financeiras (Fase 7).

import { NextResponse } from 'next/server';
import { generateMonthlyRecurringEntries } from '@/lib/finance/recurrenceService';
import { dispatchFinancialAlertNotifications, getFinancialAlerts } from '@/lib/finance/alertsService';
import { getAuthUser } from '@/lib/auth-server';
import { isFinanceRole } from '@/lib/rbac';

function isAuthorized(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = request.headers.get('authorization');
  const url = new URL(request.url);
  const tokenParam = url.searchParams.get('token');

  // 1. Verificação via Bearer Token ou Query Param
  if (cronSecret && cronSecret.trim() !== '') {
    if (authHeader === `Bearer ${cronSecret}` || tokenParam === cronSecret) {
      return true;
    }
  }

  // 2. Vercel Cron envia header próprio
  if (request.headers.get('x-vercel-cron') === 'true') {
    return true;
  }

  return false;
}

export async function GET(request: Request) {
  return handleCronExecution(request);
}

export async function POST(request: Request) {
  return handleCronExecution(request);
}

async function handleCronExecution(request: Request) {
  try {
    let authorized = isAuthorized(request);

    // Se não tiver secret de cron, valida se é contadora/admin/gestor autenticado
    if (!authorized) {
      const user = await getAuthUser();
      if (user && isFinanceRole(user.role)) {
        authorized = true;
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { error: 'Não autorizado para executar o cron financeiro' },
        { status: 401 }
      );
    }

    const startTime = Date.now();

    // 1. Provisiona faturamentos recorrentes da competência corrente
    const recurrenceResult = await generateMonthlyRecurringEntries();

    // 2. Dispara notificações dos alertas contábeis e fiscais do dia
    const notificationResult = await dispatchFinancialAlertNotifications();

    // 3. Obtém o estado atual dos alertas
    const alertsSummary = await getFinancialAlerts();

    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      executionTimeMs: durationMs,
      recurrence: {
        competenceMonth: recurrenceResult.competenceMonth,
        generatedCount: recurrenceResult.generatedCount,
        skippedCount: recurrenceResult.skippedCount,
        totalAmountProvisioned: recurrenceResult.totalAmountProvisioned,
      },
      notifications: {
        dispatchedCount: notificationResult.dispatchedCount,
        recipientCount: notificationResult.recipientCount,
      },
      alerts: {
        totalAlertsCount: alertsSummary.totalAlertsCount,
        hasUrgentAlerts: alertsSummary.hasUrgentAlerts,
        items: alertsSummary.alerts,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Erro na execução do Cron Financeiro:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Falha ao executar o cron financeiro',
      },
      { status: 500 }
    );
  }
}
