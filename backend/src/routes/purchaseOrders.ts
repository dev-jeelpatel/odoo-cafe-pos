import { Router } from 'express';
import { protect as authenticate } from '../middleware/auth';
import { getPOs, getPO, createPO, updatePO, sendPO, deletePO, getGRNs, getGRN, createGRN } from '../controllers/purchaseOrderController';

const router = Router();
router.use(authenticate);
router.get('/', getPOs);
router.post('/', createPO);
router.get('/:id', getPO);
router.put('/:id', updatePO);
router.post('/:id/send', sendPO);
router.delete('/:id', deletePO);
export default router;

export const grnRouter = Router();
grnRouter.use(authenticate);
grnRouter.get('/', getGRNs);
grnRouter.post('/', createGRN);
grnRouter.get('/:id', getGRN);
