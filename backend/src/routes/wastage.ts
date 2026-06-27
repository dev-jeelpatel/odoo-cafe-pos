import { Router } from 'express';
import { protect as authenticate } from '../middleware/auth';
import {
  getReasons, createReason, getWastageDashboard, getEntries, getEntry,
  createEntry, updateEntry, approveEntry, rejectEntry, deleteEntry, getWastageSummary,
} from '../controllers/wastageController';

const router = Router();
router.use(authenticate);
router.get('/dashboard', getWastageDashboard);
router.get('/reasons', getReasons);
router.post('/reasons', createReason);
router.get('/reports/summary', getWastageSummary);
router.get('/', getEntries);
router.post('/', createEntry);
router.get('/:id', getEntry);
router.put('/:id', updateEntry);
router.put('/:id/approve', approveEntry);
router.put('/:id/reject', rejectEntry);
router.delete('/:id', deleteEntry);
export default router;
