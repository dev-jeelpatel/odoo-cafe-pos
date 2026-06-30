# API Audit — Cafe POS System
**Date:** 2026-06-30

---

## 1. Complete Endpoint Reference

### Auth Routes (`/api/auth`)
| Method | Endpoint | Auth | Validation | Status |
|--------|----------|------|-----------|--------|
| POST | `/api/auth/signup` | Public | ✅ (this audit) | ✅ |
| POST | `/api/auth/login` | Public | ✅ (this audit) | ✅ |
| GET | `/api/auth/me` | protect | — | ✅ |

### User Routes (`/api/users`)
| Method | Endpoint | Auth | Validation | Status |
|--------|----------|------|-----------|--------|
| GET | `/api/users` | protect + adminOnly | — | ✅ |
| POST | `/api/users` | protect + adminOnly | ⚠ No validation | Partial |
| PATCH | `/api/users/:id` | protect + adminOnly | ⚠ No validation | Partial |
| PATCH | `/api/users/:id/password` | protect + adminOnly | ✅ (this audit) | ✅ |
| PATCH | `/api/users/:id/archive` | protect + adminOnly | — | ✅ |
| DELETE | `/api/users/:id` | protect + adminOnly | — | ✅ |

### Product Routes (`/api/products`)
| Method | Endpoint | Auth | Notes | Status |
|--------|----------|------|-------|--------|
| GET | `/api/products` | protect | active=true default | ✅ |
| POST | `/api/products` | protect | No role restriction | ⚠ |
| PATCH | `/api/products/:id` | protect | No role restriction | ⚠ |
| DELETE | `/api/products/:id` | protect | Soft delete | ✅ |

### Order Routes (`/api/orders`)
| Method | Endpoint | Auth | Notes | Status |
|--------|----------|------|-------|--------|
| GET | `/api/orders` | protect | Returns all | ✅ |
| GET | `/api/orders/:id` | protect | No IDOR check | ⚠ |
| POST | `/api/orders` | protect | — | ✅ |
| PATCH | `/api/orders/:id` | protect | — | ✅ |
| POST | `/api/orders/:id/payment` | protect | Atomic transaction | ✅ |
| POST | `/api/orders/:id/cancel` | protect | Restores inventory | ✅ |
| POST | `/api/orders/:id/send-to-kitchen` | protect | Emits Socket event | ✅ |
| POST | `/api/orders/:id/receipt-email` | protect | — | ✅ |

### Inventory Routes (`/api/inventory`)
| Method | Endpoint | Auth | Status |
|--------|----------|------|--------|
| GET | `/api/inventory/dashboard` | protect | ✅ Fixed |
| GET | `/api/inventory/items` | protect | ✅ |
| POST | `/api/inventory/items` | protect | ✅ |
| PATCH | `/api/inventory/items/:id` | protect | ✅ Fixed |
| DELETE | `/api/inventory/items/:id` | protect | ✅ |
| GET | `/api/inventory/items/:id/movements` | protect | ✅ |
| GET | `/api/inventory/categories` | protect | ✅ |
| POST | `/api/inventory/categories` | protect | ✅ |
| GET | `/api/inventory/adjustments` | protect | ✅ |
| POST | `/api/inventory/adjustments` | protect | ✅ |
| POST | `/api/inventory/adjustments/:id/approve` | protect | ✅ |
| POST | `/api/inventory/adjustments/:id/reject` | protect | ✅ |
| GET | `/api/inventory/valuation` | protect | ✅ |
| GET | `/api/inventory/reports/stock` | protect | ✅ |
| GET | `/api/inventory/reports/low-stock` | protect | ✅ |
| GET | `/api/inventory/reports/expiry` | protect | ✅ |
| GET | `/api/inventory/reports/movements` | protect | ✅ |

### Recipe Routes (`/api/recipes`)
| Method | Endpoint | Auth | Status |
|--------|----------|------|--------|
| GET | `/api/recipes` | protect | ✅ |
| POST | `/api/recipes` | protect | ✅ |
| PATCH | `/api/recipes/:productId` | protect | ✅ |
| DELETE | `/api/recipes/:productId` | protect | ✅ |

### Other Routes
- `/api/categories` — CRUD, protect
- `/api/customers` — CRUD, protect
- `/api/floor` — Tables + areas, protect
- `/api/sessions` — Cashier sessions, protect
- `/api/coupons` — Coupon CRUD + validate, protect
- `/api/promotions` — Promotions CRUD, protect
- `/api/suppliers` — Supplier CRUD, protect
- `/api/purchase-orders` — PO + GRN, protect
- `/api/wastage` — Wastage entries + approve, protect
- `/api/reports` — Business analytics, protect
- `/api/payment-methods` — Config, protect
- `/api/audit-logs` — AuditLog, protect
- `/menu` — Public menu (no auth required) ⚠ No rate limiting

---

## 2. Input Validation Coverage

| Endpoint | Validated | Method |
|----------|-----------|--------|
| POST /api/auth/login | ✅ | Manual checks |
| POST /api/auth/signup | ✅ | Manual checks |
| PATCH /api/users/:id/password | ✅ | Manual checks |
| PATCH /api/inventory/items/:id | ✅ | Explicit destructure |
| All other endpoints | ❌ | Raw req.body |

**Recommendation:** Add a Zod middleware wrapper for all write endpoints.

---

## 3. Response Format Consistency

| Check | Result |
|-------|--------|
| Error responses use `{ message: string }` | ✅ Generally consistent |
| Success responses vary (array vs `{ items, total }`) | ⚠ Inconsistent |
| No API versioning (`/v1/`) | ⚠ No versioning |
| Content-Type application/json on all responses | ✅ |
| HTTP status codes correct | ✅ |

---

## 4. Rate Limiting Coverage (After Audit)

| Route Group | Rate Limit |
|-------------|------------|
| `/api/auth/*` | 20 req / 15 min / IP |
| `/api/*` | 300 req / min / IP |
| `/menu` | ❌ No rate limit |
| `/docs` | ❌ No rate limit |

---

## 5. API Security Gaps

| Gap | Severity | Recommendation |
|-----|----------|---------------|
| No API versioning | LOW | Add `/api/v1/` prefix |
| No request ID header | MEDIUM | Add `X-Request-ID` for tracing |
| Large response payloads (reports) | MEDIUM | Add pagination + response size limit |
| `/menu` endpoint unprotected from scraping | LOW | Add soft rate limit |
| No ETag/cache headers | LOW | Add for GET endpoints |

---

## 6. API Score: 70 / 100
