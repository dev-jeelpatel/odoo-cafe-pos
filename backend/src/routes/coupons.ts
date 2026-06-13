import { Router } from 'express';
import { getCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon } from '../controllers/couponController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();
router.get('/', protect, getCoupons);
router.post('/', protect, adminOnly, createCoupon);
router.put('/:id', protect, adminOnly, updateCoupon);
router.delete('/:id', protect, adminOnly, deleteCoupon);
router.get('/validate/:code', protect, validateCoupon);
export default router;
