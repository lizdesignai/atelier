import { Router } from 'express';
import { FocusController } from '../controllers/FocusController';

const router = Router();

router.get('/urgent/:collaboratorId', FocusController.getUrgentFocus);
router.get('/monthly/:collaboratorId', FocusController.getMonthlyFocus);
router.get('/assigned-clients/:collaboratorId', FocusController.getAssignedClients);

export default router;
