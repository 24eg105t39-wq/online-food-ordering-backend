import { Router } from 'express';
import {
  validateCoupon,
  getAvailableCoupons,
  validateCouponSchema,
} from '../controllers/couponController';
import { validateBody } from '../middleware/validation';

const router = Router();

router.get('/', getAvailableCoupons);
router.post('/validate', validateBody(validateCouponSchema), validateCoupon);

export default router;
