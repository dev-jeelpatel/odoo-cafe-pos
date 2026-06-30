import { Router } from 'express';
import { signup, login, getMe, logout } from '../controllers/authController';
import { protect } from '../middleware/auth';
import { validate, signupSchema, loginSchema } from '../schemas';

const router = Router();
router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);
export default router;
