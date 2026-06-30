# Recommended Fixes — Cafe POS System
**Date:** 2026-06-30

---

## Priority 1: Critical (Do Before Any Production Deploy)

### FIX-01: Rotate JWT Secret
**Time:** 5 minutes  
**Risk if skipped:** Attacker can forge admin tokens

```bash
# In backend/.env, replace JWT_SECRET with:
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Then restart server: npm run dev
# NOTE: All existing sessions will be invalidated (users must log in again)
```

### FIX-02: Authenticate Socket.io
**Time:** 30 minutes  
**File:** `backend/src/index.ts`

```typescript
import jwt from 'jsonwebtoken';

// Add this BEFORE io.on('connection'):
io.use((socket, next) => {
  const token = socket.handshake.auth?.token as string;
  if (!token) {
    return next(new Error('Authentication required'));
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { id: string };
    (socket as any).userId = decoded.id;
    next();
  } catch {
    next(new Error('Invalid or expired token'));
  }
});
```

Frontend update — pass token on connect in `frontend/src/lib/socket.ts`:
```typescript
import { getToken } from './auth'; // wherever token is stored
const socket = io(SOCKET_URL, {
  auth: { token: localStorage.getItem('token') }
});
```

### FIX-03: Add HTTPS
**Time:** 1-2 hours  
This is an infrastructure task:
1. Install Nginx: `sudo apt install nginx`
2. Get SSL cert: `sudo certbot --nginx -d yourdomain.com`
3. Configure Nginx to proxy to localhost:5000

---

## Priority 2: High (Fix Within 2 Weeks)

### FIX-04: Add DB Indexes
**Time:** 15 minutes  
**File:** `backend/prisma/schema.prisma`

Add these `@@index` blocks to the relevant models:
```prisma
model Order {
  // ... existing fields ...
  @@index([status])
  @@index([tableId])
  @@index([employeeId])
  @@index([createdAt])
}

model StockMovement {
  // ... existing fields ...
  @@index([inventoryItemId])
  @@index([createdAt])
}

model AuditLog {
  // ... existing fields ...
  @@index([userId])
  @@index([createdAt])
}

model WastageEntry {
  // ... existing fields ...
  @@index([status])
}
```

Then run: `cd backend && npx prisma migrate dev --name add_performance_indexes`

### FIX-05: Add Graceful Shutdown + Connection Pool
**Time:** 15 minutes  
**File:** `backend/src/index.ts`

```typescript
// Add connection pool to DATABASE_URL in .env:
// DATABASE_URL="postgresql://...?connection_limit=20"

// Add SIGTERM handler in start():
process.on('SIGTERM', async () => {
  console.log('SIGTERM received — shutting down gracefully');
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
});
```

### FIX-06: Add Pagination to Orders
**Time:** 30 minutes  
**File:** `backend/src/controllers/orderController.ts`

```typescript
// In getOrders():
const { page = '1', limit = '50', status } = req.query;
const skip = (parseInt(page as string) - 1) * parseInt(limit as string);
const [orders, total] = await Promise.all([
  prisma.order.findMany({ where, skip, take: parseInt(limit as string), orderBy: { createdAt: 'desc' }, include: { ... } }),
  prisma.order.count({ where }),
]);
res.json({ orders, total, page: parseInt(page as string), limit: parseInt(limit as string) });
```

### FIX-07: Await Inventory Deduction
**Time:** 15 minutes  
**File:** `backend/src/controllers/orderController.ts`

Find the `processPayment` function and change:
```typescript
// BEFORE:
void deductForOrder(order.id);

// AFTER:
try {
  await deductForOrder(order.id);
} catch (err) {
  console.error('[Inventory] Deduction failed for order', order.id, err);
  // Optionally log to AuditLog here
}
```

### FIX-08: Role-Based Access Control
**Time:** 2 hours  
**Files:** `backend/src/routes/*.ts`

Using the `requireRole()` guard from `auth.ts`:
```typescript
import { protect, adminOnly, requireRole } from '../middleware/auth';

// Products — only ADMIN/MANAGER can modify
router.post('/products', protect, requireRole('ADMIN', 'MANAGER'), createProduct);
router.patch('/products/:id', protect, requireRole('ADMIN', 'MANAGER'), updateProduct);
router.delete('/products/:id', protect, requireRole('ADMIN', 'MANAGER'), deleteProduct);

// Payments — ADMIN/MANAGER/CASHIER only
router.post('/orders/:id/payment', protect, requireRole('ADMIN', 'MANAGER', 'CASHIER'), processPayment);

// Reports — ADMIN/MANAGER only
router.get('/reports/*', protect, requireRole('ADMIN', 'MANAGER'), ...handlers);

// Inventory approvals — ADMIN/MANAGER only
router.post('/inventory/adjustments/:id/approve', protect, requireRole('ADMIN', 'MANAGER'), approveAdjustment);
```

---

## Priority 3: Medium (Fix Within 1 Month)

### FIX-09: Add Logout Endpoint
**File:** `backend/src/controllers/authController.ts`
```typescript
export const logout = async (req: any, res: Response): Promise<void> => {
  await prisma.session.updateMany({
    where: { userId: req.user.id, status: 'OPEN' },
    data: { status: 'CLOSED', closedAt: new Date() },
  });
  res.json({ message: 'Logged out successfully' });
};
```

### FIX-10: Add try/catch to Remaining Controllers
Wrap these controllers in try/catch:
- `sessionController.ts` — all functions
- `customerController.ts` — all functions  
- `floorController.ts` — all functions
- `categoryController.ts` — all functions

### FIX-11: Log Failed Login Attempts
**File:** `backend/src/controllers/authController.ts`

In the `login` function, after `const valid = await bcrypt.compare(...)`:
```typescript
if (!valid) {
  // Log failed attempt
  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: 'FAILED_LOGIN',
      entityType: 'User',
      entityId: user.id,
    }
  });
  res.status(401).json({ message: 'Invalid email or password' });
  return;
}
```

---

## Priority 4: Backlog

### FIX-12: Add Structured Logging
Install `pino`:
```bash
npm install pino pino-http
```
Replace `console.log` calls with structured logger.

### FIX-13: Add Missing DB Constraint (Stock Floor)
```prisma
model InventoryItem {
  currentStock Float @default(0) // Add: @db.DoublePrecision
  // Add check constraint via migration:
}
```
Migration SQL:
```sql
ALTER TABLE "inventory_items" ADD CONSTRAINT "currentStock_non_negative" CHECK ("currentStock" >= 0);
```

### FIX-14: Optimize `deductForOrder` N+1
```typescript
// Batch-fetch all recipes for order products at once
const recipes = await prisma.recipe.findMany({
  where: { productId: { in: order.items.map(i => i.productId) } },
  include: { ingredients: { include: { inventoryItem: true } } },
});
```
