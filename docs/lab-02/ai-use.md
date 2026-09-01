# Lab 2 — AI Use and Reflection

**LLM / Agent used:** Claude Opus 4.6 / Gemini 3.6 Flash

## Selected Key Prompts (6–10)

| #   | Prompt (summarised)                                                                                                                                                                                             | What I did with the result                                                                                                                                             |
| :-- | :-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | From this pdf and current project, make docs-lab2 folder create requirement as 6 .md file based on pdf requirement and let me review it                                                                         | Review `api-spec.md`, `specification.md`, `test.md` and `ui-spec.md` . I check correlation between all lab2 md file's content if it go along and don't conflict.       |
| 2   | Create `AGENTS.md` to summarize project context, Lab 2 requirements, and implementation history for future AI sessions, and add `.agents/` to `.gitignore`.                                                     | Verified `AGENTS.md` accurately captured project stack, database models, API specs, and issue roadmap; verified `.gitignore` ignored `.agents/`.                       |
| 3   | Implement Feature #2-2 (Schema & Seed): Create Prisma schema models/enums and write an idempotent seed script for categories, related systems, and requesters.                                                  | Generated schema with `RequesterUser`, `Category`, `RelatedSystem`, `Ticket`, and `Attachment`, applied migration `lab2_schema`, and verified seed script idempotency. |
| 4   | Implement Feature #2-3 (Reference Data APIs): Add `GET /api/requesters`, `GET /api/categories`, and `GET /api/related-systems` (with `?categoryId` filter), configure Vitest env loading, and write test suite. | Added API routes in Express, created tests `API-10`, `API-11`, `API-12` under `server/tests/lab-02/`, configured Vitest `.env` loading, and verified all tests pass.   |
| 5   | Implement Feature #2-4 (Dev Requester Selector): Create Zen Green CSS theme tokens, React RequesterContext with localStorage state persistence, Dev Requester Selection screen, App Header shell with route guard, and UI-01 unit tests. | Built Zen Green visual design tokens, `RequesterContext` state provider with local storage persistence, `RequesterSelector` component with loading/empty/error states, App shell with route guard, and verified `UI-01` component tests passing. |
| 6   |                                                                                                                                                                                                                 |                                                                                                                                                                        |

---

## My Reflection
