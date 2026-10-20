// src/lib/tessera/authHelper.ts
// Autenticação + autorização do Tessera.
// Papel é lido do banco (profiles.role), não do JWT, para refletir mudanças imediatamente.
import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyToken, COOKIE_NAME } from '@/lib/auth';
import { getDb } from '@/lib/db';
import { getDefaultOrganization } from './tesseraDb';
import type { TesseraOrganization } from './types';

export type TesseraAccess = 'team' | 'manager';

// O Tessera é restrito exclusivamente à alta direção: gestores e administradores. Colaboradores operam via Focus (/admin/jtbd).
const ALLOWED_TESSERA_ROLES = new Set(['admin', 'gestor']);
const MANAGER_ROLES = new Set(['admin', 'gestor']);

export interface TesseraUser {
  id: string;
  nome: string | null;
  email: string | null;
  role: string;
  cargo: string | null;
  avatar_url: string | null;
}

export interface TesseraAuthOk {
  ok: true;
  user: TesseraUser;
  organization: TesseraOrganization;
  isManager: boolean;
}

export interface TesseraAuthFail {
  ok: false;
  status: 401 | 403;
  error: string;
}

export type TesseraAuthResult = TesseraAuthOk | TesseraAuthFail;

/**
 * Exige sessão válida e papel de equipe ('team') ou de gestão ('manager').
 * Clientes e contadores nunca passam, mesmo com JWT válido.
 */
export async function requireTessera(access: TesseraAccess = 'team'): Promise<TesseraAuthResult> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;
  if (!token) return { ok: false, status: 401, error: 'Não autenticado.' };

  let payload;
  try {
    payload = await verifyToken(token);
  } catch {
    return { ok: false, status: 401, error: 'Sessão expirada ou inválida.' };
  }
  if (payload.type !== 'session' || !payload.sub) {
    return { ok: false, status: 401, error: 'Sessão incompleta.' };
  }

  const sql = getDb();
  const rows = await sql.query(
    `SELECT id, nome, email, role, cargo, avatar_url, contract_status
       FROM public.profiles WHERE id = $1 LIMIT 1;`,
    [payload.sub]
  );
  const profile = rows[0] as (TesseraUser & { contract_status?: string | null }) | undefined;
  if (!profile) return { ok: false, status: 401, error: 'Usuário não encontrado.' };

  if (!ALLOWED_TESSERA_ROLES.has(profile.role)) {
    return { ok: false, status: 403, error: 'Acesso restrito a gestores e administradores.' };
  }
  if (profile.contract_status === 'dismissed') {
    return { ok: false, status: 403, error: 'Contrato encerrado.' };
  }

  const isManager = MANAGER_ROLES.has(profile.role);
  if (access === 'manager' && !isManager) {
    return { ok: false, status: 403, error: 'Ação restrita a gestores.' };
  }

  const organization = await getDefaultOrganization();
  return { ok: true, user: profile, organization, isManager };
}

export function authError(fail: TesseraAuthFail | TesseraAuthResult) {
  const f = fail as TesseraAuthFail;
  return NextResponse.json({ error: f.error || 'Não autorizado.' }, { status: f.status || 401 });
}

/** Compat: mantém a assinatura usada pelas rotas da Onda 1. */
export async function getTesseraAuth() {
  const r = await requireTessera('team');
  if (r.ok === false) return { user: null, organization: null, error: r.error };
  return { user: r.user, organization: r.organization, error: null };
}
