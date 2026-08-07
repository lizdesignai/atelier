import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const projectId = searchParams.get('projectId');
  const subclientId = searchParams.get('subclientId');

  if (!projectId && !subclientId) {
    return NextResponse.json({ error: 'Missing projectId or subclientId' }, { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  
  if (!supabaseUrl || !supabaseServiceKey) {
    return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
  }

  // Create admin client to bypass RLS so collaborators can read the assets
  const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

  try {
    let query = supabaseAdmin.from('project_assets').select('*').order('created_at', { ascending: false });
    
    if (subclientId) {
      query = query.eq('subclient_id', subclientId);
    } else {
      const validProjId = searchParams.get('validProjId');
      if (validProjId) {
        query = query.or(`project_id.eq.${validProjId},project_id.eq.${projectId}`);
      } else {
        query = query.eq('project_id', projectId);
      }
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("API /api/assets error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
