// src/lib/tessera/errors.ts
import { NextResponse } from 'next/server';

export class DomainError extends Error {
  constructor(
    public status: 400 | 401 | 403 | 404 | 409 | 422,
    message: string,
    public code?: string,
    public details?: unknown,
  ) {
    super(message);
    this.name = 'DomainError';
  }
}

export const badRequest = (m: string, details?: unknown) => new DomainError(400, m, 'bad_request', details);
export const forbidden = (m: string) => new DomainError(403, m, 'forbidden');
export const notFound = (m = 'Item não encontrado.') => new DomainError(404, m, 'not_found');
export const conflict = (m: string, code = 'conflict') => new DomainError(409, m, code);
export const unprocessable = (m: string, code = 'unprocessable', details?: unknown) =>
  new DomainError(422, m, code, details);

/** Converte qualquer erro em resposta HTTP; erros inesperados viram 500 sem vazar detalhes. */
export function toResponse(err: unknown, label = 'api') {
  if (err instanceof DomainError) {
    return NextResponse.json(
      { error: err.message, code: err.code, details: err.details },
      { status: err.status },
    );
  }
  console.error(`[tessera] ${label}:`, err);
  return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export const isUuid = (v: unknown): v is string => typeof v === 'string' && UUID_RE.test(v);

export function assertUuid(v: unknown, field = 'id'): string {
  if (!isUuid(v)) throw badRequest(`${field} inválido.`);
  return v;
}

export async function readJson(request: Request): Promise<Record<string, any>> {
  try {
    const body = await request.json();
    if (body === null || typeof body !== 'object' || Array.isArray(body)) throw new Error();
    return body as Record<string, any>;
  } catch {
    throw badRequest('Corpo da requisição deve ser um JSON válido.');
  }
}
