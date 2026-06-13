import { Router } from 'express';
import authRoutes from './auth';
import userRoutes from './users';
import categoryRoutes from './categories';
import productRoutes from './products';
import floorRoutes from './floors';
import customerRoutes from './customers';
import couponRoutes from './coupons';
import promotionRoutes from './promotions';
import paymentMethodRoutes from './paymentMethods';
import sessionRoutes from './sessions';
import orderRoutes from './orders';
import reportRoutes from './reports';
import receiptEmailRoutes from './receiptEmail';

const router = Router();

router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/categories', categoryRoutes);
router.use('/products', productRoutes);
router.use('/floors', floorRoutes);
router.use('/customers', customerRoutes);
router.use('/coupons', couponRoutes);
router.use('/promotions', promotionRoutes);
router.use('/payment-methods', paymentMethodRoutes);
router.use('/sessions', sessionRoutes);
router.use('/orders', orderRoutes);
router.use('/reports', reportRoutes);
router.use('/receipt-email', receiptEmailRoutes);

export default router;
