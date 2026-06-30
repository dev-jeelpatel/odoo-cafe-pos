# Risk Priority Matrix — Cafe POS System
**Date:** 2026-06-30

---

## Risk Matrix

Risk Score = Severity × Likelihood × Business Impact

| Severity | Score |
|----------|-------|
| Critical (9-10) | 4 |
| High (7-8.9) | 3 |
| Medium (4-6.9) | 2 |
| Low (1-3.9) | 1 |

| Likelihood | Score |
|------------|-------|
| Certain | 4 |
| Likely | 3 |
| Possible | 2 |
| Unlikely | 1 |

---

## Prioritized Risk Register

| ID | Risk | Sev | Likelihood | Score | Status |
|----|------|-----|-----------|-------|--------|
| R01 | Weak JWT secret — token forgeable | 4 | 2 | **8** | ⚠ Open |
| R02 | No rate limiting on auth | 4 | 3 | **12** | ✅ Fixed |
| R03 | Socket.io unauthenticated | 3 | 3 | **9** | ⚠ Open |
| R04 | No HTTPS (cleartext tokens) | 3 | 3 | **9** | ⚠ Open (infra) |
| R05 | Any role can process payments | 3 | 2 | **6** | ⚠ Open |
| R06 | Email credentials in .env | 3 | 2 | **6** | ⚠ Open |
| R07 | Inventory deduction silent failure | 2 | 3 | **6** | ⚠ Open |
| R08 | User enumeration on login | 3 | 2 | **6** | ✅ Fixed |
| R09 | bcrypt DoS (oversized password) | 3 | 2 | **6** | ✅ Fixed |
| R10 | Stack traces exposed | 3 | 2 | **6** | ✅ Fixed |
| R11 | Mass assignment on updateItem | 3 | 2 | **6** | ✅ Fixed |
| R12 | No request body limit | 2 | 2 | **4** | ✅ Fixed |
| R13 | Order number race condition | 2 | 2 | **4** | ⚠ Open |
| R14 | IDOR on order endpoints | 2 | 2 | **4** | ⚠ Open |
| R15 | No DB indexes on hot tables | 2 | 3 | **6** | ⚠ Open |
| R16 | Session not closed on logout | 1 | 3 | **3** | ⚠ Open |
| R17 | Missing try/catch in controllers | 2 | 2 | **4** | ⚠ Open |
| R18 | Token stored in localStorage | 2 | 2 | **4** | ⚠ Open |
| R19 | Orders page no pagination | 2 | 3 | **6** | ⚠ Open |

---

## Action Priority (P1 → P4)

### P1 — Fix Before Any Production Deploy
| Item | Action |
|------|--------|
| R01 Weak JWT secret | Generate 512-bit secret: `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` → update .env |
| R03 Socket.io unauthenticated | Add JWT middleware to Socket.io handshake |
| R04 No HTTPS | Set up Nginx + Let's Encrypt or Cloudflare proxy |

### P2 — Fix Within 2 Weeks of Launch
| Item | Action |
|------|--------|
| R05 Role enforcement | Add `requireRole()` to routes per RBAC matrix |
| R06 Email credentials | Move to environment secrets vault |
| R07 Inventory deduction silent failure | Await deductForOrder + log failures |
| R15 Missing DB indexes | Add Prisma `@@index` annotations + migrate |
| R19 Orders pagination | Add take/skip to GET /api/orders |

### P3 — Fix Within 1 Month
| Item | Action |
|------|--------|
| R13 Order number race | Replace MAX+1 with PostgreSQL sequence |
| R14 IDOR on orders | Add ownership check or admin bypass |
| R17 Missing try/catch | Wrap remaining controllers |

### P4 — Backlog
| Item | Action |
|------|--------|
| R16 Session cleanup | Add logout endpoint |
| R18 localStorage token | Consider httpOnly cookie |
| R12 (fixed) | Maintain 1MB limit |

---

## Risk Heat Map

```
                 LIKELIHOOD
                 Unlikely  Possible  Likely  Certain
            ┌─────────────────────────────────────┐
  Critical  │         │   R01    │  R02✅  │       │
            ├─────────────────────────────────────┤
  High      │         │  R05,R06 │  R03,R04│       │
            ├─────────────────────────────────────┤
  Medium    │         │R13,R14,  │R07,R15, │       │
            │         │R17,R18   │R19      │       │
            ├─────────────────────────────────────┤
  Low       │         │          │  R16    │       │
            └─────────────────────────────────────┘
                                ✅ = Fixed
```
