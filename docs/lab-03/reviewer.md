# Lab 3 — Peer Review Record

Repository under review: https://github.com/Apichaya251400/TokTickIT  
Branching: Every Issue is built on its own feature branch and merged into `lab3-staging` through a reviewed Pull Request. The author does not self-approve or self-merge — all merges into `lab3-staging` require peer review and approval.

---

## My Reviewer

| Field | Value |
|---|---|
| **Name** | Pilaiwan Churdchu |
| **Student ID** | 67070503492 |
| **GitHub username** | [@Pilaiwan3492](https://github.com/Pilaiwan3492) |
| **Their repository** | https://github.com/Pilaiwan3492/TokTickIT |
| **Association on this repository** | Collaborator / Peer Reviewer |

**Author of this repository**: Aphichaya Klinhual — 67070503447 — [@Apichaya251400](https://github.com/Apichaya251400).

---

## Reviews I Received

Lab 3 Pull Requests under review by [@Pilaiwan3492](https://github.com/Pilaiwan3492). Merges into `lab3-staging` require approval.

| Pull Request | Review | Comment received | My response |
|---|---|---|---|
| **[#60](https://github.com/Apichaya251400/TokTickIT/pull/60)** — PR 17: Sprint 3 Engineering Specification & Contracts | Approved | Approved. I reviewed this PR against the Lab 3 Spec DD requirements. The specification, API contract, UI specification, functional requirements, business rules, authorization rules, and acceptance criteria are clearly defined. | Merged PR into `lab3-staging` |
| **[#61](https://github.com/Apichaya251400/TokTickIT/pull/61)** — PR 18: Sprint 3 Planned Test Strategy & Traceability Matrix | Approved | Looks good! I checked this PR against the Lab 3 Test DD requirements. The test plan, AC/BR traceability, planned test cases, test file paths, and the coverage for API, UI, authorization, responsive, and E2E are all clearly defined and match the Lab 3 requirements. Approved Nice work! | Merged PR into `lab3-staging` |
| **[#62](https://github.com/Apichaya251400/TokTickIT/pull/62)** — PR 19: Database Schema Evolution, Pure SQL Migration & Idempotent Seed | Approved | Approved!!! I re-checked the latest PR against the Lab 3 DB Migration requirements. The schema evolution, pure SQL migration, requester-to-User migration, password hashing, seed data, idempotency checks, ticket relationships, comments/notes, and migration test coverage are aligned with the Lab 3 requirements. | Merged PR into `lab3-staging` |
| **[#63](https://github.com/Apichaya251400/TokTickIT/pull/63)** — PR 20: Authentication Foundation, Token Revocation, Ownership & Auth API Tests | Approved | Overall, this PR looks good and is ready to move forward to lab3-staging. Nice work! | Merged PR into `lab3-staging` |
| **[#64](https://github.com/Apichaya251400/TokTickIT/pull/64)** — PR 21: Client Authentication, Mandatory Password Change & App Shell Navigation | Approved | The main authentication flow, password-change flow, role badges, logout, role-based navigation, and removal of the legacy Development Requester Selector look good and are aligned with the Lab 3 requirements. | Merged PR into `lab3-staging` |
| **[#65](https://github.com/Apichaya251400/TokTickIT/pull/65)** — PR 22: Requester Public Comments, Signalling & Notes Security | Approved | Approved !!! I checked this PR against the Lab 3 Requester Regression, Public Comments, Internal Notes, and Requester Signalling requirements. Overall, this PR looks good and is ready to move forward to lab3-staging. Nice work! | Merged PR into `lab3-staging` |
| **[#66](https://github.com/Apichaya251400/TokTickIT/pull/66)** — PR 23: IT Staff Ticket Queue REST API & Responsive Interface | Approved | I checked this PR against the Lab 3 IT Staff Ticket Queue requirements and Issue #54. Overall, this PR looks good and is ready to move forward to lab3-staging. Nice work! | Merged PR into `lab3-staging` |
| **[#67](https://github.com/Apichaya251400/TokTickIT/pull/67)** — PR 24: IT Staff Ticket Detail & Operational Controls | Approved | I checked this PR against the Lab 3 IT Staff Ticket Detail & Operations requirements. Overall, this PR looks good and is ready to move forward to lab3-staging. Nice work! | Merged PR into `lab3-staging` |
| **[#68](https://github.com/Apichaya251400/TokTickIT/pull/68)** — PR 25: Administrator User Management & Concurrency Guards | Approved | This fixes the previous test coverage issue and properly validates the concurrent safety guard. Looks good to me! | Merged PR into `lab3-staging` |
| **[#69](https://github.com/Apichaya251400/TokTickIT/pull/69)** — PR 26: Playwright End-to-End Test Suite & Mandatory Assertions | Approved | Approved! I checked PR #69 against the E2E test suite requirements. The dual-admin concurrency verification, mandatory assertions, and deterministic DB cleanup are passing cleanly across all 13 spec files. Good to merge! | Merged PR into `lab3-staging` |
| **[#70](https://github.com/Apichaya251400/TokTickIT/pull/70)** — PR 27: Visual QA & Responsive Design Verification | Approved | Approved. Looks good! I re-checked the latest changes, and the Playwright E2E and screenshot capture are now properly separated. The 21 responsive screenshots, visual checklist, and reviewer documentation are also updated correctly. Everything looks good to me. Nice work! | Merged PR into `lab3-staging` |

### Changes Made in Response to Review
- Validated specification consistency, operation-level authorization matrix, status transition matrix, and security decisions.
- Validated test strategy, exact test file paths, Handout Section 10 traceability, working relative links, and concurrency scenarios.

---

## Reviews I Gave

| Field | Value |
|---|---|
| **Partner name** | Pilaiwan Churdchu |
| **Partner student ID** | 67070503492 |
| **Partner GitHub username** | [@Pilaiwan3492](https://github.com/Pilaiwan3492) |
| **Partner repository** | https://github.com/Pilaiwan3492/TokTickIT |

Lab 3 Pull Requests reviewed on partner's repository.

| Pull Request I reviewed | Comment I gave | Their response |
|---|---|---|
| **[#61](https://github.com/Pilaiwan3492/TokTickIT/pull/61)** — PR 20: docs specification, api-spec, and ui-spec contracts for sprint 3 | PR #61 is good to go! Everything in the spec docs looks clean and complete. Approved, merge away! | Merged PR into `lab3-staging` |
| **[#62](https://github.com/Pilaiwan3492/TokTickIT/pull/62)** — PR 21: docs planned test strategy and ac traceability for sprint 3 | LGTM! Checked docs/lab-03/tests.md in PR #62. The planned test strategy and traceability matrices for AC-01..25 and BR-01..28 are super thorough and 100% complete! Approved and ready to merge to lab3-staging! | Merged PR into `lab3-staging` |
| **[#63](https://github.com/Pilaiwan3492/TokTickIT/pull/63)** — PR 22: feat database schema evolution, migration, and idempotent seed data | LGTM! Database schema evolution, pure SQL migration, and seed data in PR #63 look super solid! Verified zero data loss, exact enum/model alignment, and idempotent seeding. All 96 tests pass! Approved and ready to merge to lab3-staging! | Merged PR into `lab3-staging` |
| **[#64](https://github.com/Pilaiwan3492/TokTickIT/pull/64)** — PR 23: feat authentication foundation, session invalidation, and auth api tests | LGTM! Authentication foundation, token revocation, and auth guards in PR #64 are super solid and secure. Verified fail-secure JWT secret check, server-side token revocation, credential omission, and 129/129 passing tests! Approved and ready to merge to lab3-staging! | Merged PR into `lab3-staging` |
| **[#65](https://github.com/Pilaiwan3492/TokTickIT/pull/65)** — PR 24: Client Authentication, Mandatory Password Change & App Shell | Just ran the client tests and build locally on pr-65, all 75 client tests passed and tsc && vite build compiled with zero errors! Everything looks super clean. Approved and ready to merge to lab3-staging! | Merged PR into `lab3-staging` |
| **[#66](https://github.com/Pilaiwan3492/TokTickIT/pull/66)** — PR 25: Requester Regression & Public Comments | Checked PR #66 public comments look great and the internal notes guard is super solid. All 187 tests pass too. Good to merge! | Approved & merged into `lab3-staging` |
| **[#67](https://github.com/Pilaiwan3492/TokTickIT/pull/67)** — PR 26: IT Staff Queue & Ticket Processing | Checked PR #67 for you! The IT Queue and status transition code looks great, all tests passed locally, and the mobile layout looks really nice. Go ahead and merge into lab3-staging! | Approved & merged into `lab3-staging` |
| **[#68](https://github.com/Pilaiwan3492/TokTickIT/pull/68)** — PR 27 : Administrator User Management & Safety Guards | Thanks for addressing all the review comments. I checked the latest changes, and the requested test coverage, UI traceability, and active-admin handling are now covered. Everything looks good to me. Approved! | Approved & merged into `lab3-staging` |
| **[#69](https://github.com/Pilaiwan3492/TokTickIT/pull/69)** — PR 28 : End-to-End Test Suite & Responsive Visual Evidence | Checked PR #69 for you! The Playwright E2E suite, multi-device viewports (Desktop, Tablet, Mobile), responsive layout verifications, and visual evidence are all passing cleanly (140 server tests, 98 client tests, 30 E2E tests). Excellent work! Approved & ready to merge into lab3-staging! | Approved & merged into `lab3-staging` |

---

## Repository Structure & Documentation Audit

### 1. README Check
- **Existence**: `README.md` exists in repository root.
- **Setup & Execution Instructions**: Validated `server` and `client` installation, database setup (`prisma:migrate`, `prisma:seed`), dev server commands (`npm run dev`), and test commands (`npm test`, Playwright E2E).
- **Accuracy & Consistency**: Project information accurately describes TokTickIT architecture, tech stack, environment configuration, and test suites without conflicting or missing instructions.

### 2. Directory Structure Verification
- `client/`: Present and contains all frontend source code, components, and Vitest unit tests.
- `server/`: Present and contains Express API routes, middleware, Prisma schema, migrations, seed script, and Vitest API tests.
- `e2e/`: Present and contains Playwright E2E test specs for Lab 3 (`authentication.spec.ts`, `staff-ticket-flow.spec.ts`, `user-administration.spec.ts`, `lab2-regression.spec.ts`).
- `docs/lab-03/`: Present and contains canonical Lab 3 documentation (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `ai-use.md`, `reviewer.md`).


---
