// src/app/api/webhooks/asaas/route.ts
// Route Handler do Webhook do Asaas integrado ao Sistema Financeiro v2.

import { NextResponse } from 'next/server';
import { processAsaasWebhook } from '@/lib/finance/asaasWebhookService';

export async function POST(request: Request) {
  try {
    const tokenAsaas = request.headers.get('asaas-access-token');
    const body = await request.json().catch(() => null);

    if (!body) {
      return NextResponse.json(
        { error: 'Corpo da requisição inválido' },
        { status: 400 }
      );
    }

    const result = await processAsaasWebhook(body, tokenAsaas);
    return NextResponse.json(result, { status: 200 });
  } catch (error: any) {
    console.error('Erro no processamento do Webhook do Asaas:', error);

    if (error.message === 'UNAUTHORIZED_ASAAS_TOKEN') {
      return NextResponse.json(
        { error: 'Não autorizado: Token do Asaas inválido ou não configurado' },
        { status: 401 }
      );
    }

    if (error.message?.startsWith('INVALID_PAYMENT_PAYLOAD')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Erro interno no processamento do webhook' },
      { status: 500 }
    );
  }
}
