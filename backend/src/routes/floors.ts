import { Router } from 'express';
import { getFloors, createFloor, updateFloor, deleteFloor, getTables, createTable, updateTable, deleteTable } from '../controllers/floorController';
import { protect, adminOnly } from '../middleware/auth';

const router = Router();
router.get('/', protect, getFloors);
router.post('/', protect, adminOnly, createFloor);
router.put('/:id', protect, adminOnly, updateFloor);
router.delete('/:id', protect, adminOnly, deleteFloor);

router.get('/tables', protect, getTables);
router.post('/tables', protect, adminOnly, createTable);
router.put('/tables/:id', protect, updateTable);
router.delete('/tables/:id', protect, adminOnly, deleteTable);
export default router;
