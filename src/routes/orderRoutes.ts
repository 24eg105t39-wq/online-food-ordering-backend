import { Router } from 'express';
import {
  createOrder,
  getUserOrders,
  getOrderById,
  trackOrder,
  createOrderSchema,
} from '../controllers/orderController';
import { authenticateJwt } from '../middleware/auth';
import { validateBody } from '../middleware/validation';

const router = Router();

router.use(authenticateJwt);

router.post('/', validateBody(createOrderSchema), createOrder);
router.get('/', getUserOrders);
router.get('/:id', getOrderById);
router.get('/:id/track', trackOrder);

export default router;
