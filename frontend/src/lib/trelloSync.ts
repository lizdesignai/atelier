// src/lib/trelloSync.ts
import { supabase } from "./supabase";

const TRELLO_API_KEY = process.env.NEXT_PUBLIC_TRELLO_API_KEY;
const TRELLO_TOKEN = process.env.NEXT_PUBLIC_TRELLO_TOKEN;

/**
 * Extrai o ID do board a partir de uma URL do Trello.
 */
function extractBoardId(url: string): string | null {
  const match = url.match(/trello\.com\/b\/([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Tenta encontrar um card no Trello pelo nome e sincronizar a conclusão e o anexo.
 */
export async function syncTaskCompletionToTrello(task: any) {
  if (!TRELLO_API_KEY || !TRELLO_TOKEN) return;
  if (!task) return;

  try {

    // A URL do Trello pode estar no subcliente ou no projeto
    const trelloUrl = (task.agency_subclients as any)?.trello_url || (task.projects as any)?.trello_url;
    if (!trelloUrl) {
      console.log("[TrelloSync] Nenhum trello_url associado a esta tarefa.");
      return;
    }

    const boardId = extractBoardId(trelloUrl);
    if (!boardId) {
      console.log("[TrelloSync] URL do Trello inválida:", trelloUrl);
      return;
    }

    // 2. Buscar todos os cards abertos no board
    const cardsRes = await fetch(`https://api.trello.com/1/boards/${boardId}/cards?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`);
    if (!cardsRes.ok) {
      console.error("[TrelloSync] Erro ao buscar cards do board", await cardsRes.text());
      return;
    }
    const cards = await cardsRes.json();

    // 3. Encontrar o card com nome correspondente (parcial ou exato)
    const normalizedTaskTitle = task.title.toLowerCase().trim();
    const matchedCard = cards.find((c: any) => {
      const cardName = c.name.toLowerCase().trim();
      return cardName === normalizedTaskTitle || cardName.includes(normalizedTaskTitle) || normalizedTaskTitle.includes(cardName);
    });

    if (!matchedCard) {
      console.log("[TrelloSync] Nenhum card Trello encontrado correspondente ao título:", task.title);
      return;
    }

    const cardId = matchedCard.id;
    console.log(`[TrelloSync] Card encontrado: ${matchedCard.name} (ID: ${cardId})`);

    // 4. Marcar o card como concluído (dueComplete)
    // Se o card não tem due date, talvez possamos apenas adicionar um checklist item ou label, mas dueComplete=true é o padrão.
    await fetch(`https://api.trello.com/1/cards/${cardId}?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dueComplete: true })
    });

    // 5. Upar a mídia como anexo, se houver
    if (task.attachment_url) {
      // Verifica se o anexo já existe para não duplicar (busca attachments do card)
      const attRes = await fetch(`https://api.trello.com/1/cards/${cardId}/attachments?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`);
      const attachments = attRes.ok ? await attRes.json() : [];
      const alreadyAttached = attachments.some((a: any) => a.url === task.attachment_url || a.name === 'Atelier Final Media');
      
      if (!alreadyAttached) {
        await fetch(`https://api.trello.com/1/cards/${cardId}/attachments?key=${TRELLO_API_KEY}&token=${TRELLO_TOKEN}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: 'Atelier Final Media',
            url: task.attachment_url
          })
        });
        console.log("[TrelloSync] Mídia anexada com sucesso ao card Trello.");
      }
    }
    
    console.log("[TrelloSync] Sincronização concluída com sucesso.");
  } catch (err) {
    console.error("[TrelloSync] Exceção na sincronização:", err);
  }
}
