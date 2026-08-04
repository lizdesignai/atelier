import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get('projectId');
    const startOfMonth = searchParams.get('start');
    const endOfMonth = searchParams.get('end');

    if (!projectId || !startOfMonth || !endOfMonth) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('tasks')
      .select('*, profiles:assigned_to(nome, avatar_url)')
      .eq('project_id', projectId)
      .gte('deadline', startOfMonth)
      .lte('deadline', endOfMonth)
      .order('deadline', { ascending: true });

    if (error) {
      console.error("Supabase Admin Error fetching tasks:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ tasks: data || [] }, { status: 200 });
  } catch (error: any) {
    console.error("API route error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
