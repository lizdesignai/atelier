import { NextResponse } from 'next/server';
import { AtelierPMEngine } from '../../../../lib/AtelierPMEngine';

export async function GET(req: Request) {
  // Security: Check auth header if needed, though Vercel handles cron auth
  try {
    const systemAdminId = 'YOUR_ADMIN_UUID_HERE'; // The ID to receive alerts

    await AtelierPMEngine.executeDailyWorkloadAllocation();
    await AtelierPMEngine.runDailyRiskMitigation(systemAdminId);
    await AtelierPMEngine.calibrateUnitEconomics(systemAdminId);
    await AtelierPMEngine.distributeUnassignedTasks(); // Ensure nothing gets stuck

    return NextResponse.json({ success: true, message: 'PM Engine execution complete' });
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}