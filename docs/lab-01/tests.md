# Lab 1 — Automated Tests

API tests live in `server/tests/lab-01/`, UI tests in `client/tests/lab-01/`.

| Test File | Tool | Test Description |
|-----------|------|------------------|
| `server/tests/lab-01/API-01.health.test.ts` | Supertest | `GET /api/health` returns 200 and `{ status: "ok", service: "TokTickIT API" }` |
| `server/tests/lab-01/API-02.categories.test.ts` | Supertest | `GET /api/categories` returns the four seeded categories in id order |
| `client/tests/lab-01/UI-01.heading.test.tsx` | Vitest | TokTickIT heading and Check System button render |
| `client/tests/lab-01/UI-02.loading.test.tsx` | Vitest | Loading state shows, then is replaced by the category list |
| `client/tests/lab-01/UI-03.error.test.tsx` | Vitest | API failure displays a useful error message |

## Running

The database container must be running — `API-02` queries the seeded rows for real rather than mocking Prisma, so it fails fast if the seed or the connection is broken.

```bash
cd server && npm test
cd client && npm test
```

## Results

### Backend Supertest Suite (`server/tests/lab-01/`):
```text
 ✓ tests/lab-01/API-01.health.test.ts (1 test)
 ✓ tests/lab-01/API-02.categories.test.ts (1 test)

 Test Files  2 passed (2)
      Tests  2 passed (2)
```

### Frontend Vitest Suite (`client/tests/lab-01/`):
```text
 ✓ tests/lab-01/UI-01.heading.test.tsx (1 test)
 ✓ tests/lab-01/UI-02.loading.test.tsx (1 test)
 ✓ tests/lab-01/UI-03.error.test.tsx (1 test)

 Test Files  3 passed (3)
      Tests  3 passed (3)
```
