# Lab 4 — Peer Review Record

Repository under review: https://github.com/Apichaya251400/TokTickIT  
Branching: Every Issue is built on its own feature branch and merged into `lab4-staging` through a reviewed Pull Request. The author does not self-approve or self-merge — all merges into `lab4-staging` require peer review and approval.

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

Lab 4 Pull Requests under review by [@Pilaiwan3492](https://github.com/Pilaiwan3492). Merges into `lab4-staging` require peer approval.

| Pull Request | Review | Comment received | My response |
|---|---|---|---|
| **[#85](https://github.com/Apichaya251400/TokTickIT/pull/85)** — PR 28: Sprint 4 Engineering Specification & Architecture Contracts | Approved | Approved. Spec DD defines all contracts: ActionTaken, IdempotencyRecord, Resolution Gate, optimistic concurrency, and Dashboard endpoints. | Merged PR into `lab4-staging` |
| **[#86](https://github.com/Apichaya251400/TokTickIT/pull/86)** — PR 29: Sprint 4 Planned Test Strategy & Traceability Matrix | Approved | Test plan is comprehensive and covers all ACs, concurrency tests, idempotency token tests, and E2E suites. Approved! | Merged PR into `lab4-staging` |
| **[#87](https://github.com/Apichaya251400/TokTickIT/pull/87)** — PR 30: Database Schema Evolution, Pure SQL Migration & Seed Data | Approved | Approved. Migration is pure SQL with safe rollback, idempotent seed, and ticket_number_seq dynamic synchronization. | Merged PR into `lab4-staging` |
| **[#89](https://github.com/Apichaya251400/TokTickIT/pull/89)** — PR 31: Actions Taken Backend REST API & Concurrency Controls | Approved | Excellent implementation of Idempotency-Key caching, foreign key validation, and optimistic concurrency. Tests pass cleanly. | Merged PR into `lab4-staging` |
| **[#90](https://github.com/Apichaya251400/TokTickIT/pull/90)** — PR 32: Actions Taken Workspace Interface & Form Hardening | Approved | Great UI design with Zen Green styling, collapsible form, form data preservation upon failure, and complete RTL unit tests. | Merged PR into `lab4-staging` |
| **[#91](https://github.com/Apichaya251400/TokTickIT/pull/91)** — PR 33: Formal Ticket Workflow, Resolution Gate & Advisory Signalling | Approved | Resolution Gate logic, stale update banners, and advisory signalling tests verified and passing across all suites. Approved! | Merged PR into `lab4-staging` |
| **[#92](https://github.com/Apichaya251400/TokTickIT/pull/92)** — PR 34: Requester Dashboard & Workload Overview | Approved | Approved with drill-down polish: 30-day resolved parameter contract aligned, Return to My Tickets navigation fixed, and EVD-REQBDASH-08 added. | Merged PR into `lab4-staging` |

### Changes Made in Response to Review
- **Issue 8 / PR #92**: Aligned My Tickets drill-down contract for 30-day recently resolved filter (`filterResolvedWithinDays=30`).
- **Issue 8 / PR #92**: Ensured Ticket Not Found state navigates back to My Tickets (`activeTab = "my-tickets"`).
- **Issue 8 / PR #92**: Added authoritative ownership-isolation API evidence (`EVD-REQBDASH-08.json`).
- **Issue 9 (Regression)**: Integrated Playwright E2E test suite (52 tests) directly into GitHub Actions CI (`.github/workflows/ci.yml`).
- **Issue 9 (Regression)**: Strengthened multi-viewport assertions in `TEST-RESP-01` across Desktop (`1920x1080`), Tablet (`768x1024`), and Mobile (`375x812`), verifying all 4 cards are rendered and responsive (sequential on desktop, stacked on mobile).
- **Issue 9 (Regression)**: Enhanced non-color accessibility verification in `TEST-A11Y-01` to loop through all visible status, priority, and role badges asserting explicit readable textual labels.
- **Issue 9 (Regression)**: Added real simulated network drop & UI retry test (`page.route` abort) confirming form inputs are preserved and retry succeeds with the same `Idempotency-Key`.
- **Issue 9 (Regression)**: Added visible focus rings (`2px solid #198754`) across all viewports to guarantee accessibility standards.
- **Issue 9 (Regression)**: Updated test helpers in Lab 3 and Lab 4 E2E suites to navigate to target tabs from the new default dashboard viewports.

---

## Reviews I Gave

| Field | Value |
|---|---|
| **Partner name** | Pilaiwan Churdchu |
| **Partner student ID** | 67070503492 |
| **Partner GitHub username** | [@Pilaiwan3492](https://github.com/Pilaiwan3492) |
| **Partner repository** | https://github.com/Pilaiwan3492/TokTickIT |

Lab 4 Pull Requests reviewed on partner's repository.

| Pull Request I reviewed | Comment I gave | Their response |
|---|---|---|
| **PR: Lab 4 Engineering Specifications** | LGTM! Checked all data models, API endpoints, and Resolution Gate state transition diagrams. Approved. | Merged PR into `lab4-staging` |
| **PR: Lab 4 Planned Test Strategy** | Very thorough test plan covering AC-01..25, concurrency races, and multi-device viewports. Approved! | Merged PR into `lab4-staging` |
| **PR: Pure SQL Migration & Idempotent Seed** | Migration script and seed idempotent checks look great. All tests pass cleanly. | Merged PR into `lab4-staging` |
| **PR: Actions Taken REST API & Concurrency** | Idempotency token deduplication and optimistic locking are solid. Approved! | Merged PR into `lab4-staging` |
| **PR: Actions Taken Workspace UI** | Nice work on the form data preservation, badges, and responsive behavior. Approved! | Merged PR into `lab4-staging` |
| **PR: Ticket Workflow & Resolution Gate** | Checked Resolution Gate inline validation and stale 409 conflict banners. Everything looks clean. | Merged PR into `lab4-staging` |
| **PR: Requester Dashboard & Workload Overview** | Verified owned metric cards, 30-day resolved query parameter, and drill-down navigation. Approved! | Merged PR into `lab4-staging` |

---

## Repository Structure & Documentation Audit

### 1. README Check
- **Existence**: `README.md` exists in repository root.
- **Setup & Execution Instructions**: Validated server and client setup, database migration (`prisma:migrate`), idempotent seed (`prisma:seed`), and dev server commands.
- **Test Commands**: Verified commands for server tests (282), client tests (129), and Playwright E2E tests (52).

### 2. Directory Structure Verification
- `client/`: Frontend React 18 + Vite source code, components, and Vitest unit tests.
- `server/`: Express API routes, middleware, Prisma schema, migrations, seed script, and Vitest API tests.
- `e2e/`: Playwright E2E test suites for Lab 2, Lab 3, and Lab 4.
- `docs/lab-04/`: Lab 4 documentation (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, `ai-use.md`, `regression-evidence.md`).
- `artifacts/lab-04/`: Evidence screenshots and JSON payloads for Actions Taken (`EVD-ACT-*`), Staff Dashboard (`EVD-STAFFDASH-*`), Requester Dashboard (`EVD-REQBDASH-*`), Ticket Workflow (`EVD-WORKFLOW-*`), and Regression (`EVD-REG-*`).
