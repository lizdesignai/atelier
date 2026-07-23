import { Router } from 'express';
import { AnalyticsController } from '../controllers/AnalyticsController';

const router = Router();

router.get('/dashboard', AnalyticsController.getDashboardData);
router.post('/clear-cache', AnalyticsController.clearCache);

export default router;
