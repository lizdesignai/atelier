import { Request, Response } from 'express';
import { NotificationService } from '../services/NotificationService';

export class NotificationController {
  static async sendEmail(req: Request, res: Response) {
    try {
      const params = req.body;
      
      // params deve conter: to, type, taskName, projectName, extraInfo, link
      if (!params || !params.to || !params.type) {
        return res.status(400).json({ error: 'Parâmetros "to" e "type" são obrigatórios' });
      }

      const result = await NotificationService.sendNotification(params);

      if (result.success) {
        return res.status(200).json(result);
      } else {
        return res.status(500).json({ error: result.error });
      }
    } catch (error: any) {
      console.error('[NotificationController] Erro:', error);
      return res.status(500).json({ error: 'Erro interno ao processar notificação' });
    }
  }
}
