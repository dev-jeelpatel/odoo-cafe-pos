# Bug Report — Cafe POS System
**Date:** 2026-06-30

---

## Fixed Bugs (This Audit Session)

### BUG-001: Inventory Item Save Error (PUT /inventory/items/:id)
- **Severity:** HIGH
- **Status:** ✅ FIXED
- **Symptom:** Editing any inventory item in the Items page returned a 400 error; changes not saved
- **Root Cause 1:** `inventoryController.updateItem` passed entire `req.body` to `prisma.inventoryItem.update()`. The body included nested relations (`category: {...}`, `supplier: {...}`, `batches: [...]`) that Prisma rejected as unknown fields.
- **Root Cause 2:** `ItemModal` in `frontend/src/app/(pos)/inventory/items/page.tsx` initialized form state from the full item object (including relations), then sent all of it in the PUT payload.
- **Fix:** Backend destructures only known scalar fields. Frontend form initializes with only scalar fields.
- **Files:** `backend/src/controllers/inventoryController.ts`, `frontend/src/app/(pos)/inventory/items/page.tsx`

### BUG-002: Inventory Dashboard Crash
- **Severity:** HIGH
- **Status:** ✅ FIXED
- **Symptom:** `/inventory` page showed error; inventory dashboard entirely unusable
- **Root Cause:** `getDashboard` used `prisma.inventoryItem.fields.minStock` (a Prisma `FieldRef` object) in a `count()` query's `lte` clause. Prisma does not support cross-field comparisons in `count()`.
- **Fix:** Fetch all items, compute `lowStockCount` in JavaScript filter.
- **Files:** `backend/src/controllers/inventoryController.ts`

### BUG-003: Duplicate Products on POS/Orders/Products Pages
- **Severity:** MEDIUM
- **Status:** ✅ FIXED
- **Symptom:** Products like "Cold Coffee", "French Fries", "Veg Burger" appeared twice in all product listings and POS terminal
- **Root Cause:** Both the demo seed and the user's own product creation added the same-named products. `getProducts` returned all `active: true` products, so duplicates showed.
- **Fix:** Created and ran `cleanupDuplicates.js` to soft-delete (`active: false`) 9 specific duplicate products. 56 active products remain.

### BUG-004: Recipes Page Showing Duplicate Products
- **Severity:** MEDIUM
- **Status:** ✅ FIXED
- **Symptom:** Recipe page showed same product appearing multiple times making recipe assignment difficult
- **Root Cause:** Same as BUG-003 — duplicated products. Additionally, products of the same name in different categories weren't visually grouped.
- **Fix:** Duplicate cleanup (BUG-003) + sort by category → name in recipe page.

---

## Open Bugs (Unfixed)

### BUG-005: Socket.io Events Broadcast to All Clients
- **Severity:** MEDIUM
- **Status:** ⚠ Open
- **Symptom:** Kitchen Display System receives order updates even on tables it's not monitoring; POS terminals receive kitchen completion events
- **Root Cause:** `io.emit()` broadcasts to all connected sockets. No room-based scoping.
- **Reproduction:** Open two browser tabs (POS and KDS), place order — both tabs receive all events
- **Recommended Fix:** Implement Socket.io rooms (`io.to('kitchen').emit(...)`)

### BUG-006: Session Not Closed on Logout
- **Severity:** LOW
- **Status:** ⚠ Open
- **Symptom:** Logging out leaves the cashier session in OPEN status in the DB
- **Root Cause:** Frontend logout only clears localStorage token; no API call to close the session
- **Impact:** Session summary reports may show sessions that were never properly closed
- **Recommended Fix:** Add `POST /api/auth/logout` endpoint that sets session status to CLOSED

### BUG-007: Order Number Race Condition (Theoretical)
- **Severity:** MEDIUM (at scale)
- **Status:** ⚠ Open
- **Symptom:** Two orders created simultaneously may get the same order number
- **Root Cause:** `orderNumber.ts` uses `SELECT MAX(orderNumber) + 1` — not atomic
- **Reproduction:** Requires concurrent load; not reproducible with single user
- **Recommended Fix:** Use a PostgreSQL sequence: `CREATE SEQUENCE order_number_seq; SELECT nextval('order_number_seq')`

### BUG-008: Inventory Deduction Silently Fails
- **Severity:** MEDIUM
- **Status:** ⚠ Open
- **Symptom:** If inventory deduction fails (e.g., recipe not found, DB error), payment still succeeds but stock is never decremented
- **Root Cause:** `deductForOrder()` is called with `void deductForOrder(...)` — errors not propagated
- **Impact:** Inventory counts become inaccurate over time without any alert
- **Recommended Fix:** Await the call and log failures to AuditLog:
```typescript
try {
  await deductForOrder(order.id);
} catch (err) {
  await prisma.auditLog.create({
    data: { userId: req.user.id, action: 'INVENTORY_DEDUCTION_FAILED', entityType: 'Order', entityId: order.id, details: String(err) }
  });
}
```

### BUG-009: Orders Page Has No Pagination
- **Severity:** MEDIUM
- **Status:** ⚠ Open
- **Symptom:** After several months of operation, the orders page will load thousands of orders at once, causing slow load and browser memory pressure
- **Root Cause:** `GET /api/orders` has no `take` limit; frontend renders all results
- **Recommended Fix:** Add `?page=1&limit=50` pagination to both backend and frontend

### BUG-010: Missing try/catch in Several Controllers
- **Severity:** LOW
- **Status:** ⚠ Open
- **Affected controllers:** `sessionController`, `customerController`, `floorController`, `categoryController`
- **Risk:** Unhandled Prisma errors (e.g., unique constraint violations) will crash with 500 and expose Prisma error messages
- **Recommended Fix:** Wrap all async controller functions in try/catch, or add an async wrapper middleware

---

## Bug Summary

| Severity | Fixed | Open |
|----------|-------|------|
| High | 2 | 0 |
| Medium | 2 | 4 |
| Low | 0 | 2 |
| **Total** | **4** | **6** |
