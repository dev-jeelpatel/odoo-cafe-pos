import { Router } from 'express';
import { protect as authenticate } from '../middleware/auth';
import { getRecipes, getRecipe, getRecipeByProduct, upsertRecipe, deleteRecipe } from '../controllers/recipeController';

const router = Router();
router.use(authenticate);
router.get('/', getRecipes);
router.post('/', upsertRecipe);
router.get('/product/:productId', getRecipeByProduct);
router.get('/:id', getRecipe);
router.put('/:id', upsertRecipe);
router.delete('/:id', deleteRecipe);
export default router;
