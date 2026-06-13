import { Router } from 'express';
import { getMenu, createOrder, getOrderStatus, sendOtp, verifyOtp } from '../controllers/publicController';

const router = Router();
router.get('/menu', getMenu);
router.post('/send-otp', sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/orders', createOrder);
router.get('/orders/:id', getOrderStatus);

export default router;
