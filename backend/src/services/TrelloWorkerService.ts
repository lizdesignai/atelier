import { supabase } from '../config/supabase';
import { NotificationService } from './NotificationService';

const TRELLO_API_KEY = process.env.NEXT_PUBLIC_TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.NEXT_PUBLIC_TRELLO_TOKEN;

/**
 * Extrai o ID do board a partir de uma URL do Trello.
 */
function extractBoardId(url: string): string | null {
  const match = url.match(/trello\.com\/b\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

export class TrelloWorkerService {
  private static intervalId: NodeJS.Timeout | null = null;

  static start(intervalMs: number = 300000) { // Default 5 minutes
    if (this.intervalId) return;
    console.log(`[TrelloWorker] Serviço de automação do Trello iniciado (intervalo: ${intervalMs / 1000 / 60} min)`);
    
    // Executa a primeira checagem após 15 segundos da inicialização para não competir com outros workers no boot
    setTimeout(() => {
      this.syncTrelloDemands();
    }, 15000);

    this.intervalId = setInterval(() => {
      this.syncTrelloDemands();
    }, intervalMs);
  }

  private static async syncTrelloDemands() {
    if (!TRELLO_API_KEY || !TRELLO_TOKEN) {
      console.log('[TrelloWorker] Credenciais do Trello não configuradas.');
      return;
    }

    try {
      console.log('[TrelloWorker] Verificando novas demandas...');

      // Buscar projects e agency_subclients que possuem trello_sync_list_ids configurados
      const [ { data: projects }, { data: subclients } ] = await Promise.all([
        supabase.from('projects').select('id, client_id, name, trello_url, trello_sync_list_ids').not('trello_sync_list_ids', 'is', null),
        supabase.from('agency_subclients').select('id, agency_id, name, trello_url, trello_sync_list_ids').not('trello_sync_list_ids', 'is', null)
      ]);

      const processSync = async (entity: any, isSubclient: boolean) => {
        // Ignorar arrays vazios de trello_sync_list_ids
        if (!entity.trello_url || !entity.trello_sync_list_ids || entity.trello_sync_list_ids.length === 0) return;

        const boardId = extractBoardId(entity.trello_url);
        if (!boardId) return;

        for (const listId of entity.trello_sync_list_ids) {
          try {
            const cardsRes = await fetch(`https://api.trello.com/1/lists/${listId}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`);
            if (!cardsRes.ok) continue;
            const cards = await cardsRes.json();

            for (const card of cards) {
              // Verifica se já existe uma demanda (task) com esse trello_card_id
              const { data: existingTask } = await supabase
                .from('tasks')
                .select('id')
                .eq('trello_card_id', card.id)
                .maybeSingle();

              if (!existingTask) {
                // Criar nova demanda
                const taskPayload: any = {
                  title: card.name,
                  status: 'pendente',
                  priority: 'Média',
                  task_type: 'Outros',
                  trello_card_id: card.id
                };

                if (isSubclient) {
                  taskPayload.agency_subclient_id = entity.id;
                  taskPayload.client_id = entity.agency_id;
                } else {
                  taskPayload.project_id = entity.id;
                  taskPayload.client_id = entity.client_id;
                }

                const { data: newTask, error } = await supabase
                  .from('tasks')
                  .insert(taskPayload)
                  .select('id')
                  .single();

                if (!error && newTask) {
                  console.log(`[TrelloWorker] Demanda criada: ${card.name} para ${entity.name}`);

                  // Notifica administradores / gestores
                  const emailUsersRes = await supabase.from('profiles').select('email').in('role', ['Administrador', 'Líder']);
                  if (emailUsersRes.data) {
                    const emails = emailUsersRes.data.map(u => u.email).filter(Boolean);
                    if (emails.length > 0) {
                      await NotificationService.sendNotification({
                        to: emails,
                        type: 'new_demand',
                        clientName: entity.name,
                        taskName: card.name,
                        link: '/admin/jtbd'
                      });
                    }
                  }
                } else {
                  console.error('[TrelloWorker] Erro ao criar demanda:', error);
                }
              }
            }
          } catch (listErr) {
            console.error(`[TrelloWorker] Erro ao buscar lista ${listId}:`, listErr);
          }
        }
      };

      const promises = [];
      if (projects) {
        for (const p of projects) promises.push(processSync(p, false));
      }
      if (subclients) {
        for (const s of subclients) promises.push(processSync(s, true));
      }

      await Promise.all(promises);

    } catch (error) {
      console.error('[TrelloWorker] Erro geral na sincronização:', error);
    }
  }
}
