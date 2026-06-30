# Performance Report — Cafe POS System
**Date:** 2026-06-30

---

## 1. Backend Performance

### API Response Time Estimates (Development Environment)

| Endpoint | Estimated P50 | Risk |
|----------|--------------|------|
| GET /api/products (56 items) | ~15ms | Low |
| GET /api/orders (all) | ~50-200ms | ⚠ Grows unbounded |
| POST /api/orders/:id/payment | ~80ms | Low |
| GET /api/inventory/dashboard | ~60ms | Low |
| GET /api/reports | ~200-500ms | ⚠ Heavy aggregation |
| GET /api/inventory/items (50) | ~20ms | Low |

### Database Query Performance

#### Hot Paths (Orders per minute on busy POS)
```
1. GET /api/products → ~1 query, cached by React Query
2. POST /api/orders → ~3 queries (create, orderNumber, audit)
3. POST /api/orders/:id/send-to-kitchen → ~1 query + Socket.io emit
4. POST /api/orders/:id/payment → ~6 queries in transaction + inventory deduction
```

#### Slow Queries (No Index)
| Query | Current Plan | With Index |
|-------|-------------|------------|
| `WHERE status = 'PENDING'` on orders | Sequential scan | Index scan (5-10x faster) |
| `WHERE createdAt >= ?` on stock_movements | Sequential scan | Index scan (5-10x faster) |
| `WHERE userId = ?` on audit_logs | Sequential scan | Index scan |

#### N+1 Pattern in `deductForOrder`
```typescript
// Current: N products → N recipe queries
for (const item of order.items) {
  const recipe = await prisma.recipe.findUnique({ where: { productId: item.productId } });
  // ... deduct stock for each ingredient
}

// Optimized: 1 batch query
const productIds = order.items.map(i => i.productId);
const recipes = await prisma.recipe.findMany({
  where: { productId: { in: productIds } },
  include: { ingredients: true }
});
```

---

## 2. Frontend Performance

### Bundle Analysis

| Metric | Value | Target |
|--------|-------|--------|
| Estimated JS bundle (unoptimized) | ~800KB | < 300KB |
| Next.js automatic code splitting | ✅ Per route | — |
| Images optimized via next/image | ❌ Mostly raw `<img>` | Use next/image |
| Font loading | ✅ next/font | — |
| Unused component imports | ⚠ Some barrel imports | Tree-shake |

### React Query Configuration
```typescript
// Current: staleTime 30s — reasonable for a POS
// Fresh data on window focus — ✅ good for live POS
const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1 },
  },
});
```

**Assessment:** React Query config is well-tuned for a POS system.

### Rendering Performance

| Page | Issue | Severity |
|------|-------|----------|
| `/orders` | No pagination — renders all orders | HIGH |
| `/pos` | 56+ products without virtualization | LOW |
| `/inventory/items` | Pagination exists ✅ | OK |
| `/reports` | Recharts renders on every query | MEDIUM |

---

## 3. Real-time Performance (Socket.io)

| Check | Result |
|-------|--------|
| Events scoped correctly (not broadcast to all) | ⚠ Uses `io.emit()` for kitchen events |
| No room-based isolation (e.g., per-table) | ⚠ All clients receive all events |
| Reconnection logic | ✅ socket.io-client auto-reconnects |
| Heartbeat/ping | ✅ Socket.io default (25s) |

**Optimization:** Use Socket.io rooms to scope kitchen events to kitchen displays only:
```typescript
// On send-to-kitchen:
io.to('kitchen').emit('kitchen:new-order', order);

// Kitchen client joins room:
socket.join('kitchen');
```

---

## 4. Caching Strategy

| Layer | Current | Recommended |
|-------|---------|------------|
| React Query | 30s stale time | ✅ Good |
| API HTTP cache headers | None | Add Cache-Control for static data |
| Products/categories | No server cache | Redis for frequently-read data |
| Database connection pool | Prisma default (5) | Increase to 10-20 for production |

---

## 5. Load Testing Estimates

| Scenario | Estimated Capacity | Bottleneck |
|----------|------------------|-----------|
| Concurrent POS terminals | 10-15 | Socket.io connections |
| Orders per minute | 50-100 | DB write throughput |
| Report generation | 2-3 concurrent | CPU for aggregation |
| Peak hour (lunch rush) | ~200 req/min | API rate limit: 300/min ✅ |

**Current rate limits are generous enough for typical cafe operation.**

---

## 6. Performance Score: 70 / 100

### Quick Wins (implement in < 1 day)
1. Add missing DB indexes (see Database Audit) — no code change, just schema
2. Add `take: 100` limit to GET /api/orders
3. Replace `<img>` with `next/image` on product thumbnails

### Medium-term (1-3 days)
1. Paginate orders and audit log endpoints
2. Optimize `deductForOrder` N+1 query
3. Add Socket.io rooms for kitchen-only events
