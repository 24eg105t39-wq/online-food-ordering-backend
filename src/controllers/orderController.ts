import { Response, NextFunction } from 'express';
import { z } from 'zod';
import { store } from '../services/store';
import { AuthenticatedRequest } from '../middleware/auth';

export const createOrderSchema = z.object({
  items: z
    .array(
      z.object({
        foodItemId: z.string().min(1, 'Food item ID is required'),
        quantity: z.number().int().min(1, 'Quantity must be at least 1'),
      })
    )
    .min(1, 'Order must contain at least one item'),
  deliveryAddress: z.object({
    recipientName: z.string().min(2, 'Recipient name is required'),
    street: z.string().min(5, 'Street address is required'),
    city: z.string().min(2, 'City is required'),
    state: z.string().min(2, 'State is required'),
    postalCode: z.string().min(4, 'Postal code is required'),
    phone: z.string().min(8, 'Phone number is required'),
  }),
  couponCode: z.string().optional(),
  paymentMethod: z.enum(['COD', 'ONLINE']),
  deliveryInstructions: z.string().optional(),
});

export async function createOrder(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const order = store.createOrder(req.user, req.body);

    res.status(201).json({
      success: true,
      message: 'Order placed successfully!',
      data: order,
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      message: (err as Error).message || 'Failed to create order',
    });
  }
}

export async function getUserOrders(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: 'Authentication required' });
      return;
    }

    const orders = store.getUserOrders(req.user.id);
    res.status(200).json({
      success: true,
      count: orders.length,
      data: orders,
    });
  } catch (err) {
    next(err);
  }
}

export async function getOrderById(
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
    const order = store.getOrderById(id);

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    // Security check: only order owner or admin can view
    if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
      res.status(403).json({
        success: false,
        message: 'Access denied: You do not have permission to view this order.',
      });
      return;
    }

    res.status(200).json({
      success: true,
      data: order,
    });
  } catch (err) {
    next(err);
  }
}

export async function trackOrder(
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
    const order = store.getOrderById(id);

    if (!order) {
      res.status(404).json({ success: false, message: 'Order not found' });
      return;
    }

    if (order.userId !== req.user.id && req.user.role !== 'ADMIN') {
      res.status(403).json({ success: false, message: 'Access denied' });
      return;
    }

    // Step calculation
    const steps = [
      {
        key: 'PENDING',
        label: 'Order Placed',
        description: 'We have received your order.',
        isCompleted: true,
        isCurrent: order.status === 'PENDING',
      },
      {
        key: 'CONFIRMED',
        label: 'Confirmed by Restaurant',
        description: 'Chef has accepted your order.',
        isCompleted:
          ['CONFIRMED', 'PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(
            order.status
          ),
        isCurrent: order.status === 'CONFIRMED',
      },
      {
        key: 'PREPARING',
        label: 'Kitchen is Cooking',
        description: 'Fresh ingredients being prepared with care.',
        isCompleted:
          ['PREPARING', 'OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status),
        isCurrent: order.status === 'PREPARING',
      },
      {
        key: 'OUT_FOR_DELIVERY',
        label: 'Out for Delivery',
        description: 'Delivery partner Ramesh Kumar is on the way.',
        isCompleted: ['OUT_FOR_DELIVERY', 'DELIVERED'].includes(order.status),
        isCurrent: order.status === 'OUT_FOR_DELIVERY',
      },
      {
        key: 'DELIVERED',
        label: 'Delivered',
        description: 'Enjoy your delicious meal!',
        isCompleted: order.status === 'DELIVERED',
        isCurrent: order.status === 'DELIVERED',
      },
    ];

    res.status(200).json({
      success: true,
      data: {
        orderId: order.id,
        orderNumber: order.orderNumber,
        status: order.status,
        estimatedDeliveryMinutes: order.estimatedDeliveryMinutes,
        deliveryPartner: {
          name: 'Ramesh Kumar',
          phone: '+91 9845012345',
          vehicle: 'Honda Activa (KA-03-EM-4821)',
          rating: 4.9,
        },
        steps,
        order,
      },
    });
  } catch (err) {
    next(err);
  }
}
