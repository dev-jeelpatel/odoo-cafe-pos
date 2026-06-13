import { Router } from 'express';
import { getUsers, createUser, updateUser, changePassword, archiveUser, deleteUser } from '../controllers/userController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();
router.use(protect, adminOnly);
router.get('/', getUsers);
router.post('/', createUser);
router.put('/:id', updateUser);
router.put('/:id/password', changePassword);
router.put('/:id/archive', archiveUser);
router.delete('/:id', deleteUser);
export default router;
