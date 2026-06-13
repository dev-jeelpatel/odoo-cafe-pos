import { Router } from 'express';
import { getPromotions, createPromotion, updatePromotion, deletePromotion } from '../controllers/promotionController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();
router.get('/', protect, getPromotions);
router.post('/', protect, adminOnly, createPromotion);
router.put('/:id', protect, adminOnly, updatePromotion);
router.delete('/:id', protect, adminOnly, deletePromotion);
export default router;
