import { Router } from 'express';
import { protect as authenticate } from '../middleware/auth';
import { getSuppliers, getSupplier, createSupplier, updateSupplier, deleteSupplier } from '../controllers/supplierController';

const router = Router();
router.use(authenticate);
router.get('/', getSuppliers);
router.post('/', createSupplier);
router.get('/:id', getSupplier);
router.put('/:id', updateSupplier);
router.delete('/:id', deleteSupplier);
export default router;
