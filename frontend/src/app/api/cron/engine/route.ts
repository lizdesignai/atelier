import { NextResponse } from 'next/server';
import { AtelierPMEngine } from '../../../../lib/AtelierPMEngine';
import { getActiveManagers } from '@/lib/serverNotifications';

export async function GET(req: Request) {
  try {
    const managers = await getActiveManagers().catch(() => []);
    const systemAdminId = managers[0]?.id || '55a1f766-bd50-45bd-b0bc-9af8309faa58';

    await AtelierPMEngine.executeDailyWorkloadAllocation();
    await AtelierPMEngine.runDailyRiskMitigation(systemAdminId);
    await AtelierPMEngine.calibrateUnitEconomics(systemAdminId);
    await AtelierPMEngine.distributeUnassignedTasks();

    return NextResponse.json({ success: true, message: 'PM Engine execution complete' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
