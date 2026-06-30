import { Router } from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../controllers/productController';
import { protect, adminOnly } from '../middleware/auth';
import { validate, createProductSchema, updateProductSchema } from '../schemas';

const router = Router();
router.get('/', protect, getProducts);
router.post('/', protect, adminOnly, validate(createProductSchema), createProduct);
router.put('/:id', protect, adminOnly, validate(updateProductSchema), updateProduct);
router.patch('/:id', protect, adminOnly, validate(updateProductSchema), updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);
export default router;
