import { Router } from 'express';
import { getUsers, createUser, updateUser, changePassword, archiveUser, deleteUser } from '../controllers/userController';
import { protect, adminOnly } from '../middleware/auth';
import { validate, createUserSchema, updateUserSchema, changePasswordSchema } from '../schemas';

const router = Router();
router.use(protect, adminOnly);
router.get('/', getUsers);
router.post('/', validate(createUserSchema), createUser);
router.put('/:id', validate(updateUserSchema), updateUser);
router.put('/:id/password', validate(changePasswordSchema), changePassword);
router.put('/:id/archive', archiveUser);
router.delete('/:id', deleteUser);
export default router;
