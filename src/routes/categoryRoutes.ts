import { Router } from 'express';
import { getCategories } from '../controllers/foodController';

const router = Router();

router.get('/', getCategories);

export default router;
