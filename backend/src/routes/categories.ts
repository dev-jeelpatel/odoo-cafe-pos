import { Router, Request, Response, NextFunction } from 'express';
import { getCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController';
import { protect, adminOnly } from '../middleware/auth';

const cacheFor60s = (_req: Request, res: Response, next: NextFunction) => {
  res.setHeader('Cache-Control', 'private, max-age=60, stale-while-revalidate=300');
  next();
};

const router = Router();
router.get('/', protect, cacheFor60s, getCategories);
router.post('/', protect, adminOnly, createCategory);
router.put('/:id', protect, adminOnly, updateCategory);
router.delete('/:id', protect, adminOnly, deleteCategory);
export default router;
