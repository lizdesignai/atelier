import { Router } from 'express';
import { TaskController } from '../controllers/TaskController';

const router = Router();

router.get('/', TaskController.getTasks);
router.post('/', TaskController.createTask);
router.get('/:id/email-action', TaskController.handleEmailAction);
router.patch('/:id/status', TaskController.updateTaskStatus);
router.patch('/:id', TaskController.updateTask);
router.delete('/:id', TaskController.deleteTask);

export default router;
