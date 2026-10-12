# CraveKart Backend — High Performance REST API

[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue.svg)](https://www.typescriptlang.org/)
[![Node.js](https://img.shields.io/badge/Node.js-24.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.21-lightgrey.svg)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-darkblue.svg)](https://www.prisma.io/)
[![Security](https://img.shields.io/badge/Security-JWT%20%7C%20Bcrypt%20%7C%20Helmet-brightgreen.svg)]()

Production-ready backend API service powering **CraveKart** — an online food ordering platform. Built with Express, TypeScript, Prisma ORM, and PostgreSQL.

---

## 🚀 Key Features

* **Authentication & Authorization**: Secure JWT with bcrypt password hashing, role-based access control (`CUSTOMER`, `ADMIN`).
* **Food & Category Catalog**: Rich querying with search, vegetarian/non-vegetarian filters, category selection, price range, and multi-field sorting.
* **Server-Side Pricing Engine**: Client-submitted totals are never trusted. Subtotal, delivery thresholds, discounts, and taxes are strictly calculated and validated on the server.
* **Coupon Management**: Dynamic coupon codes (`WELCOME50`, `CRAVE20`, `HUNGRY100`, `FREESHIP`) with minimum cart value and maximum discount limits.
* **Order Processing & Security**: Customer order isolation prevents users from accessing other accounts' receipts. Support for Cash on Delivery (COD) and verified online payments.
* **Live Stepper Tracking**: Order status lifecycle (`PENDING` ➔ `CONFIRMED` ➔ `PREPARING` ➔ `OUT_FOR_DELIVERY` ➔ `DELIVERED` ➔ `CANCELLED`).
* **Protected Admin Dashboard API**: Real-time sales metrics, product CRUD with availability toggling, order fulfillment, and role administration.
* **Automated Test Suite**: 10 comprehensive tests covering auth, security, business logic, and admin RBAC.

---

## 🛠️ Technology Stack

* **Runtime**: Node.js (v18+)
* **Framework**: Express.js with TypeScript
* **ORM & Database**: Prisma ORM with PostgreSQL (Neon / Render / Supabase)
* **Security**: Helmet, CORS, JWT (`jsonwebtoken`), Bcryptjs
* **Validation**: Zod schema validation
* **Logging**: Morgan HTTP logger

---

## 📋 REST API Endpoints

### 🩺 Health & Public
| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Live service health check, uptime, and database connection status |
| `GET` | `/` | API greeting and index |

### 🔐 Authentication
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/auth/register` | Public | Register new customer account |
| `POST` | `/api/auth/login` | Public | Login with email and password |
| `GET` | `/api/auth/me` | JWT | Get authenticated user profile & addresses |

### 🍔 Food Items & Categories
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/foods` | Public | Browse foods (supports `?category=`, `?search=`, `?isVeg=`, `?sort=`, `?minPrice=`, `?maxPrice=`) |
| `GET` | `/api/foods/:id` | Optional | Get food details, ingredients, reviews & related items |
| `POST` | `/api/foods/:id/reviews` | JWT | Post customer review and star rating |
| `GET` | `/api/categories` | Public | List all categories with dish counts |

### 🏷️ Coupons
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/coupons` | Public | Get active discount coupons |
| `POST` | `/api/coupons/validate` | Public | Validate coupon code against cart subtotal |

### 📦 Orders & Tracking
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `POST` | `/api/orders` | JWT | Place an order (COD or Online) with server-calculated total |
| `GET` | `/api/orders` | JWT | Get user's order history |
| `GET` | `/api/orders/:id` | JWT | Get order details receipt (restricted to owner or admin) |
| `GET` | `/api/orders/:id/track` | JWT | Real-time order tracking timeline & delivery partner info |

### 📍 Addresses & Wishlist
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/addresses` | JWT | Get saved delivery addresses |
| `POST` | `/api/addresses` | JWT | Add new delivery address |
| `PUT` | `/api/addresses/:id` | JWT | Update saved address |
| `DELETE` | `/api/addresses/:id` | JWT | Remove saved address |
| `GET` | `/api/wishlist` | JWT | Get customer favorite foods |
| `POST` | `/api/wishlist/toggle` | JWT | Toggle food item favorite status |

### 👑 Admin Management (Requires `ADMIN` role)
| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/api/admin/stats` | Admin | Real-time analytics: total revenue, order count, items, customers |
| `GET` | `/api/admin/orders` | Admin | List all orders with status filter (`?status=`) |
| `PATCH` | `/api/admin/orders/:id/status`| Admin | Transition order status |
| `POST` | `/api/admin/foods` | Admin | Create new food item |
| `PUT` | `/api/admin/foods/:id` | Admin | Update food details |
| `DELETE` | `/api/admin/foods/:id` | Admin | Delete food item |
| `PATCH` | `/api/admin/foods/:id/toggle`| Admin | Fast toggle item availability |
| `POST` | `/api/admin/categories` | Admin | Create new food category |
| `GET` | `/api/admin/coupons` | Admin | List all coupons (active and inactive) |
| `POST` | `/api/admin/coupons` | Admin | Create coupon code |
| `DELETE` | `/api/admin/coupons/:code` | Admin | Delete coupon code |
| `GET` | `/api/admin/users` | Admin | View user accounts and roles |
| `PATCH` | `/api/admin/users/:id/role` | Admin | Update user role (`CUSTOMER` ↔ `ADMIN`) |

---

## ⚙️ Environment Variables

Copy `.env.example` to `.env`:

```env
PORT=5000
NODE_ENV=production
JWT_SECRET=your_secure_random_jwt_secret
JWT_EXPIRES_IN=7d
CORS_ORIGIN=*
DATABASE_URL=postgresql://user:password@host/database?sslmode=require
ADMIN_EMAIL=admin@cravekart.com
ADMIN_PASSWORD=Admin@123456
```

---

## 🏃 Local Setup & Running

```bash
# 1. Install dependencies
npm install

# 2. Run automated test suite
npx tsx src/tests/api.test.ts

# 3. Start development server
npm run dev

# 4. Build for production
npm run build
npm start
```

---

## 🛡️ Default Seed Credentials

* **Admin User**:
  * Email: `admin@cravekart.com`
  * Password: `Admin@123456`
* **Demo Customer**:
  * Email: `customer@cravekart.com`
  * Password: `Customer@123456`
