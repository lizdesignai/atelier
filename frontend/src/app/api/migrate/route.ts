import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-server';
import { getMigrationStatus, runPendingMigrations } from '@/lib/migrations';

/**
 * GET /api/migrate
 * Somente leitura (status das migrações) e restrito exclusivamente a administradores.
 */
export async function GET() {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Apenas administradores podem consultar migrações.' },
        { status: 403 }
      );
    }

    const status = await getMigrationStatus();
    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

/**
 * POST /api/migrate
 * Executa as migrações pendentes em db/migrations, restrito exclusivamente a administradores.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Não autenticado.' }, { status: 401 });
    }
    if (user.role !== 'admin') {
      return NextResponse.json(
        { success: false, error: 'Apenas administradores podem executar migrações.' },
        { status: 403 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const result = await runPendingMigrations({
      appliedBy: user.email || user.sub,
      dryRun: Boolean(body?.dryRun),
    });

    return NextResponse.json({
      success: true,
      message: result.dryRun ? 'Simulação (dry-run) concluída.' : 'Migrações executadas com sucesso.',
      ...result,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
