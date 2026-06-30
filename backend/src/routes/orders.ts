import { Router } from 'express';
import {
  getOrders, getOrder, createOrder, updateOrder,
  applyCoupon, applyPromotions, sendToKitchen,
  updateKitchenStatus, updateItemKitchenStatus,
  processPayment, cancelOrder, deleteOrder,
} from '../controllers/orderController';
import { protect } from '../middleware/auth';
import { validate, createOrderSchema } from '../schemas';

const router = Router();
router.use(protect);
router.get('/', getOrders);
router.get('/:id', getOrder);
router.post('/', validate(createOrderSchema), createOrder);
router.put('/:id', updateOrder);
router.post('/apply-coupon', applyCoupon);
router.post('/apply-promotions', applyPromotions);
router.post('/:id/send-to-kitchen', sendToKitchen);
router.put('/:id/kitchen-status', updateKitchenStatus);
router.put('/:id/items/:itemId/kitchen-complete', updateItemKitchenStatus);
router.post('/:id/payment', processPayment);
router.put('/:id/cancel', cancelOrder);
router.delete('/:id', deleteOrder);
export default router;
