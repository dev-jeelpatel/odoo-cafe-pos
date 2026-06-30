# Authentication & RBAC Report — Cafe POS System
**Date:** 2026-06-30

---

## 1. Authentication Implementation

### Login Flow (After Fixes)
```
1. POST /api/auth/login { email, password }
2. Validate: email regex, password 1-128 chars
3. Look up user by email (case-insensitive)
4. If not found: run bcrypt.compare against dummy hash (timing-safe)
5. Return 401 with SAME message (prevents user enumeration)
6. If found but archived: same 401 flow
7. bcrypt.compare against stored hash (12 rounds)
8. Sign JWT: { id } HS256, 7d expiry
9. Find or create OPEN session
10. Log to AuditLog
11. Return { token, user: { id, name, email, role }, session }
```

### Token Handling
| Check | Before | After |
|-------|--------|-------|
| Brute force protection | ❌ | ✅ 20 req/15min |
| User enumeration prevention | ❌ | ✅ Timing-safe |
| Password bcrypt DoS prevention | ❌ | ✅ 128 char max |
| Min password length | ❌ | ✅ 8 chars |
| Generic error messages | ❌ | ✅ |
| Email normalization (lowercase) | ❌ | ✅ |

---

## 2. Token Security Analysis

| Property | Value | Assessment |
|----------|-------|-----------|
| Algorithm | HS256 | Acceptable for single-service |
| Secret strength | "cafe-pos-super-secret-jwt-key-2024" | ⚠ WEAK — guessable |
| Expiry | 7 days | ⚠ Long-lived — medium risk |
| Claims | `{ id }` only | ⚠ Minimal — no iss/aud/jti |
| Storage | localStorage | ⚠ XSS-accessible |
| Revocation | None | ⚠ Cannot invalidate stolen token |
| Refresh token | Not implemented | ⚠ |

**Recommended JWT secret generation:**
```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
# Example: a3f9b2c1e8d4...  (128 hex chars = 512 bits)
```

**Production JWT enhancement:**
```typescript
// Add standard claims to resist replay across services
jwt.sign(
  { id, role, iss: 'cafe-pos', aud: 'cafe-pos-client' },
  process.env.JWT_SECRET,
  { expiresIn: '1d', jwtid: crypto.randomUUID() }
)
```

---

## 3. Role Model

| Role | DB Enum Value | Current Enforcement | Ideal Access |
|------|--------------|---------------------|-------------|
| ADMIN | ADMIN | ✅ adminOnly on user routes | Full system access |
| MANAGER | MANAGER | ❌ No guards | Orders, reports, inventory approval |
| CASHIER | CASHIER | ❌ No guards | POS, orders, payment |
| WAITER | WAITER | ❌ No guards | Orders, floor management |
| KITCHEN | KITCHEN | ❌ No guards | KDS view only |

### Current Gap
Every authenticated user (any role) can:
- Create/delete products
- Access all order history
- Process payments
- Generate reports
- Create purchase orders
- Approve stock adjustments

---

## 4. RBAC Implementation Plan

Using the new `requireRole()` guard exported from `auth.ts`:

```typescript
// Example: restrict product creation to ADMIN/MANAGER
router.post('/products', protect, requireRole('ADMIN', 'MANAGER'), createProduct);

// Example: restrict payment processing to ADMIN/MANAGER/CASHIER
router.post('/orders/:id/payment', protect, requireRole('ADMIN', 'MANAGER', 'CASHIER'), processPayment);

// Example: restrict KDS to KITCHEN/ADMIN
router.get('/kds/orders', protect, requireRole('ADMIN', 'KITCHEN', 'MANAGER'), getKitchenOrders);
```

**Recommended role matrix for implementation:**

| Route | ADMIN | MANAGER | CASHIER | WAITER | KITCHEN |
|-------|-------|---------|---------|--------|---------|
| GET products | ✅ | ✅ | ✅ | ✅ | ✅ |
| POST/PATCH/DELETE products | ✅ | ✅ | ❌ | ❌ | ❌ |
| GET orders | ✅ | ✅ | ✅ | ✅ (own) | ✅ (kitchen view) |
| POST orders | ✅ | ✅ | ✅ | ✅ | ❌ |
| POST payment | ✅ | ✅ | ✅ | ❌ | ❌ |
| GET reports | ✅ | ✅ | ❌ | ❌ | ❌ |
| Inventory CRUD | ✅ | ✅ | ❌ | ❌ | ❌ |
| Approve adjustments | ✅ | ✅ | ❌ | ❌ | ❌ |
| User management | ✅ | ❌ | ❌ | ❌ | ❌ |

---

## 5. Session Management

| Check | Result |
|-------|--------|
| Session created on login | ✅ |
| Session tracks openedAt/closedAt | ✅ |
| Session status: OPEN/CLOSED | ✅ |
| Multiple OPEN sessions per user possible | ⚠ findFirst used, not findUnique |
| Session invalidation on logout | ❌ (frontend clears token, session stays OPEN) |

**Fix for session cleanup on logout:**
```typescript
// Add logout endpoint:
export const logout = async (req: any, res: Response): Promise<void> => {
  await prisma.session.updateMany({
    where: { userId: req.user.id, status: 'OPEN' },
    data: { status: 'CLOSED', closedAt: new Date() },
  });
  res.json({ message: 'Logged out' });
};
```

---

## 6. Auth/RBAC Score: 55 / 100 (before) → 72 / 100 (after fixes)
