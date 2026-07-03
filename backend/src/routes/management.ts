import { Router } from 'express';
import { ManagementController } from '../controllers/ManagementController';

const router = Router();

router.get('/pulse', ManagementController.getPulseDashboard);

export default router;
