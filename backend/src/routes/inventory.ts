import { Router } from 'express';
import { protect as authenticate } from '../middleware/auth';
import {
  getDashboard, getCategories, createCategory, updateCategory, deleteCategory,
  getItems, getItem, createItem, updateItem, deleteItem, getItemMovements,
  getAdjustments, createAdjustment, approveAdjustment, rejectAdjustment,
  getValuation, getStockSummary, getLowStock, getExpiryReport, getMovementsReport,
} from '../controllers/inventoryController';

const router = Router();
router.use(authenticate);

router.get('/dashboard/summary', getDashboard);

router.get('/categories', getCategories);
router.post('/categories', createCategory);
router.put('/categories/:id', updateCategory);
router.delete('/categories/:id', deleteCategory);

router.get('/items', getItems);
router.post('/items', createItem);
router.get('/items/:id', getItem);
router.put('/items/:id', updateItem);
router.delete('/items/:id', deleteItem);
router.get('/items/:id/movements', getItemMovements);

router.get('/adjustments', getAdjustments);
router.post('/adjustments', createAdjustment);
router.put('/adjustments/:id/approve', approveAdjustment);
router.put('/adjustments/:id/reject', rejectAdjustment);

router.get('/valuation', getValuation);
router.get('/reports/stock-summary', getStockSummary);
router.get('/reports/low-stock', getLowStock);
router.get('/reports/expiry', getExpiryReport);
router.get('/reports/movements', getMovementsReport);

export default router;
