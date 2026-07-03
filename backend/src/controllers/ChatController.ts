import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export class ChatController {
  
  // GET /api/v1/chat/history/:channelId
  static async getHistory(req: Request, res: Response) {
    try {
      const { channelId } = req.params;

      if (!channelId) {
        return res.status(400).json({ error: 'Missing channelId' });
      }

      // Fetch the last 150 messages for performance (we can paginate later if needed)
      const { data, error } = await supabase
        .from('messages')
        .select('*, profiles(id, nome, avatar_url, role)')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .limit(150);

      if (error) throw error;

      // Normaliza o retorno dos profiles (Supabase as vezes retorna array, as vezes objeto dependendo da FK)
      const formattedMessages = data.map((m: any) => ({
        ...m,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      }));

      // Inverte o array porque pedimos DESC no supabase para pegar as mais recentes, 
      // mas o frontend espera ASC (cronológico)
      const chronologicalMessages = formattedMessages.reverse();

      return res.status(200).json({ data: chronologicalMessages });
    } catch (error: any) {
      console.error('Error fetching chat history:', error.message);
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }

  // POST /api/v1/chat/ping
  static async ping(req: Request, res: Response) {
    try {
      const { userId } = req.body;
      if (!userId) return res.status(400).json({ error: 'Missing userId' });

      // Atualiza o last_seen silenciosamente
      const { error } = await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;
      
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
