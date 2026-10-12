import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding CraveKart database with production seed data...');

  const salt = await bcrypt.genSalt(10);
  const adminPasswordHash = await bcrypt.hash(
    process.env.ADMIN_PASSWORD || 'Admin@123456',
    salt
  );
  const customerPasswordHash = await bcrypt.hash('Customer@123456', salt);

  // 1. Seed Users
  const admin = await prisma.user.upsert({
    where: { email: process.env.ADMIN_EMAIL || 'admin@cravekart.com' },
    update: {},
    create: {
      name: 'CraveKart Admin',
      email: process.env.ADMIN_EMAIL || 'admin@cravekart.com',
      password: adminPasswordHash,
      phone: '+91 9876543210',
      role: 'ADMIN',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
    },
  });

  const customer = await prisma.user.upsert({
    where: { email: 'customer@cravekart.com' },
    update: {},
    create: {
      name: 'Aditya Sharma',
      email: 'customer@cravekart.com',
      password: customerPasswordHash,
      phone: '+91 9123456789',
      role: 'CUSTOMER',
      avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80',
    },
  });

  console.log(`Admin user seeded: ${admin.email}`);
  console.log(`Demo customer seeded: ${customer.email}`);

  // 2. Seed Categories
  const categories = [
    {
      name: 'Biryani & Rice',
      slug: 'biryani',
      description: 'Authentic royal dum biryanis layered with fragrant spices',
      image: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Burgers & Wraps',
      slug: 'burgers',
      description: 'Juicy artisan smash burgers, brioche buns, and gourmet sides',
      image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Artisan Pizzas',
      slug: 'pizzas',
      description: 'Hand-tossed sourdough pizzas baked to crispy bubbly perfection',
      image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Asian & Bowls',
      slug: 'asian',
      description: 'Sizzling woks, ramen bowls, dim sums, and Thai curries',
      image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Healthy & Greens',
      slug: 'healthy',
      description: 'Nutrient-rich salad bowls, cold-pressed smoothies & superfoods',
      image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Desserts & Bakes',
      slug: 'desserts',
      description: 'Decadent chocolate cakes, molten tortes, and creamy treats',
      image: 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Beverages & Brews',
      slug: 'beverages',
      description: 'Specialty cold brews, craft shakes, and fruit coolers',
      image: 'https://images.unsplash.com/photo-1517256064527-09c73fc73e38?auto=format&fit=crop&w=600&q=80',
    },
    {
      name: 'Street Flavours',
      slug: 'street-food',
      description: 'Iconic street snacks, chaats, crispy bites and loaded fries',
      image: 'https://images.unsplash.com/photo-1601050690597-df0568f70950?auto=format&fit=crop&w=600&q=80',
    },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { slug: cat.slug },
      update: {},
      create: cat,
    });
  }

  // 3. Seed Coupons
  const coupons = [
    { code: 'WELCOME50', discountPercent: 50, maxDiscountAmount: 150, minOrderAmount: 299 },
    { code: 'CRAVE20', discountPercent: 20, maxDiscountAmount: 200, minOrderAmount: 499 },
    { code: 'HUNGRY100', discountPercent: 25, maxDiscountAmount: 100, minOrderAmount: 399 },
    { code: 'FREESHIP', discountPercent: 10, maxDiscountAmount: 40, minOrderAmount: 199 },
  ];

  for (const c of coupons) {
    await prisma.coupon.upsert({
      where: { code: c.code },
      update: {},
      create: c,
    });
  }

  console.log('Database seeding successfully finished!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
