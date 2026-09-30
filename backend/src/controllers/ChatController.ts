import { Request, Response } from 'express';
import { neon } from '@neondatabase/serverless';

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

      const sql = neon(process.env.POSTGRES_URL || '');

      const data = await sql`
        SELECT 
          m.id, 
          m.channel_id, 
          m.sender_id, 
          m.text_content, 
          m.attachment_url, 
          m.created_at, 
          m.parent_id,
          CASE WHEN p.id IS NOT NULL THEN json_build_object('id', p.id, 'nome', p.nome, 'avatar_url', p.avatar_url, 'role', p.role) ELSE null END as profiles,
          CASE WHEN pm.id IS NOT NULL THEN json_build_object('id', pm.id, 'text_content', pm.text_content, 'sender_id', pm.sender_id) ELSE null END as parent
        FROM messages m
        LEFT JOIN profiles p ON m.sender_id = p.id
        LEFT JOIN messages pm ON m.parent_id = pm.id
        WHERE m.channel_id = ${channelId}
        ORDER BY m.created_at DESC
        LIMIT ${limitVal} OFFSET ${offsetVal}
      `;

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

      const sql = neon(process.env.POSTGRES_URL || '');

      // Atualiza o last_seen silenciosamente
      await sql`
        UPDATE profiles 
        SET last_seen = ${new Date().toISOString()} 
        WHERE id = ${userId}
      `;
      
      return res.status(200).json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: 'Internal Server Error' });
    }
  }
}
