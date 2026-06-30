import { Router, Request, Response, NextFunction } from 'express';
import { getProducts, createProduct, updateProduct, deleteProduct } from '../controllers/productController';
import { protect, adminOnly } from '../middleware/auth';
import { validate, createProductSchema, updateProductSchema } from '../schemas';

const cacheFor60s = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
  next();
};

const router = Router();
router.get('/', protect, cacheFor60s, getProducts);
router.post('/', protect, adminOnly, validate(createProductSchema), createProduct);
router.put('/:id', protect, adminOnly, validate(updateProductSchema), updateProduct);
router.patch('/:id', protect, adminOnly, validate(updateProductSchema), updateProduct);
router.delete('/:id', protect, adminOnly, deleteProduct);
export default router;
