import { Router } from 'express';
import { getSessions, getCurrentSession, getCurrentSessionSummary, openSession, closeSession } from '../controllers/sessionController';
import { protect } from '../middleware/auth';

const router = Router();
router.use(protect);
router.get('/', getSessions);
router.get('/current', getCurrentSession);
router.get('/current/summary', getCurrentSessionSummary);
router.post('/open', openSession);
router.post('/close', closeSession);
export default router;
