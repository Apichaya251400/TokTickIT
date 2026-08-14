# Lab 1 — Test Plan and Evidence  (fill this in)

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | PASS |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | PASS |
| 3 | Vitest | Heading renders | PASS |
| 4 | Vitest | Success state shows Online + category list | PASS |
| 5 | Vitest | Error state shows Offline + message | PASS |

### Passing Terminal Output Summary

#### Backend Supertest Suite (`server/tests/lab-01/`):
```
 ✓ tests/lab-01/health.test.ts (1 test)
 ✓ tests/lab-01/categories.test.ts (1 test)

 Test Files  2 passed (2)
      Tests  2 passed (2)
```

#### Frontend Vitest Suite (`client/tests/lab-01/`):
```
 ✓ tests/lab-01/App.test.tsx (3 tests)

 Test Files  1 passed (1)
      Tests  3 passed (3)
```
