# Lab 1 — Test Plan and Evidence

All test files live under server/tests/lab-01/ and client/tests/lab-01/.

| # | Tool | Test | Result |
|---|------|------|--------|
| 1 | Supertest | GET /api/health returns 200, status=ok | ✅ Pass |
| 2 | Supertest | GET /api/categories returns 4 seeded categories in id order | ⏳ Todo (Issue 4) |
| 3 | Vitest | Heading renders | ✅ Pass |
| 4 | Vitest | Success state shows Online + category list | ⏳ Todo (Issue 4) |
| 5 | Vitest | Error state shows Offline + message | ⏳ Todo (Issue 4) |

## Terminal Output — Server Tests

```
> toktickit-server@1.0.0 test
> vitest run

 RUN  v2.1.9 D:/AllStudyProject/CPE334/TokTickIT/server

 ↓ tests/lab-01/categories.test.ts (1 test | 1 skipped)
 ✓ tests/lab-01/health.test.ts (1 test) 24ms

 Test Files  1 passed | 1 skipped (2)
      Tests  1 passed | 1 todo (2)
   Start at  22:47:57
   Duration  5.22s
```

## Terminal Output — Client Tests

```
> toktickit-client@1.0.0 test
> vitest run

 RUN  v2.1.9 D:/AllStudyProject/CPE334/TokTickIT/client

 ✓ tests/lab-01/App.test.tsx (3 tests | 2 skipped) 21ms

 Test Files  1 passed (1)
      Tests  1 passed | 2 todo (3)
   Start at  22:48:10
   Duration  16.86s
```
