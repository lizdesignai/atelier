// src/app/api/motion-studio/route.ts
import { NextRequest, NextResponse } from 'next/server';

const idempotencyStore = new Map<string, { timestamp: number; response: any }>();

function makeDomainError(
  code: string,
  message: string,
  recoverable: boolean,
  status = 400
) {
  const correlationId = `corr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
  return NextResponse.json(
    {
      error: {
        code,
        message,
        recoverable,
        correlationId,
      },
    },
    { status }
  );
}

export async function GET(req: NextRequest) {
  const correlationId = `corr_${Date.now().toString(36)}`;
  const { searchParams } = new URL(req.url);
  const resource = searchParams.get('resource') || 'health';

  return NextResponse.json({
    ok: true,
    service: 'Veronna Motion Studio API',
    version: '1.0.0',
    resource,
    correlationId,
    capabilities: {
      maxFileSizeBytes: 25 * 1024 * 1024,
      fixedMotionDurationMs: 5000,
      fixedMotionFps: 30,
      supportedFormats: ['svg', 'png', 'mp4'],
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const idempotencyKey = req.headers.get('x-idempotency-key');
    if (idempotencyKey && idempotencyStore.has(idempotencyKey)) {
      const cached = idempotencyStore.get(idempotencyKey)!;
      if (Date.now() - cached.timestamp < 60_000) {
        return NextResponse.json({ ...cached.response, idempotentReplay: true });
      }
    }

    const body = await req.json();
    const { action, payload } = body || {};
    const correlationId = `corr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;

    if (!action) {
      return makeDomainError(
        'SVG_INVALID_XML',
        'Ação da API não informada no payload.',
        true,
        400
      );
    }

    const resultPayload = {
      ok: true,
      action,
      correlationId,
      processedAt: new Date().toISOString(),
      schemaVersion: 1,
      receivedSummary: payload ? Object.keys(payload) : [],
    };

    if (idempotencyKey) {
      idempotencyStore.set(idempotencyKey, {
        timestamp: Date.now(),
        response: resultPayload,
      });
    }

    return NextResponse.json(resultPayload);
  } catch {
    return makeDomainError(
      'SVG_INVALID_XML',
      'Payload JSON inválido ou malformado na requisição.',
      true,
      400
    );
  }
}
