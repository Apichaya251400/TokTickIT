# Lab 1 — AI Use and Reflection

**LLM/agent used:** Antigravity (Gemini 3.6 Flash)

## Selected Key Prompts

| # | Prompt Name | Actual Prompt Text | Reflection |
|---|-------------|--------------------|------------|
| 1 | Work Scope & Dependency Check | "Read the attached Lab 1 specification document. Before writing any code, list all 4 Issues along with their required branch names, acceptance criteria, and dependencies. If any requirement is ambiguous, flag it for my decision before proceeding." | Forced the agent to surface ambiguous points upfront rather than making assumptions. For example, it noted that Issue 4 should not begin until Issue 3 categories are seeded in dev, matching the dependency note in the lab spec. |
| 2 | Foundation Setup & Strict Scoping | "Set up `feature/1-project-foundation`: client with React+TS+Vite+Bootstrap, server with Express+TS, and Prisma connected to PostgreSQL on port 5433 (via Docker). Do not add auth, ticket logic, or anything beyond Issue 1 criteria — I will reject out-of-scope work." | Explicit scope boundaries kept the diff small and easy to review — the PR touched only foundation files with zero unnecessary scope creep. |
| 3 | Health Check with Precise Spec | "Implement `GET /api/health` following the response format specified in the spec: `{ status: 'ok', service: 'TokTickIT API' }`. Write the Supertest test case first and then make it pass — do not skip the red-green cycle." | Requesting test-first implementation forced clear red→green evidence rather than just returning working code, making test artifacts for `tests.md` straightforward. |
| 4 | Category Model & Idempotency Proof | "Add the Category model exactly as defined in Section 9, migrate it, and write a seed script using `upsert` so re-running produces no duplicates. Prove idempotency by running seed twice and showing row count is unchanged." | Asking for explicit proof caught an early draft that used `create()` instead of `upsert()`, which would have caused duplicate key errors on subsequent runs. |
| 5 | Category List — Real Data Only | "Wire up `GET /api/categories` via Prisma ordered predictably (id ascending). On the client, do not hardcode category arrays — fetch from the API endpoint. Reuse the loading/error state pattern from Issue 2." | Reusing the established state pattern from Issue 2 ensured UI consistency across `App.tsx` instead of ending up with fragmented loading state conventions. |
| 6 | Rejecting Unrealistic Mock Tests | "The category test currently mocks Prisma. This does not prove the database layer actually works. Rewrite it to query the real seeded PostgreSQL instance via Supertest without mocking." | Caught this during review: a mocked test passes even if database migrations are broken. Demanding a real integration test ensured genuine end-to-end verification. |

## Overall Reflection

Setting strict scope boundaries for each branch and demanding empirical proof (rather than assumptions) helped catch two critical issues early: a non-idempotent seed script and false confidence from mocked tests. Realizing that the mock test passed falsely — even though it never verified database connectivity — highlighted the importance of inspecting what test assertions actually check, rather than relying solely on green checkmarks.
