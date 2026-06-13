import { Router } from 'express';
import { getDashboard, getAuditLogs } from '../controllers/reportController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();
router.get('/dashboard', protect, getDashboard);
router.get('/audit-logs', protect, adminOnly, getAuditLogs);
export default router;
