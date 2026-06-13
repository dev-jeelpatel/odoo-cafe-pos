import { Router } from 'express';
import { getMenu, createOrder, getOrderStatus } from '../controllers/publicController';

const router = Router();
router.get('/menu', getMenu);
router.post('/orders', createOrder);
router.get('/orders/:id', getOrderStatus);

export default router;
