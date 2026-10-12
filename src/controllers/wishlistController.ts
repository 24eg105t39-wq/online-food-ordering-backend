import { Response, NextFunction } from 'express';
import { store } from '../services/store';
import { AuthenticatedRequest } from '../middleware/auth';

export async function getWishlist(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const items = store.getUserWishlist(req.user.id);
    res.status(200).json({ success: true, count: items.length, data: items });
  } catch (err) {
    next(err);
  }
}

export async function toggleWishlist(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }
    const { foodItemId } = req.body;
    if (!foodItemId) {
      res.status(400).json({ success: false, message: 'Food item ID is required' });
      return;
    }

    const result = store.toggleWishlist(req.user.id, foodItemId);
    res.status(200).json({
      success: true,
      message: result.isInWishlist
        ? 'Added to your favorites'
        : 'Removed from your favorites',
      data: result,
    });
  } catch (err) {
    next(err);
  }
}
