import { Router } from 'express';
import { getDashboard } from '../controllers/reportController';
import { protect } from '../middleware/auth';

const router = Router();
router.get('/dashboard', protect, getDashboard);
export default router;
