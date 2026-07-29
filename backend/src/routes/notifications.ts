import { Router } from 'express';
import { NotificationController } from '../controllers/NotificationController';

const router = Router();

// /api/v1/notifications/email
router.post('/email', NotificationController.sendEmail);

export default router;
