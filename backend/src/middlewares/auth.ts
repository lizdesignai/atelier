// src/middlewares/auth.ts
import { Request, Response, NextFunction } from 'express';
import { neon } from '@neondatabase/serverless';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Acesso negado. Token de autorização em falta.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const payloadBase64 = token.split('.')[1];
    if (!payloadBase64) throw new Error('Invalid token');
    
    const payloadJson = Buffer.from(payloadBase64, 'base64').toString('utf8');
    const payload = JSON.parse(payloadJson);
    const userId = payload.sub;

    if (!userId) {
      res.status(401).json({ error: 'Token inválido ou expirado.' });
      return;
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < currentTime) {
      res.status(401).json({ error: 'Token expirado.' });
      return;
    }

    const sql = neon(process.env.POSTGRES_URL || '');
    const users = await sql`SELECT * FROM auth.users WHERE id = ${userId}`;
    const user = users[0];

    if (!user) {
      res.status(401).json({ error: 'Token inválido ou expirado.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Erro ao validar token de acesso.' });
  }
}
