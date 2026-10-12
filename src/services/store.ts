import bcrypt from 'bcryptjs';
import { getPrisma, isDbConnected } from '../config/database';
import { config } from '../config/env';
import {
  AuthUser,
  FoodItemData,
  CategoryData,
  CouponData,
  AddressData,
  CreateOrderInput,
  RestaurantData,
} from '../types';

export function calculateHaversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth's radius in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const d = R * c;
  return Math.round(d * 10) / 10;
}

export interface UserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  phone?: string;
  role: 'CUSTOMER' | 'ADMIN';
  avatar?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderRecord {
  id: string;
  orderNumber: string;
  userId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  deliveryAddress: {
    recipientName: string;
    street: string;
    city: string;
    state: string;
    postalCode: string;
    phone: string;
  };
  items: {
    foodItemId: string;
    foodName: string;
    price: number;
    quantity: number;
    image: string;
  }[];
  subtotalAmount: number;
  deliveryFee: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  couponCode?: string;
  status: 'PENDING' | 'CONFIRMED' | 'PREPARING' | 'OUT_FOR_DELIVERY' | 'DELIVERED' | 'CANCELLED';
  paymentMethod: 'COD' | 'ONLINE';
  paymentStatus: 'PENDING' | 'PAID' | 'FAILED';
  transactionId?: string;
  deliveryInstructions?: string;
  estimatedDeliveryMinutes: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ReviewRecord {
  id: string;
  foodItemId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: Date;
}

class StoreService {
  private users: Map<string, UserRecord> = new Map();
  private restaurants: Map<string, RestaurantData> = new Map();
  private categories: Map<string, CategoryData> = new Map();
  private foods: Map<string, FoodItemData> = new Map();
  private coupons: Map<string, CouponData> = new Map();
  private addresses: Map<string, AddressData> = new Map();
  private orders: Map<string, OrderRecord> = new Map();
  private wishlist: Set<string> = new Set(); // "userId:foodId"
  private reviews: ReviewRecord[] = [];
  private orderCounter = 1000;

  constructor() {
    this.initDefaultSeed();
  }

  private initDefaultSeed() {
    // 1. Users
    const salt = bcrypt.genSaltSync(10);
    const adminPassHash = bcrypt.hashSync(config.adminPassword, salt);
    const customerPassHash = bcrypt.hashSync('Customer@123456', salt);

    const adminUser: UserRecord = {
      id: 'usr_admin_01',
      name: 'CraveKart Admin',
      email: config.adminEmail.toLowerCase(),
      passwordHash: adminPassHash,
      phone: '+91 9876543210',
      role: 'ADMIN',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      createdAt: new Date('2026-01-01'),
      updatedAt: new Date(),
    };

    const customerUser: UserRecord = {
      id: 'usr_cust_01',
      name: 'Aditya Sharma',
      email: 'customer@cravekart.com',
      passwordHash: customerPassHash,
      phone: '+91 9123456789',
      role: 'CUSTOMER',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
      createdAt: new Date('2026-01-15'),
      updatedAt: new Date(),
    };

    this.users.set(adminUser.id, adminUser);
    this.users.set(customerUser.id, customerUser);

    // Default address for customer
    const addr1: AddressData = {
      id: 'addr_01',
      userId: customerUser.id,
      label: 'Home',
      recipientName: 'Aditya Sharma',
      street: 'Flat 402, Lotus Residency, Indiranagar',
      city: 'Bengaluru',
      state: 'Karnataka',
      postalCode: '560038',
      phone: '+91 9123456789',
      isDefault: true,
    };
    this.addresses.set(addr1.id, addr1);

    // 2. Restaurants
    const initialRestaurants: RestaurantData[] = [
      {
        id: 'rest_01',
        name: 'Royal Biryani Darbar',
        slug: 'royal-biryani-darbar',
        description: 'Authentic Nawabi dum biryanis, kebabs, and aromatic Mughal gravies.',
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=1200&q=80',
        rating: 4.8,
        reviewsCount: 1420,
        cuisines: ['Biryani', 'Mughlai', 'North Indian'],
        address: '100ft Road, Indiranagar, Bengaluru',
        latitude: 12.9784,
        longitude: 77.6408,
        deliveryTimeMinutes: 25,
        deliveryFee: 30,
        minOrder: 199,
        isPureVeg: false,
        isOpen: true,
      },
      {
        id: 'rest_02',
        name: 'The Burger Loft & Co.',
        slug: 'the-burger-loft',
        description: 'Gourmet smashed beef & crispy chicken burgers, brioche buns and truffle fries.',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1550547660-d9450f859349?auto=format&fit=crop&w=1200&q=80',
        rating: 4.7,
        reviewsCount: 980,
        cuisines: ['Burgers', 'Fast Food', 'Beverages'],
        address: '5th Block, Koramangala, Bengaluru',
        latitude: 12.9352,
        longitude: 77.6245,
        deliveryTimeMinutes: 20,
        deliveryFee: 25,
        minOrder: 149,
        isPureVeg: false,
        isOpen: true,
      },
      {
        id: 'rest_03',
        name: 'Little Napoli Trattoria',
        slug: 'little-napoli-trattoria',
        description: 'Neapolitan sourdough pizzas baked in firewood oven, pastas & gelato.',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1579684947550-22e945225d9a?auto=format&fit=crop&w=1200&q=80',
        rating: 4.9,
        reviewsCount: 1150,
        cuisines: ['Italian', 'Pizzas', 'Pastas'],
        address: '12th Main, Indiranagar, Bengaluru',
        latitude: 12.9719,
        longitude: 77.6412,
        deliveryTimeMinutes: 30,
        deliveryFee: 40,
        minOrder: 249,
        isPureVeg: false,
        isOpen: true,
      },
      {
        id: 'rest_04',
        name: 'Zen Garden Wok & Bowls',
        slug: 'zen-garden-wok',
        description: 'Pan-Asian wok noodles, dim sums, Thai green curry and sushi bowls.',
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1552611052-33e04de081de?auto=format&fit=crop&w=1200&q=80',
        rating: 4.6,
        reviewsCount: 640,
        cuisines: ['Asian', 'Chinese', 'Thai'],
        address: 'Sector 4, HSR Layout, Bengaluru',
        latitude: 12.9121,
        longitude: 77.6446,
        deliveryTimeMinutes: 35,
        deliveryFee: 35,
        minOrder: 199,
        isPureVeg: false,
        isOpen: true,
      },
      {
        id: 'rest_05',
        name: 'Green Harvest Kitchen',
        slug: 'green-harvest-kitchen',
        description: '100% Pure vegetarian organic grain bowls, fresh salads and detox cold juices.',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1498837167922-ddd27525d352?auto=format&fit=crop&w=1200&q=80',
        rating: 4.9,
        reviewsCount: 820,
        cuisines: ['Healthy', 'Salads', 'Pure Veg'],
        address: 'Lavelle Road, MG Road, Bengaluru',
        latitude: 12.9756,
        longitude: 77.6066,
        deliveryTimeMinutes: 25,
        deliveryFee: 20,
        minOrder: 150,
        isPureVeg: true,
        isOpen: true,
      },
      {
        id: 'rest_06',
        name: 'Chaat Chatore & Sweet Boutique',
        slug: 'chaat-chatore',
        description: 'Famous Old Delhi style chaats, pav bhaji, samosas, chole bhature and rasmalai.',
        image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
        bannerImage: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?auto=format&fit=crop&w=1200&q=80',
        rating: 4.8,
        reviewsCount: 1650,
        cuisines: ['Street Food', 'Desserts', 'Pure Veg'],
        address: '3rd Block, Jayanagar, Bengaluru',
        latitude: 12.9308,
        longitude: 77.5838,
        deliveryTimeMinutes: 20,
        deliveryFee: 25,
        minOrder: 99,
        isPureVeg: true,
        isOpen: true,
      },
    ];

    initialRestaurants.forEach((r) => this.restaurants.set(r.id, r));

    // 3. Categories
    const initialCategories: CategoryData[] = [
      {
        id: 'cat_biryani',
        name: 'Biryani & Rice',
        slug: 'biryani',
        description: 'Authentic royal dum biryanis layered with fragrant spices',
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cat_burgers',
        name: 'Burgers & Wraps',
        slug: 'burgers',
        description: 'Juicy artisan smash burgers, brioche buns, and gourmet sides',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cat_pizzas',
        name: 'Artisan Pizzas',
        slug: 'pizzas',
        description: 'Hand-tossed sourdough pizzas baked to crispy bubbly perfection',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cat_asian',
        name: 'Asian & Bowls',
        slug: 'asian',
        description: 'Sizzling woks, ramen bowls, dim sums, and Thai curries',
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cat_healthy',
        name: 'Healthy & Greens',
        slug: 'healthy',
        description: 'Nutrient-rich salad bowls, cold-pressed smoothies & superfoods',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cat_desserts',
        name: 'Desserts & Bakes',
        slug: 'desserts',
        description: 'Decadent chocolate cakes, molten tortes, and creamy treats',
        image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cat_beverages',
        name: 'Beverages & Brews',
        slug: 'beverages',
        description: 'Specialty cold brews, craft shakes, and fruit coolers',
        image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
      },
      {
        id: 'cat_street',
        name: 'Street Flavours',
        slug: 'street-food',
        description: 'Iconic street snacks, chaats, crispy bites and loaded fries',
        image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
      },
    ];

    initialCategories.forEach((c) => this.categories.set(c.id, c));

    // 3. Foods (24 items with high-res food images)
    const initialFoods: FoodItemData[] = [
      // Biryani
      {
        id: 'food_01',
        name: 'Royal Hyderabadi Dum Biryani',
        description: 'Tender chicken pieces slow-cooked in sealed clay pots with saffron-infused basmati rice, caramelized onions, and royal spices. Served with creamy mirchi ka salan and burani raita.',
        price: 349,
        originalPrice: 429,
        categoryId: 'cat_biryani',
        categoryName: 'Biryani & Rice',
        image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        rating: 4.9,
        reviewsCount: 384,
        prepTimeMinutes: 30,
        calories: 680,
        spicyLevel: 2,
        tags: 'Bestseller,Chef Special',
      },
      {
        id: 'food_02',
        name: 'Awadhi Mutton Dum Biryani',
        description: 'Slow-braised succulence of tender lamb marinated in raw papaya, rose water, and kewra essence, dum-cooked on charcoal. A true Nawabi celebration.',
        price: 499,
        originalPrice: 599,
        categoryId: 'cat_biryani',
        categoryName: 'Biryani & Rice',
        image: 'https://images.unsplash.com/photo-1633945274405-b6c8069047b0?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        rating: 4.8,
        reviewsCount: 215,
        prepTimeMinutes: 35,
        calories: 740,
        spicyLevel: 1,
        tags: 'Gourmet,Must Try',
      },
      {
        id: 'food_03',
        name: 'Smoked Paneer Tikka Biryani',
        description: 'Charcoal-grilled cottage cheese cubes simmered in a spiced tomato-cashew reduction layered with aromatic aged basmati rice and fresh mint leaves.',
        price: 299,
        originalPrice: 359,
        categoryId: 'cat_biryani',
        categoryName: 'Biryani & Rice',
        image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        rating: 4.7,
        reviewsCount: 172,
        prepTimeMinutes: 25,
        calories: 590,
        spicyLevel: 1,
        tags: 'Pure Veg,Popular',
      },

      // Burgers
      {
        id: 'food_04',
        name: 'Crave Double Smash Cheeseburger',
        description: 'Two sizzling smashed patties with crispy caramelized edges, melted double aged cheddar, homemade smoky relish, crispy shallots, and house Crave sauce on a toasted brioche.',
        price: 319,
        originalPrice: 389,
        categoryId: 'cat_burgers',
        categoryName: 'Burgers & Wraps',
        image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        rating: 4.9,
        reviewsCount: 412,
        prepTimeMinutes: 20,
        calories: 720,
        spicyLevel: 1,
        tags: 'Bestseller,Top Rated',
      },
      {
        id: 'food_05',
        name: 'Nashville Crispy Hot Chicken Burger',
        description: '24-hour buttermilk soaked chicken thigh deep fried golden, dusted with cayenne pepper spice, topped with crunchy dill pickle slices and tangy apple cider slaw.',
        price: 289,
        originalPrice: 349,
        categoryId: 'cat_burgers',
        categoryName: 'Burgers & Wraps',
        image: 'https://images.unsplash.com/photo-1625813506062-0aeb1d7a094b?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        rating: 4.8,
        reviewsCount: 290,
        prepTimeMinutes: 20,
        calories: 660,
        spicyLevel: 3,
        tags: 'Spicy,Hot',
      },
      {
        id: 'food_06',
        name: 'Truffle Mushroom Swiss Burger',
        description: 'Pan-seared garlic portobello and button mushrooms, rich truffle aioli, melted Swiss Emmental cheese, caramelized balsamic onions, and baby arugula.',
        price: 279,
        originalPrice: 329,
        categoryId: 'cat_burgers',
        categoryName: 'Burgers & Wraps',
        image: 'https://images.unsplash.com/photo-1586190848861-99aa4a171e90?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        rating: 4.7,
        reviewsCount: 148,
        prepTimeMinutes: 20,
        calories: 540,
        spicyLevel: 0,
        tags: 'Pure Veg,Gourmet',
      },

      // Pizzas
      {
        id: 'food_07',
        name: 'Neapolitan Margherita Di Bufala',
        description: 'Classic 48-hour slow fermented sourdough crust, San Marzano tomato sauce, fresh buffalo mozzarella, fragrant Genovese sweet basil, and extra virgin cold-pressed olive oil drizzle.',
        price: 399,
        originalPrice: 479,
        categoryId: 'cat_pizzas',
        categoryName: 'Artisan Pizzas',
        image: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        rating: 4.9,
        reviewsCount: 512,
        prepTimeMinutes: 22,
        calories: 610,
        spicyLevel: 0,
        tags: 'Classic,Bestseller',
      },
      {
        id: 'food_08',
        name: 'Spicy Pepperoni & Hot Honey Pizza',
        description: 'Crispy cupping pepperoni, smoky mozzarella, chili flake infusion, and a sweet heat drizzle of organic artisanal hot wildflower honey.',
        price: 489,
        originalPrice: 569,
        categoryId: 'cat_pizzas',
        categoryName: 'Artisan Pizzas',
        image: 'https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        rating: 4.9,
        reviewsCount: 388,
        prepTimeMinutes: 22,
        calories: 780,
        spicyLevel: 2,
        tags: 'Customer Choice,Trending',
      },
      {
        id: 'food_09',
        name: 'Quattro Formaggi Rustic Sourdough',
        description: 'Velvety blend of fresh Fior Di Latte, creamy Gorgonzola dolce, aged Parmesan Reggiano, and mild smoked scamorza with cracked black peppercorns.',
        price: 449,
        originalPrice: 529,
        categoryId: 'cat_pizzas',
        categoryName: 'Artisan Pizzas',
        image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        rating: 4.6,
        reviewsCount: 165,
        prepTimeMinutes: 22,
        calories: 710,
        spicyLevel: 0,
        tags: 'Pure Veg,Cheese Lovers',
      },

      // Asian
      {
        id: 'food_10',
        name: 'Sichuan Chili Garlic Wok Noodles',
        description: 'Hand-pulled ribbon egg noodles tossed in smoking wok with crispy garlic, toasted sesame oil, baby bok choy, bell peppers, and tongue-tingling Sichuan peppercorn oil.',
        price: 259,
        originalPrice: 319,
        categoryId: 'cat_asian',
        categoryName: 'Asian & Bowls',
        image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        rating: 4.8,
        reviewsCount: 230,
        prepTimeMinutes: 18,
        calories: 520,
        spicyLevel: 3,
        tags: 'Spicy,Pure Veg',
      },
      {
        id: 'food_11',
        name: 'Bangkok Street Pad Thai',
        description: 'Stir-fried flat rice noodles with juicy chicken or tofu, crunchy bean sprouts, toasted crushed peanuts, scrambled eggs, and tangy tamarind-lime palm sugar glaze.',
        price: 299,
        originalPrice: 369,
        categoryId: 'cat_asian',
        categoryName: 'Asian & Bowls',
        image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        rating: 4.7,
        reviewsCount: 184,
        prepTimeMinutes: 20,
        calories: 580,
        spicyLevel: 1,
        tags: 'Authentic Thai',
      },
      {
        id: 'food_12',
        name: 'Crystal Truffle Edamame Dim Sum (6 pcs)',
        description: 'Translucent steamed dumplings stuffed with mashed organic edamame beans, water chestnuts, shiitake mushrooms, and finished with a fragrant white truffle essence.',
        price: 289,
        originalPrice: 349,
        categoryId: 'cat_asian',
        categoryName: 'Asian & Bowls',
        image: 'https://images.unsplash.com/photo-1496116218417-1a781b1c416c?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        rating: 4.9,
        reviewsCount: 142,
        prepTimeMinutes: 18,
        calories: 280,
        spicyLevel: 0,
        tags: 'Pure Veg,Gourmet',
      },

      // Healthy
      {
        id: 'food_13',
        name: 'Mediterranean Quinoa Avocado Bowl',
        description: 'Fluffy tri-color quinoa, sliced Hass avocado, cherry tomatoes, kalamata olives, diced Persian cucumbers, creamy Greek feta cheese, and lemon herb vinaigrette.',
        price: 329,
        originalPrice: 399,
        categoryId: 'cat_healthy',
        categoryName: 'Healthy & Greens',
        image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        rating: 4.8,
        reviewsCount: 198,
        prepTimeMinutes: 15,
        calories: 420,
        spicyLevel: 0,
        tags: 'Superfood,Gluten Free',
      },
      {
        id: 'food_14',
        name: 'Smoked Chicken Protein Fiesta Bowl',
        description: 'Herb-roasted succulent chicken breast, black beans, sweet charred corn, brown rice, avocado crema, pico de gallo, and zesty chipotle lime dressing. 42g Protein.',
        price: 349,
        originalPrice: 419,
        categoryId: 'cat_healthy',
        categoryName: 'Healthy & Greens',
        image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        rating: 4.9,
        reviewsCount: 310,
        prepTimeMinutes: 15,
        calories: 510,
        spicyLevel: 1,
        tags: 'High Protein,Fitness',
      },

      // Desserts
      {
        id: 'food_15',
        name: 'Warm Belgian Dark Chocolate Lava Cake',
        description: 'Rich individual chocolate sponge made with 70% Callebaut Belgian chocolate with an oozing liquid ganache core. Served warm with vanilla bean gelato swirl.',
        price: 219,
        originalPrice: 269,
        categoryId: 'cat_desserts',
        categoryName: 'Desserts & Bakes',
        image: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        rating: 4.9,
        reviewsCount: 460,
        prepTimeMinutes: 12,
        calories: 480,
        spicyLevel: 0,
        tags: 'Bestseller,Decadent',
      },
      {
        id: 'food_16',
        name: 'New York Baked Berry Cheesecake',
        description: 'Dense and velvety baked Philadelphia cream cheese on a buttery graham cracker crust, crowned with a tart mixed raspberry and wild blueberry compote.',
        price: 249,
        originalPrice: 299,
        categoryId: 'cat_desserts',
        categoryName: 'Desserts & Bakes',
        image: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        rating: 4.8,
        reviewsCount: 220,
        prepTimeMinutes: 10,
        calories: 420,
        spicyLevel: 0,
        tags: 'Chef Special',
      },
      {
        id: 'food_17',
        name: 'Saffron Pistachio Tres Leches',
        description: 'Light, sponge cake soaked in three decadent milks infused with Kashmiri saffron strands and topped with whipped mascarpone and toasted Iranian pistachios.',
        price: 229,
        originalPrice: 279,
        categoryId: 'cat_desserts',
        categoryName: 'Desserts & Bakes',
        image: 'https://images.unsplash.com/photo-1587314168485-3236d6710814?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        rating: 4.7,
        reviewsCount: 164,
        prepTimeMinutes: 10,
        calories: 380,
        spicyLevel: 0,
        tags: 'Royal Treat',
      },

      // Beverages
      {
        id: 'food_18',
        name: 'Salted Caramel Cold Brew Coffee',
        description: 'Single-origin Arabica beans steeped cold for 20 hours, blended with silky oat milk, buttery Himalayan salted caramel syrup, and cold foam.',
        price: 189,
        originalPrice: 229,
        categoryId: 'cat_beverages',
        categoryName: 'Beverages & Brews',
        image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        rating: 4.8,
        reviewsCount: 280,
        prepTimeMinutes: 8,
        calories: 190,
        spicyLevel: 0,
        tags: 'Specialty Coffee',
      },
      {
        id: 'food_19',
        name: 'Alphonso Mango Mint Frappe',
        description: 'Pure pulp of sun-ripened Ratnagiri Alphonso mangoes blended thick with creamy whole milk, crushed mint leaves, and topped with mango dice.',
        price: 199,
        originalPrice: 239,
        categoryId: 'cat_beverages',
        categoryName: 'Beverages & Brews',
        image: 'https://images.unsplash.com/photo-1546173159-315724a31696?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        rating: 4.9,
        reviewsCount: 312,
        prepTimeMinutes: 8,
        calories: 230,
        spicyLevel: 0,
        tags: 'Seasonal Hit',
      },
      {
        id: 'food_20',
        name: 'Sparkling Strawberry Basil Lemonade',
        description: 'Muddled fresh strawberries, bruised sweet Italian basil, freshly squeezed lemon juice, and effervescent sparkling soda over crushed crystal ice.',
        price: 149,
        originalPrice: 189,
        categoryId: 'cat_beverages',
        categoryName: 'Beverages & Brews',
        image: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        rating: 4.7,
        reviewsCount: 145,
        prepTimeMinutes: 5,
        calories: 110,
        spicyLevel: 0,
        tags: 'Refreshing',
      },

      // Street Food
      {
        id: 'food_21',
        name: 'Delhi Style Crispy Chaat Papdi',
        description: 'Crispy whole-wheat flour wafers layered with boiled chickpeas, spiced potatoes, sweet yogurt, tangy date-tamarind chutney, and fiery mint coriander chutney.',
        price: 149,
        originalPrice: 179,
        categoryId: 'cat_street',
        categoryName: 'Street Flavours',
        image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        rating: 4.8,
        reviewsCount: 367,
        prepTimeMinutes: 12,
        calories: 340,
        spicyLevel: 2,
        tags: 'Street Icon,Bestseller',
      },
      {
        id: 'food_22',
        name: 'Mumbai Butter Pav Bhaji',
        description: 'A spicy mash of seasonal vegetables simmered on an iron griddle with dollops of Amul butter and secret spice mix. Served with 2 soft toasted pavs and lemon wedges.',
        price: 179,
        originalPrice: 219,
        categoryId: 'cat_street',
        categoryName: 'Street Flavours',
        image: 'https://images.unsplash.com/photo-1626777552726-4a6b54c97e46?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        rating: 4.9,
        reviewsCount: 420,
        prepTimeMinutes: 15,
        calories: 520,
        spicyLevel: 2,
        tags: 'Legendary,Must Try',
      },
      {
        id: 'food_23',
        name: 'Loaded Triple-Cheese Truffle Fries',
        description: 'Golden skin-on crispy potato fries drenched in warm cheddar cheese sauce, melted mozzarella, white truffle oil, and smoked paprika.',
        price: 189,
        originalPrice: 229,
        categoryId: 'cat_street',
        categoryName: 'Street Flavours',
        image: 'https://images.unsplash.com/photo-1585109649139-366815a0d713?auto=format&fit=crop&w=800&q=80',
        isVeg: true,
        isAvailable: true,
        rating: 4.8,
        reviewsCount: 295,
        prepTimeMinutes: 12,
        calories: 490,
        spicyLevel: 1,
        tags: 'Addictive,Pure Veg',
      },
      {
        id: 'food_24',
        name: 'Fiery Peri-Peri Fried Chicken Strips (5 pcs)',
        description: 'Crispy breaded tenderloin strips tossed in African bird eye peri-peri spice dust. Served with a smoky chipotle mayo dip.',
        price: 249,
        originalPrice: 299,
        categoryId: 'cat_street',
        categoryName: 'Street Flavours',
        image: 'https://images.unsplash.com/photo-1562967914-608f82629710?auto=format&fit=crop&w=800&q=80',
        isVeg: false,
        isAvailable: true,
        rating: 4.7,
        reviewsCount: 250,
        prepTimeMinutes: 15,
        calories: 580,
        spicyLevel: 3,
        tags: 'Crispy & Hot',
      },
    ];

    const restaurantCategoryMap: Record<string, { id: string; name: string }> = {
      cat_biryani: { id: 'rest_01', name: 'Royal Biryani Darbar' },
      cat_burgers: { id: 'rest_02', name: 'The Burger Loft & Co.' },
      cat_pizzas: { id: 'rest_03', name: 'Little Napoli Trattoria' },
      cat_asian: { id: 'rest_04', name: 'Zen Garden Wok & Bowls' },
      cat_healthy: { id: 'rest_05', name: 'Green Harvest Kitchen' },
      cat_desserts: { id: 'rest_06', name: 'Chaat Chatore & Sweet Boutique' },
      cat_beverages: { id: 'rest_02', name: 'The Burger Loft & Co.' },
      cat_street: { id: 'rest_06', name: 'Chaat Chatore & Sweet Boutique' },
    };

    initialFoods.forEach((f) => {
      const rest = restaurantCategoryMap[f.categoryId];
      if (rest) {
        f.restaurantId = rest.id;
        f.restaurantName = rest.name;
      }
      this.foods.set(f.id, f);
    });

    // 4. Coupons
    const initialCoupons: CouponData[] = [
      {
        id: 'cpn_01',
        code: 'WELCOME50',
        discountPercent: 50,
        maxDiscountAmount: 150,
        minOrderAmount: 299,
        isActive: true,
      },
      {
        id: 'cpn_02',
        code: 'CRAVE20',
        discountPercent: 20,
        maxDiscountAmount: 200,
        minOrderAmount: 499,
        isActive: true,
      },
      {
        id: 'cpn_03',
        code: 'HUNGRY100',
        discountPercent: 25,
        maxDiscountAmount: 100,
        minOrderAmount: 399,
        isActive: true,
      },
      {
        id: 'cpn_04',
        code: 'FREESHIP',
        discountPercent: 10,
        maxDiscountAmount: 40,
        minOrderAmount: 199,
        isActive: true,
      },
    ];

    initialCoupons.forEach((c) => this.coupons.set(c.code.toUpperCase(), c));

    // 5. Sample seed orders for rich admin dashboard metrics
    const sampleOrder1: OrderRecord = {
      id: 'ord_sample_01',
      orderNumber: 'CK-9841',
      userId: customerUser.id,
      customerName: customerUser.name,
      customerEmail: customerUser.email,
      customerPhone: customerUser.phone || '',
      deliveryAddress: {
        recipientName: 'Aditya Sharma',
        street: 'Flat 402, Lotus Residency, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
        phone: '+91 9123456789',
      },
      items: [
        {
          foodItemId: 'food_01',
          foodName: 'Royal Hyderabadi Dum Biryani',
          price: 349,
          quantity: 2,
          image: initialFoods[0].image,
        },
        {
          foodItemId: 'food_15',
          foodName: 'Warm Belgian Dark Chocolate Lava Cake',
          price: 219,
          quantity: 1,
          image: initialFoods[14].image,
        },
      ],
      subtotalAmount: 917,
      deliveryFee: 0,
      discountAmount: 150,
      taxAmount: 38.35,
      totalAmount: 805.35,
      couponCode: 'WELCOME50',
      status: 'DELIVERED',
      paymentMethod: 'ONLINE',
      paymentStatus: 'PAID',
      transactionId: 'TXN_SIM_847120',
      deliveryInstructions: 'Ring doorbell twice and leave on doorstep',
      estimatedDeliveryMinutes: 0,
      createdAt: new Date(Date.now() - 86400000 * 2),
      updatedAt: new Date(Date.now() - 86400000 * 2),
    };

    const sampleOrder2: OrderRecord = {
      id: 'ord_sample_02',
      orderNumber: 'CK-9842',
      userId: customerUser.id,
      customerName: customerUser.name,
      customerEmail: customerUser.email,
      customerPhone: customerUser.phone || '',
      deliveryAddress: {
        recipientName: 'Aditya Sharma',
        street: 'Flat 402, Lotus Residency, Indiranagar',
        city: 'Bengaluru',
        state: 'Karnataka',
        postalCode: '560038',
        phone: '+91 9123456789',
      },
      items: [
        {
          foodItemId: 'food_04',
          foodName: 'Crave Double Smash Cheeseburger',
          price: 319,
          quantity: 1,
          image: initialFoods[3].image,
        },
        {
          foodItemId: 'food_23',
          foodName: 'Loaded Triple-Cheese Truffle Fries',
          price: 189,
          quantity: 1,
          image: initialFoods[22].image,
        },
        {
          foodItemId: 'food_18',
          foodName: 'Salted Caramel Cold Brew Coffee',
          price: 189,
          quantity: 1,
          image: initialFoods[17].image,
        },
      ],
      subtotalAmount: 697,
      deliveryFee: 40,
      discountAmount: 100,
      taxAmount: 29.85,
      totalAmount: 666.85,
      couponCode: 'HUNGRY100',
      status: 'PREPARING',
      paymentMethod: 'COD',
      paymentStatus: 'PENDING',
      deliveryInstructions: 'Extra napkins please!',
      estimatedDeliveryMinutes: 25,
      createdAt: new Date(Date.now() - 1000 * 60 * 18),
      updatedAt: new Date(),
    };

    this.orders.set(sampleOrder1.id, sampleOrder1);
    this.orders.set(sampleOrder2.id, sampleOrder2);

    // Initial reviews
    this.reviews.push(
      {
        id: 'rev_01',
        foodItemId: 'food_01',
        userId: customerUser.id,
        userName: 'Aditya Sharma',
        rating: 5,
        comment: 'Without doubt the best dum biryani in town! The aroma when opening the box was sublime.',
        createdAt: new Date('2026-02-10'),
      },
      {
        id: 'rev_02',
        foodItemId: 'food_04',
        userId: customerUser.id,
        userName: 'Priya Mehta',
        rating: 5,
        comment: 'Crispy smash burger edges, juicy centre and brioche was super fresh. Highly recommend!',
        createdAt: new Date('2026-02-14'),
      }
    );
  }

  // --- Users ---
  getUserByEmail(email: string): UserRecord | undefined {
    const target = email.toLowerCase().trim();
    for (const u of this.users.values()) {
      if (u.email.toLowerCase() === target) return u;
    }
    return undefined;
  }

  getUserById(id: string): UserRecord | undefined {
    return this.users.get(id);
  }

  createUser(name: string, email: string, passwordHash: string, phone?: string): UserRecord {
    const id = `usr_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    const user: UserRecord = {
      id,
      name,
      email: email.toLowerCase().trim(),
      passwordHash,
      phone,
      role: 'CUSTOMER',
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  getAllUsers(): UserRecord[] {
    return Array.from(this.users.values());
  }

  updateUserRole(userId: string, role: 'CUSTOMER' | 'ADMIN'): UserRecord | undefined {
    const u = this.users.get(userId);
    if (!u) return undefined;
    u.role = role;
    u.updatedAt = new Date();
    return u;
  }

  // --- Restaurants ---
  getRestaurants(options?: {
    latitude?: number;
    longitude?: number;
    radiusKm?: number;
    search?: string;
    isVeg?: boolean;
  }): RestaurantData[] {
    let list = Array.from(this.restaurants.values());

    if (options?.search) {
      const q = options.search.toLowerCase().trim();
      list = list.filter(
        (r) =>
          r.name.toLowerCase().includes(q) ||
          r.cuisines.some((c) => c.toLowerCase().includes(q)) ||
          r.address.toLowerCase().includes(q)
      );
    }

    if (options?.isVeg !== undefined) {
      list = list.filter((r) => r.isPureVeg === options.isVeg);
    }

    if (options?.latitude !== undefined && options?.longitude !== undefined) {
      list = list.map((r) => {
        const distanceKm = calculateHaversineDistance(
          options.latitude!,
          options.longitude!,
          r.latitude,
          r.longitude
        );
        const dynamicDeliveryTime = Math.max(15, Math.min(60, Math.round(15 + distanceKm * 4)));
        return {
          ...r,
          distanceKm,
          deliveryTimeMinutes: dynamicDeliveryTime,
        };
      });

      if (options?.radiusKm) {
        list = list.filter((r) => (r.distanceKm ?? 0) <= options.radiusKm!);
      }

      list.sort((a, b) => (a.distanceKm ?? 999) - (b.distanceKm ?? 999));
    }

    return list;
  }

  getRestaurantById(id: string, userLat?: number, userLng?: number): RestaurantData | undefined {
    const r = this.restaurants.get(id);
    if (!r) return undefined;
    if (userLat !== undefined && userLng !== undefined) {
      const distanceKm = calculateHaversineDistance(userLat, userLng, r.latitude, r.longitude);
      const dynamicDeliveryTime = Math.max(15, Math.min(60, Math.round(15 + distanceKm * 4)));
      return {
        ...r,
        distanceKm,
        deliveryTimeMinutes: dynamicDeliveryTime,
      };
    }
    return r;
  }

  // --- Categories ---
  getAllCategories(): CategoryData[] {
    return Array.from(this.categories.values());
  }

  getCategoryById(id: string): CategoryData | undefined {
    return this.categories.get(id);
  }

  createCategory(name: string, slug: string, description: string, image: string): CategoryData {
    const id = `cat_${Date.now()}`;
    const cat: CategoryData = { id, name, slug, description, image };
    this.categories.set(id, cat);
    return cat;
  }

  updateCategory(id: string, updates: Partial<CategoryData>): CategoryData | undefined {
    const cat = this.categories.get(id);
    if (!cat) return undefined;
    Object.assign(cat, updates);
    return cat;
  }

  deleteCategory(id: string): boolean {
    return this.categories.delete(id);
  }

  // --- Food Items ---
  getFoods(filters: {
    category?: string;
    search?: string;
    isVeg?: boolean;
    sort?: 'price_asc' | 'price_desc' | 'rating' | 'popular';
    minPrice?: number;
    maxPrice?: number;
    isAvailable?: boolean;
    restaurantId?: string;
  }): FoodItemData[] {
    let result = Array.from(this.foods.values());

    if (filters.restaurantId) {
      result = result.filter((f) => f.restaurantId === filters.restaurantId);
    }

    if (filters.category && filters.category !== 'all') {
      const cat = filters.category.toLowerCase();
      result = result.filter(
        (f) =>
          f.categoryId.toLowerCase() === cat ||
          (f.categoryName && f.categoryName.toLowerCase().includes(cat))
      );
    }

    if (filters.search) {
      const q = filters.search.toLowerCase().trim();
      result = result.filter(
        (f) =>
          f.name.toLowerCase().includes(q) ||
          f.description.toLowerCase().includes(q) ||
          (f.tags && f.tags.toLowerCase().includes(q))
      );
    }

    if (filters.isVeg !== undefined) {
      result = result.filter((f) => f.isVeg === filters.isVeg);
    }

    if (filters.isAvailable !== undefined) {
      result = result.filter((f) => f.isAvailable === filters.isAvailable);
    }

    if (filters.minPrice !== undefined) {
      result = result.filter((f) => f.price >= filters.minPrice!);
    }

    if (filters.maxPrice !== undefined) {
      result = result.filter((f) => f.price <= filters.maxPrice!);
    }

    if (filters.sort) {
      if (filters.sort === 'price_asc') {
        result.sort((a, b) => a.price - b.price);
      } else if (filters.sort === 'price_desc') {
        result.sort((a, b) => b.price - a.price);
      } else if (filters.sort === 'rating') {
        result.sort((a, b) => b.rating - a.rating);
      } else if (filters.sort === 'popular') {
        result.sort((a, b) => b.reviewsCount - a.reviewsCount);
      }
    }

    return result;
  }

  getFoodById(id: string): FoodItemData | undefined {
    return this.foods.get(id);
  }

  createFood(food: Omit<FoodItemData, 'id' | 'createdAt' | 'updatedAt'>): FoodItemData {
    const id = `food_${Date.now()}`;
    const newFood: FoodItemData = {
      ...food,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.foods.set(id, newFood);
    return newFood;
  }

  updateFood(id: string, updates: Partial<FoodItemData>): FoodItemData | undefined {
    const food = this.foods.get(id);
    if (!food) return undefined;
    Object.assign(food, updates, { updatedAt: new Date() });
    return food;
  }

  deleteFood(id: string): boolean {
    return this.foods.delete(id);
  }

  toggleFoodAvailability(id: string): FoodItemData | undefined {
    const food = this.foods.get(id);
    if (!food) return undefined;
    food.isAvailable = !food.isAvailable;
    food.updatedAt = new Date();
    return food;
  }

  // --- Coupons ---
  getCoupon(code: string): CouponData | undefined {
    return this.coupons.get(code.toUpperCase().trim());
  }

  getAllCoupons(): CouponData[] {
    return Array.from(this.coupons.values());
  }

  createCoupon(coupon: CouponData): CouponData {
    const saved = { ...coupon, code: coupon.code.toUpperCase().trim() };
    this.coupons.set(saved.code, saved);
    return saved;
  }

  deleteCoupon(code: string): boolean {
    return this.coupons.delete(code.toUpperCase().trim());
  }

  // --- Addresses ---
  getUserAddresses(userId: string): AddressData[] {
    return Array.from(this.addresses.values()).filter((a) => a.userId === userId);
  }

  createAddress(userId: string, data: Omit<AddressData, 'id' | 'userId'>): AddressData {
    const id = `addr_${Date.now()}`;
    if (data.isDefault) {
      for (const a of this.addresses.values()) {
        if (a.userId === userId) a.isDefault = false;
      }
    }
    const addr: AddressData = { ...data, id, userId };
    this.addresses.set(id, addr);
    return addr;
  }

  updateAddress(id: string, userId: string, updates: Partial<AddressData>): AddressData | undefined {
    const addr = this.addresses.get(id);
    if (!addr || addr.userId !== userId) return undefined;
    if (updates.isDefault) {
      for (const a of this.addresses.values()) {
        if (a.userId === userId) a.isDefault = false;
      }
    }
    Object.assign(addr, updates);
    return addr;
  }

  deleteAddress(id: string, userId: string): boolean {
    const addr = this.addresses.get(id);
    if (!addr || addr.userId !== userId) return false;
    return this.addresses.delete(id);
  }

  // --- Wishlist ---
  getUserWishlist(userId: string): FoodItemData[] {
    const foodIds: string[] = [];
    for (const key of this.wishlist) {
      const [uId, fId] = key.split(':');
      if (uId === userId) foodIds.push(fId);
    }
    return foodIds.map((id) => this.foods.get(id)).filter(Boolean) as FoodItemData[];
  }

  toggleWishlist(userId: string, foodItemId: string): { isInWishlist: boolean } {
    const key = `${userId}:${foodItemId}`;
    if (this.wishlist.has(key)) {
      this.wishlist.delete(key);
      return { isInWishlist: false };
    } else {
      this.wishlist.add(key);
      return { isInWishlist: true };
    }
  }

  isWishlisted(userId: string, foodItemId: string): boolean {
    return this.wishlist.has(`${userId}:${foodItemId}`);
  }

  // --- Orders ---
  createOrder(user: AuthUser, input: CreateOrderInput): OrderRecord {
    // 1. Calculate items & server side prices
    let subtotal = 0;
    const validatedItems: OrderRecord['items'] = [];

    for (const item of input.items) {
      const food = this.foods.get(item.foodItemId);
      if (!food) {
        throw new Error(`Food item not found with ID: ${item.foodItemId}`);
      }
      if (!food.isAvailable) {
        throw new Error(`Food item '${food.name}' is currently unavailable`);
      }
      if (item.quantity <= 0) {
        throw new Error(`Invalid quantity for '${food.name}'`);
      }

      const itemTotal = food.price * item.quantity;
      subtotal += itemTotal;
      validatedItems.push({
        foodItemId: food.id,
        foodName: food.name,
        price: food.price,
        quantity: item.quantity,
        image: food.image,
      });
    }

    // 2. Delivery fee: free above 499, otherwise 40
    let deliveryFee = subtotal >= 499 ? 0 : 40;

    // 3. Discount calculation
    let discountAmount = 0;
    if (input.couponCode) {
      const coupon = this.getCoupon(input.couponCode);
      if (coupon && coupon.isActive && subtotal >= coupon.minOrderAmount) {
        discountAmount = (subtotal * coupon.discountPercent) / 100;
        if (coupon.maxDiscountAmount && discountAmount > coupon.maxDiscountAmount) {
          discountAmount = coupon.maxDiscountAmount;
        }
      }
    }

    // 4. Taxes: 5% GST
    const taxableAmount = Math.max(0, subtotal - discountAmount);
    const taxAmount = Math.round(taxableAmount * 0.05 * 100) / 100;

    // 5. Total
    const totalAmount = Math.round((taxableAmount + deliveryFee + taxAmount) * 100) / 100;

    this.orderCounter++;
    const orderNumber = `CK-${this.orderCounter}`;
    const id = `ord_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

    const order: OrderRecord = {
      id,
      orderNumber,
      userId: user.id,
      customerName: user.name,
      customerEmail: user.email,
      customerPhone: input.deliveryAddress.phone,
      deliveryAddress: input.deliveryAddress,
      items: validatedItems,
      subtotalAmount: Math.round(subtotal * 100) / 100,
      deliveryFee,
      discountAmount: Math.round(discountAmount * 100) / 100,
      taxAmount,
      totalAmount,
      couponCode: input.couponCode,
      status: 'CONFIRMED',
      paymentMethod: input.paymentMethod,
      paymentStatus: input.paymentMethod === 'ONLINE' ? 'PAID' : 'PENDING',
      transactionId: input.paymentMethod === 'ONLINE' ? `TXN_${Date.now()}` : undefined,
      deliveryInstructions: input.deliveryInstructions,
      estimatedDeliveryMinutes: 35,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.orders.set(id, order);
    return order;
  }

  getOrderById(id: string): OrderRecord | undefined {
    return this.orders.get(id);
  }

  getUserOrders(userId: string): OrderRecord[] {
    const list = Array.from(this.orders.values()).filter((o) => o.userId === userId);
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  getAllOrders(status?: string): OrderRecord[] {
    let list = Array.from(this.orders.values());
    if (status && status !== 'ALL') {
      list = list.filter((o) => o.status === status);
    }
    return list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  updateOrderStatus(
    orderId: string,
    status: OrderRecord['status']
  ): OrderRecord | undefined {
    const order = this.orders.get(orderId);
    if (!order) return undefined;
    order.status = status;
    order.updatedAt = new Date();
    if (status === 'DELIVERED') {
      order.paymentStatus = 'PAID';
      order.estimatedDeliveryMinutes = 0;
    }
    return order;
  }

  // --- Admin Analytics ---
  getAdminStats() {
    const allOrders = Array.from(this.orders.values());
    const totalOrders = allOrders.length;
    const totalRevenue = allOrders
      .filter((o) => o.status !== 'CANCELLED')
      .reduce((sum, o) => sum + o.totalAmount, 0);

    const pendingOrders = allOrders.filter(
      (o) => o.status === 'PENDING' || o.status === 'CONFIRMED' || o.status === 'PREPARING'
    ).length;

    const totalCustomers = Array.from(this.users.values()).filter(
      (u) => u.role === 'CUSTOMER'
    ).length;

    const totalFoodItems = this.foods.size;

    // Monthly / daily sales breakdown
    const recentOrders = allOrders
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, 10);

    return {
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      totalOrders,
      pendingOrders,
      totalCustomers,
      totalFoodItems,
      recentOrders,
    };
  }

  // --- Reviews ---
  getReviewsForFood(foodId: string): ReviewRecord[] {
    return this.reviews.filter((r) => r.foodItemId === foodId);
  }

  addReview(foodItemId: string, userId: string, userName: string, rating: number, comment: string) {
    const review: ReviewRecord = {
      id: `rev_${Date.now()}`,
      foodItemId,
      userId,
      userName,
      rating,
      comment,
      createdAt: new Date(),
    };
    this.reviews.push(review);
    return review;
  }
}

export const store = new StoreService();
