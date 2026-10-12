import { Role, OrderStatus, PaymentMethod, PaymentStatus } from '@prisma/client';

export type UserRole = 'CUSTOMER' | 'ADMIN';

export interface RestaurantData {
  id: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  bannerImage: string;
  rating: number;
  reviewsCount: number;
  cuisines: string[];
  address: string;
  latitude: number;
  longitude: number;
  deliveryTimeMinutes: number;
  deliveryFee: number;
  minOrder: number;
  isPureVeg: boolean;
  isOpen: boolean;
  distanceKm?: number;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: Role;
}

export interface FoodItemData {
  id: string;
  name: string;
  description: string;
  price: number;
  originalPrice?: number | null;
  categoryId: string;
  categoryName?: string;
  restaurantId?: string;
  restaurantName?: string;
  image: string;
  isVeg: boolean;
  isAvailable: boolean;
  rating: number;
  reviewsCount: number;
  prepTimeMinutes: number;
  calories?: number | null;
  spicyLevel: number;
  tags?: string | null;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface CategoryData {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  image: string;
}

export interface CouponData {
  id: string;
  code: string;
  discountPercent: number;
  maxDiscountAmount?: number | null;
  minOrderAmount: number;
  validUntil?: Date | null;
  isActive: boolean;
}

export interface AddressData {
  id: string;
  userId: string;
  label: string;
  recipientName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  phone: string;
  isDefault: boolean;
}

export interface OrderItemInput {
  foodItemId: string;
  quantity: number;
}

export interface CreateOrderInput {
  items: OrderItemInput[];
  addressId?: string;
  deliveryAddress: {
    recipientName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
  };
  couponCode?: string;
  paymentMethod: 'COD' | 'ONLINE';
  deliveryInstructions?: string;
}
