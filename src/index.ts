import express, { Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { config } from './config/env';
import { testDbConnection } from './config/database';
import { errorHandler } from './middleware/errorHandler';

import authRoutes from './routes/authRoutes';
import foodRoutes from './routes/foodRoutes';
import categoryRoutes from './routes/categoryRoutes';
import orderRoutes from './routes/orderRoutes';
import couponRoutes from './routes/couponRoutes';
import addressRoutes from './routes/addressRoutes';
import wishlistRoutes from './routes/wishlistRoutes';
import adminRoutes from './routes/adminRoutes';
import healthRoutes from './routes/healthRoutes';
import restaurantRoutes from './routes/restaurantRoutes';

const app = express();

// Security and utility middleware
app.use(helmet());
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all origins in production or specified CORS origin
      callback(null, true);
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan(config.nodeEnv === 'production' ? 'combined' : 'dev'));

// Root endpoint with API greeting and documentation links
app.get('/', (req: Request, res: Response) => {
  res.status(200).json({
    message: 'Welcome to the CraveKart API - Your Cravings, Delivered.',
    version: '1.0.0',
    documentation: 'See README.md for endpoint specifications',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      foods: '/api/foods',
      categories: '/api/categories',
      orders: '/api/orders',
      coupons: '/api/coupons',
      addresses: '/api/addresses',
      wishlist: '/api/wishlist',
      restaurants: '/api/restaurants',
      admin: '/api/admin',
    },
  });
});

// API Routes
app.use('/api/health', healthRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/foods', foodRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/addresses', addressRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/admin', adminRoutes);

// 404 Not Found Handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    success: false,
    message: `API endpoint '${req.method} ${req.originalUrl}' not found.`,
  });
});

// Centralized error handling
app.use(errorHandler);

// Server startup
let server: any;
const isTestRunner = process.argv.some((arg) => arg.includes('test'));
if (!isTestRunner && process.env.NODE_ENV !== 'test') {
  server = app.listen(config.port, async () => {
    console.log(`===============================================`);
    console.log(` CraveKart REST API Server running`);
    console.log(` Port: ${config.port}`);
    console.log(` Mode: ${config.nodeEnv}`);
    console.log(` Health check: http://localhost:${config.port}/api/health`);
    console.log(`===============================================`);

    const dbOk = await testDbConnection();
    if (dbOk) {
      console.log(' [Database] Connected to PostgreSQL via Prisma');
    } else {
      console.log(' [Database] Running with in-memory seeded store (PostgreSQL connection optional for local dev)');
    }
  });
}

export default app;
