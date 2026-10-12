import { Router } from 'express';
import {
  getStats,
  getAdminOrders,
  updateOrderStatus,
  createFood,
  updateFood,
  deleteFood,
  toggleFoodAvailability,
  createCategory,
  getAdminCoupons,
  createCoupon,
  deleteCoupon,
  getUsers,
  updateUserRole,
  foodItemSchema,
  updateOrderStatusSchema,
  couponCreateSchema,
} from '../controllers/adminController';
import { authenticateJwt, requireAdmin } from '../middleware/auth';
import { validateBody } from '../middleware/validation';

const router = Router();

// Protect all admin endpoints
router.use(authenticateJwt, requireAdmin);

// Dashboard stats
router.get('/stats', getStats);

// Orders management
router.get('/orders', getAdminOrders);
router.patch('/orders/:id/status', validateBody(updateOrderStatusSchema), updateOrderStatus);

// Food items management
router.post('/foods', validateBody(foodItemSchema), createFood);
router.put('/foods/:id', validateBody(foodItemSchema.partial()), updateFood);
router.delete('/foods/:id', deleteFood);
router.patch('/foods/:id/toggle', toggleFoodAvailability);

// Categories
router.post('/categories', createCategory);

// Coupons
router.get('/coupons', getAdminCoupons);
router.post('/coupons', validateBody(couponCreateSchema), createCoupon);
router.delete('/coupons/:code', deleteCoupon);

// Users
router.get('/users', getUsers);
router.patch('/users/:id/role', updateUserRole);

export default router;
