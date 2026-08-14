# Lab 1 — AI Use and Reflection

**LLM/agent used:** Antigravity (Gemini 3.6 Flash)

## Selected key prompts (6–10)
| # | Prompt (summarised) | What I did with the result |
|---|---------------------|----------------------------|
| 1 | Plan Lab 1 Implementation | Generated detailed architecture and issue roadmap |
| 2 | Setup Project Foundation | Installed client/server npm packages and updated README |
| 3 | Implement Health Check API | Added GET /api/health endpoint and verified via Supertest |
| 4 | Define Prisma Category Model | Added Category model to schema.prisma and generated migration |
| 5 | Write Idempotent Seed Script | Implemented upsert for 4 categories in seed.ts |
| 6 | Implement GET /api/categories | Created category list endpoint returning id and name in ID order |
| 7 | Build Check System React UI | Implemented state transitions and rendered category list in App.tsx |
| 8 | Write Vitest UI Test Suite | Created UI tests asserting Online status, category items, and Offline errors |

## Reflection
Providing explicit acceptance criteria and branch constraints in prompts made agent responses precise and modular. I had to guide the agent to strictly separate Issue 2 (health check) from Issue 4 (category list) to ensure clean git PR history.
