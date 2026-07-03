import { Router } from 'express';
import { ProjectController } from '../controllers/ProjectController';

const router = Router();

router.get('/unified', ProjectController.getUnifiedWallet);
router.get('/agencies/subclients', ProjectController.getAgencySubclients);
router.get('/:id', ProjectController.getProject);

export default router;
