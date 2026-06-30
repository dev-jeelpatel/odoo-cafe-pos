# Architecture Report — Cafe POS System
**Date:** 2026-06-30

---

## 1. Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Frontend Framework | Next.js (App Router) | 14.2.4 |
| Frontend Language | TypeScript | 5.4.5 |
| Frontend Styling | Tailwind CSS | 3.4.4 |
| Frontend State | React Query + Context API | 5.45.0 |
| HTTP Client | Axios | 1.7.2 |
| Real-time Client | Socket.io-client | 4.7.5 |
| Backend Framework | Express.js | 4.19.2 |
| Backend Language | TypeScript | 5.4.5 |
| Real-time Server | Socket.io | 4.7.5 |
| ORM | Prisma | 5.15.0 |
| Database | PostgreSQL | 17 (Alpine) |
| Authentication | JWT (jsonwebtoken 9.0.2) | — |
| Password Hashing | bcryptjs | 2.4.3 |
| Email | Nodemailer | 8.0.11 |
| Charts | Recharts | 2.12.7 |
| Icons | Lucide React | 0.395.0 |

---

## 2. Repository Structure

```
odoo-cafe-pos/
├── backend/                    Express API server
│   ├── src/
│   │   ├── index.ts            Entry point, Express + Socket.io setup
│   │   ├── middleware/
│   │   │   └── auth.ts         JWT protect + adminOnly + requireRole guards
│   │   ├── lib/
│   │   │   └── prisma.ts       Prisma client singleton
│   │   ├── utils/
│   │   │   └── orderNumber.ts  Sequential order/receipt number generators
│   │   ├── services/
│   │   │   └── inventoryService.ts  Stock deduction/restore logic
│   │   ├── controllers/        20 controllers (see table below)
│   │   ├── routes/             17 route files, mounted at /api
│   │   ├── seed.ts             Primary data seed
│   │   ├── seedDemo.ts         Demo data seed
│   │   ├── inventorySeed.ts    Inventory items + recipes seed
│   │   └── inventoryUpdateSeed.ts  Update seed for additional products
│   ├── prisma/
│   │   └── schema.prisma       40+ models, 15 enums
│   ├── .env                    SENSITIVE: contains credentials
│   └── package.json
├── frontend/                   Next.js 14 App Router SPA
│   ├── src/
│   │   ├── app/                30+ pages in App Router convention
│   │   │   ├── (auth)/         Login + Signup pages (public)
│   │   │   ├── (pos)/          Protected POS pages (auth guard in layout)
│   │   │   ├── kds/            Kitchen Display System
│   │   │   └── menu/           Customer-facing menu
│   │   ├── components/         12 components (Modal, Sidebar, POS widgets)
│   │   ├── contexts/           AuthContext, CartContext, SidebarContext
│   │   ├── lib/                api.ts, socket.ts, validation.ts, etc.
│   │   └── types/index.ts      TypeScript interfaces
│   └── package.json
├── docker-compose.yml          PostgreSQL 17 + healthcheck
└── package.json                Monorepo root (concurrently)
```

---

## 3. Controllers Reference

| Controller | Responsibility |
|-----------|---------------|
| authController | Signup, login, getMe |
| userController | Employee CRUD, password, archive |
| productController | Menu item CRUD |
| categoryController | Category CRUD |
| orderController | Full order lifecycle, payment, kitchen |
| sessionController | Cashier session open/close/summary |
| customerController | Customer CRM |
| floorController | Floor & table management |
| couponController | Coupon CRUD & validation |
| promotionController | Promotions management |
| paymentMethodController | Payment method configuration |
| reportController | Business analytics & exports |
| receiptEmailController | Email receipt delivery |
| inventoryController | Inventory items, adjustments, reports |
| supplierController | Supplier CRUD |
| purchaseOrderController | PO & GRN lifecycle |
| recipeController | Product→ingredient recipe management |
| wastageController | Wastage tracking & approval |
| publicController | Public menu endpoint |
| auditLogController | Activity log viewer |

---

## 4. Data Flow

```
Customer/Staff → Frontend (Next.js)
                    │
                    ├─ REST API calls → Express /api/* → Prisma → PostgreSQL
                    │
                    └─ Socket.io ← Express emits events
                              ↓
                         Kitchen Display (KDS)
                         POS Terminal (live updates)
```

---

## 5. Authentication Flow

```
POST /api/auth/login
  → validate email + password
  → bcrypt.compare (12 rounds)
  → sign JWT (7d expiry, HS256)
  → return { token, user, session }

Client stores token in localStorage
Every API request adds: Authorization: Bearer <token>
protect() middleware verifies JWT on every protected route
```

---

## 6. Role System

| Role | Description | Access Level |
|------|-------------|-------------|
| ADMIN | System administrator | Full access to all routes |
| MANAGER | Store manager | Most operations except user management |
| CASHIER | POS cashier | Orders, payments, sessions |
| WAITER | Floor waiter | Orders, table management |
| KITCHEN | Kitchen staff | KDS only |

> **Gap:** Only `ADMIN` role is enforced via `adminOnly` middleware on user routes. All other protected routes accept ANY authenticated user regardless of role. A KITCHEN staff member can currently access payment processing.

---

## 7. Real-time Architecture

Socket.io events used:
- `kitchen:new-order` — emitted when order sent to kitchen
- `kitchen:status-update` — emitted on status change
- `kitchen:item-update` — emitted on item completion
- `order:updated` — general order update
- `order:paid` — payment completion
- `table:status-update` — table availability change

> **Gap:** Socket.io connections are not authenticated. Any client can connect to the Socket.io server without a token.

---

## 8. Environment Variables

| Variable | Purpose | Risk |
|----------|---------|------|
| PORT | Server port | Low |
| DATABASE_URL | PostgreSQL connection string | CRITICAL — contains password |
| JWT_SECRET | Token signing key | CRITICAL — weak value in .env |
| JWT_REFRESH_SECRET | Refresh token key | HIGH — unused in code |
| JWT_EXPIRES_IN | Token TTL | Low |
| CLIENT_URL | Allowed CORS origin | Medium |
| EMAIL_USER | Gmail address | MEDIUM |
| EMAIL_PASS | Gmail App Password | HIGH — exposed |

---

## 9. Deployment Configuration

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:17-alpine
    ports: ["5433:5432"]
    healthcheck: pg_isready
```

> No backend container defined in docker-compose. Backend runs directly on host.
> No Nginx/reverse proxy defined.
> No HTTPS in deployment config.
