import { Router } from 'express';
import { getCompletedOrders, sendReceiptEmail } from '../controllers/receiptEmailController';
import { protect } from '../middleware/auth';

const router = Router();
router.get('/', protect, getCompletedOrders);
router.post('/:orderId/send', protect, sendReceiptEmail);
export default router;
