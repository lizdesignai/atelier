// src/middlewares/auth.ts
import { Request, Response, NextFunction } from 'express';
import { supabase } from '../config/supabase';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

export async function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Acesso negado. Token de autorização em falta.' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error || !user) {
      res.status(401).json({ error: 'Token inválido ou expirado.' });
      return;
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Erro ao validar token de acesso.' });
  }
}
