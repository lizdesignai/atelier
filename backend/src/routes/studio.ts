import { Router } from 'express';
import { StudioController } from '../controllers/StudioController';

const router = Router();

router.get('/project/:projectId', StudioController.getProjectDashboard);

export default router;
