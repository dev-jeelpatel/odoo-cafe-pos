import { Router } from 'express';
import { getPaymentMethods, togglePaymentMethod } from '../controllers/paymentMethodController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();
router.get('/', protect, getPaymentMethods);
router.put('/:id', protect, adminOnly, togglePaymentMethod);
export default router;
