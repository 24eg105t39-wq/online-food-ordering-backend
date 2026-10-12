import { Router } from 'express';
import {
  getFoods,
  getFoodById,
  addFoodReview,
  reviewSchema,
} from '../controllers/foodController';
import { optionalAuth, authenticateJwt } from '../middleware/auth';
import { validateBody } from '../middleware/validation';

const router = Router();

router.get('/', getFoods);
router.get('/:id', optionalAuth, getFoodById);
router.post('/:id/reviews', authenticateJwt, validateBody(reviewSchema), addFoodReview);

export default router;
