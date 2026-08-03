import { Router } from 'express';
import { AssignmentController } from '../controllers/AssignmentController';

const router = Router();

router.get('/all', AssignmentController.getAllAssignments);
router.get('/:collaboratorId', AssignmentController.getCollaboratorAssignments);
router.post('/', AssignmentController.assignCollaborator);
router.delete('/:id', AssignmentController.removeAssignment);

export default router;
