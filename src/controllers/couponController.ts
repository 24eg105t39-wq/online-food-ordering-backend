import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { store } from '../services/store';

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Coupon code is required'),
  subtotal: z.number().min(0, 'Subtotal is required'),
});

export async function validateCoupon(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const { code, subtotal } = req.body;
    const coupon = store.getCoupon(code);

    if (!coupon || !coupon.isActive) {
      res.status(404).json({
        success: false,
        message: 'Invalid or expired coupon code.',
      });
      return;
    }

    if (subtotal < coupon.minOrderAmount) {
      res.status(400).json({
        success: false,
        message: `Add items worth ₹${coupon.minOrderAmount - subtotal} more to apply ${coupon.code}. Minimum order is ₹${coupon.minOrderAmount}.`,
      });
      return;
    }

    let discountAmount = (subtotal * coupon.discountPercent) / 100;
    if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
      discountAmount = coupon.maxDiscountAmount;
    }

    discountAmount = Math.round(discountAmount * 100) / 100;

    res.status(200).json({
      success: true,
      message: `Coupon '${coupon.code}' applied! You save ₹${discountAmount}.`,
      data: {
        code: coupon.code,
        discountPercent: coupon.discountPercent,
        discountAmount,
        minOrderAmount: coupon.minOrderAmount,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getAvailableCoupons(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const coupons = store.getAllCoupons().filter((c) => c.isActive);
    res.status(200).json({
      success: true,
      count: coupons.length,
      data: coupons,
    });
  } catch (err) {
    next(err);
  }
}
