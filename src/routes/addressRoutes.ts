import { Router } from 'express';
import {
  getAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  addressSchema,
} from '../controllers/addressController';
import { authenticateJwt } from '../middleware/auth';
import { validateBody } from '../middleware/validation';

const router = Router();

router.use(authenticateJwt);

router.get('/', getAddresses);
router.post('/', validateBody(addressSchema), createAddress);
router.put('/:id', validateBody(addressSchema.partial()), updateAddress);
router.delete('/:id', deleteAddress);

export default router;
