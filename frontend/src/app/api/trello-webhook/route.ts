import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function HEAD() {
  return NextResponse.json({ message: 'Webhook OK' }, { status: 200 });
}

export async function GET() {
  return NextResponse.json({ message: 'Webhook OK' }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    // Process Trello action
    if (body.action && body.action.type === 'createCard') {
      const card = body.action.data.card;
      const list = body.action.data.list;
      const board = body.action.data.board;

      if (!card || !list || !board) return NextResponse.json({ success: true });

      // Check in agency_subclients
      const { data: subclients, error } = await supabase
        .from('agency_subclients')
        .select('id, name, agency_id, trello_sync_list_ids')
        .contains('trello_sync_list_ids', [list.id]);

      if (error) {
        console.error('Error fetching subclients:', error);
        return NextResponse.json({ error: 'DB error' }, { status: 500 });
      }

      if (subclients && subclients.length > 0) {
        // Group by agency_id to prevent duplicate tasks if multiple subclients share the same list
        const processedAgencies = new Set<string>();
        
        for (const sub of subclients) {
          if (processedAgencies.has(sub.agency_id)) continue;
          processedAgencies.add(sub.agency_id);
          
          await supabase.from('tasks').insert({
            title: card.name,
            description: card.desc || '',
            project_id: sub.agency_id, // Setting project_id as agency_id
            agency_subclient_id: sub.id, // We just pick the first subclient that matched
            status: 'draft',
            stage: 'Fila de Produção',
            task_type: 'Planejamento/Copywriting',
            urgency: false,
          });
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook processing error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
