import { Router } from 'express';
import { ChatController } from '../controllers/ChatController';

const router = Router();

router.get('/history/:channelId', ChatController.getHistory);
router.post('/ping', ChatController.ping);

export default router;
