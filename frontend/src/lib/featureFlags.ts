// src/lib/featureFlags.ts
// Controle centralizado de Feature Flags (Fase 0).
// Permite ativar o novo sistema financeiro (FINANCE_V2) de forma gradual sem quebrar a operação legada.

export interface FeatureFlagsEnv {
  NEXT_PUBLIC_FINANCE_V2?: string;
  FINANCE_V2?: string;
  [key: string]: string | undefined;
}

export function isFinanceV2Enabled(
  env: FeatureFlagsEnv = process.env,
  override?: boolean | null
): boolean {
  if (typeof override === 'boolean') {
    return override;
  }

  const raw = (env.NEXT_PUBLIC_FINANCE_V2 ?? env.FINANCE_V2 ?? '').trim().toLowerCase();
  return raw === 'true' || raw === '1' || raw === 'yes' || raw === 'on';
}
