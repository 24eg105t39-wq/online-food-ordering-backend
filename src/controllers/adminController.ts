import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { store } from '../services/store';

export const foodItemSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  description: z.string().min(5, 'Description is required'),
  price: z.number().positive('Price must be greater than 0'),
  originalPrice: z.number().positive().optional().nullable(),
  categoryId: z.string().min(1, 'Category is required'),
  image: z.string().url('Valid image URL is required'),
  isVeg: z.boolean().default(true),
  isAvailable: z.boolean().default(true),
  prepTimeMinutes: z.number().int().positive().default(20),
  calories: z.number().int().optional().nullable(),
  spicyLevel: z.number().int().min(0).max(3).default(1),
  tags: z.string().optional().nullable(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum([
    'PENDING',
    'CONFIRMED',
    'PREPARING',
    'OUT_FOR_DELIVERY',
    'DELIVERED',
    'CANCELLED',
  ]),
});

export const couponCreateSchema = z.object({
  code: z.string().min(3, 'Coupon code must be at least 3 characters'),
  discountPercent: z.number().min(1).max(100),
  maxDiscountAmount: z.number().positive().optional().nullable(),
  minOrderAmount: z.number().min(0).default(0),
  isActive: z.boolean().default(true),
});

export async function getStats(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const stats = store.getAdminStats();
    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminOrders(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { status } = req.query;
    const orders = store.getAllOrders(status as string);
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateOrderStatus(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const updated = store.updateOrderStatus(id, status);

    if (!updated) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Order status updated to ${status}`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function createFood(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const category = store.getCategoryById(req.body.categoryId);
    const categoryName = category ? category.name : undefined;

    const newFood = store.createFood({
      ...req.body,
      categoryName,
      rating: 4.8,
      reviewsCount: 1,
    });

    res.status(201).json({
      success: true,
      message: 'Food item added successfully!',
      data: newFood,
    });
  } catch (err) {
    next(err);
  }
}

export async function updateFood(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const existing = store.getFoodById(id);
    if (!existing) {
      res.status(404).json({ success: false, message: 'Food item not found' });
      return;
    }

    let categoryName = existing.categoryName;
    if (req.body.categoryId) {
      const cat = store.getCategoryById(req.body.categoryId);
      if (cat) categoryName = cat.name;
    }

    const updated = store.updateFood(id, {
      ...req.body,
      categoryName,
    });

    res.status(200).json({
      success: true,
      message: 'Food item updated successfully!',
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteFood(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const deleted = store.deleteFood(id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Food item not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Food item deleted successfully',
    });
  } catch (err) {
    next(err);
  }
}

export async function toggleFoodAvailability(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const updated = store.toggleFoodAvailability(id);
    if (!updated) {
      res.status(404).json({ success: false, message: 'Food item not found' });
      return;
    }

    res.status(200).json({
      success: true,
      message: `Food item is now ${updated.isAvailable ? 'available' : 'unavailable'}`,
      data: updated,
    });
  } catch (err) {
    next(err);
  }
}

export async function createCategory(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { name, slug, description, image } = req.body;
    const cat = store.createCategory(
      name,
      slug || name.toLowerCase().replace(/\s+/g, '-'),
      description,
      image
    );
    res.status(201).json({
      success: true,
      message: 'Category created',
      data: cat,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAdminCoupons(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const coupons = store.getAllCoupons();
    res.status(200).json({ success: true, count: coupons.length, data: coupons });
  } catch (err) {
    next(err);
  }
}

export async function createCoupon(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const id = `cpn_${Date.now()}`;
    const coupon = store.createCoupon({
      ...req.body,
      id,
    });
    res.status(201).json({
      success: true,
      message: 'Coupon created successfully',
      data: coupon,
    });
  } catch (err) {
    next(err);
  }
}

export async function deleteCoupon(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code } = req.params;
    const deleted = store.deleteCoupon(code);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Coupon not found' });
      return;
    }
    res.status(200).json({ success: true, message: 'Coupon deleted' });
  } catch (err) {
    next(err);
  }
}

export async function getUsers(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const users = store.getAllUsers().map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      phone: u.phone,
      role: u.role,
      createdAt: u.createdAt,
    }));
    res.status(200).json({ success: true, count: users.length, data: users });
  } catch (err) {
    next(err);
  }
}

export async function updateUserRole(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { id } = req.params;
    const { role } = req.body;
    if (!['CUSTOMER', 'ADMIN'].includes(role)) {
      res.status(400).json({ success: false, message: 'Invalid role' });
      return;
    }
    const updated = store.updateUserRole(id, role);
    if (!updated) {
      res.status(404).json({ success: false, message: 'User not found' });
      return;
    }
    res.status(200).json({
      success: true,
      message: `User role updated to ${role}`,
      data: { id: updated.id, name: updated.name, role: updated.role },
    });
  } catch (err) {
    next(err);
  }
}
