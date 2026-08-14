# Lab 1 — Test Plan and Evidence

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | Pass |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | Pass |
| 3 | Vitest | Heading renders | Pass |
| 4 | Vitest | Success state shows Online + category list | Pass |
| 5 | Vitest | Error state shows Offline + message | Pass |

## Terminal Output — Server Tests

```
> toktickit-server@1.0.0 test
> vitest run

 RUN  v2.1.9 D:/AllStudyProject/CPE334/TokTickIT/server

 ✓ tests/lab-01/health.test.ts (1 test) 18ms
 ✓ tests/lab-01/categories.test.ts (1 test) 696ms
   ✓ GET /api/categories > returns the four seeded categories in id order 695ms

 Test Files  2 passed (2)
      Tests  2 passed (2)
   Start at  20:38:10
   Duration  3.20s
```

## Terminal Output — Client Tests

```
> toktickit-client@1.0.0 test
> vitest run

 RUN  v2.1.9 D:/AllStudyProject/CPE334/TokTickIT/client

 ✓ tests/lab-01/App.test.tsx (3 tests) 190ms

 Test Files  1 passed (1)
      Tests  3 passed (3)
   Start at  20:38:33
   Duration  16.66s
```
