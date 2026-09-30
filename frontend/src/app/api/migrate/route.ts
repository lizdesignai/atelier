import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const sql = getDb();
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS idv_product VARCHAR(20);`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS idv_complexity VARCHAR(5);`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS idv_capacity_weight NUMERIC DEFAULT 1.5;`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS production_start_date DATE;`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS presentation_target_date DATE;`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS delivery_target_date DATE;`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS client_wait_hours INTEGER DEFAULT 0;`;
    await sql`ALTER TABLE projects ADD COLUMN IF NOT EXISTS ready_checklist JSONB DEFAULT '{}';`;
    
    await sql`
      UPDATE projects 
      SET idv_product = 'IDV-CORE', idv_complexity = 'C2', ready_checklist = '{"contract": true, "payment": true, "briefing": true, "assets": true, "meeting_scheduled": true}'::jsonb
      WHERE service_type = 'Identidade Visual' AND idv_product IS NULL;
    `;

    return NextResponse.json({ success: true, message: 'Fase 1 Migrate OK' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
