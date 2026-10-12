import { Router } from 'express';
import {
  register,
  login,
  getMe,
  registerSchema,
  loginSchema,
} from '../controllers/authController';
import { authenticateJwt } from '../middleware/auth';
import { validateBody } from '../middleware/validation';

const router = Router();

router.post('/register', validateBody(registerSchema), register);
router.post('/login', validateBody(loginSchema), login);
router.get('/me', authenticateJwt, getMe);

export default router;
