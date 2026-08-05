// src/controllers/ChatController.ts
import { Request, Response } from 'express';
import { supabase } from '../config/supabase';

export class ChatController {
  
  // GET /api/v1/chat/history/:channelId
  static async getHistory(req: Request, res: Response) {
    try {
      const { channelId } = req.params;
      const { limit = '150', offset = '0' } = req.query;

      if (!channelId) {
        return res.status(400).json({ error: 'Missing channelId' });
      }

      // Otimização: Seleção de colunas explícitas e limite seguro com offset para paginação opcional
      const limitVal = Math.min(parseInt(String(limit)) || 150, 300);
      const offsetVal = parseInt(String(offset)) || 0;

      const { data, error } = await supabase
        .from('messages')
        .select('id, channel_id, sender_id, text_content, attachment_url, created_at, parent_id, profiles(id, nome, avatar_url, role), parent:messages!parent_id(id, text_content, sender_id)')
        .eq('channel_id', channelId)
        .order('created_at', { ascending: false })
        .range(offsetVal, offsetVal + limitVal - 1);

      if (error) throw error;

      // Normaliza o retorno dos profiles
      const formattedMessages = data.map((m: any) => ({
        ...m,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles
      }));

      // Inverte o array para ordem cronológica (ASC)
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
