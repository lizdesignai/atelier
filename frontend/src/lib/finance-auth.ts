// src/lib/finance-auth.ts
// Helper de autenticação e autorização para Route Handlers financeiros (Fase 1).

import { getAuthUser } from './auth-server';
import { can, isFinanceRole, type FinanceCapability } from './rbac';
import { type AuthPayload } from './auth';

export interface FinanceAuthResult {
  authorized: boolean;
  status: number;
  error?: string;
  user?: AuthPayload;
}

export async function requireFinanceAccess(
  capability?: FinanceCapability
): Promise<FinanceAuthResult> {
  const user = await getAuthUser();

  if (!user) {
    return {
      authorized: false,
      status: 401,
      error: 'Não autenticado.',
    };
  }

  if (capability) {
    if (!can(user.role, capability)) {
      return {
        authorized: false,
        status: 403,
        error: `Acesso negado: seu perfil (${user.role}) não possui a permissão '${capability}'.`,
        user,
      };
    }
  } else if (!isFinanceRole(user.role)) {
    return {
      authorized: false,
      status: 403,
      error: `Acesso negado: seu perfil (${user.role}) não tem acesso ao módulo financeiro.`,
      user,
    };
  }

  return {
    authorized: true,
    status: 200,
    user,
  };
}
