import { Router } from 'express';
import { ClientsController } from '../controllers/ClientsController';

const router = Router();

router.get('/overview', ClientsController.getOverview);
router.post('/projects', ClientsController.createProject);

export default router;
