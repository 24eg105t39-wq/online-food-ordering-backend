import { Router } from 'express';
import { getWishlist, toggleWishlist } from '../controllers/wishlistController';
import { authenticateJwt } from '../middleware/auth';

const router = Router();

router.use(authenticateJwt);

router.get('/', getWishlist);
router.post('/toggle', toggleWishlist);

export default router;
