import { Router } from 'express';
import { getSessions, getCurrentSession, openSession, closeSession } from '../controllers/sessionController';
import { protect } from '../middleware/auth';

const router = Router();
router.use(protect);
router.get('/', getSessions);
router.get('/current', getCurrentSession);
router.post('/open', openSession);
router.post('/close', closeSession);
export default router;
