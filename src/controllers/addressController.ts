import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { store } from '../services/store';
import { AuthenticatedRequest } from '../middleware/auth';

export const addressSchema = z.object({
  label: z.string().default('Home'),
  recipientName: z.string().min(2, 'Recipient name is required'),
  street: z.string().min(5, 'Street address is required'),
  city: z.string().min(2, 'City is required'),
  state: z.string().min(2, 'State is required'),
  postalCode: z.string().min(4, 'Postal code is required'),
  phone: z.string().min(8, 'Phone number is required'),
  isDefault: z.boolean().optional().default(false),
});

export async function getAddresses(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const addresses = store.getUserAddresses(req.user.id);
    res.status(200).json({ success: true, data: addresses });
  } catch (err) {
    next(err);
  }
}

export async function createAddress(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const address = store.createAddress(req.user.id, req.body);
    res.status(201).json({
      success: true,
      message: 'Address saved successfully',
      data: address,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateAddress(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { id } = req.params;
    const updated = store.updateAddress(id, req.user.id, req.body);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Address not found' });
      return;
    }
    res.status(200).json({ success: true, data: updated });
  } catch (err) {
    next(err);
  }
}

export async function deleteAddress(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { id } = req.params;
    const deleted = store.deleteAddress(id, req.user.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Address not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Address deleted' });
  } catch (err) {
    next(err);
  }
}
