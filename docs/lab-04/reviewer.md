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
| **[#84](https://github.com/Apichaya251400/TokTickIT/pull/84)** — PR 29: docs(lab-04): finalize Sprint 4 engineering contract and specs (LAB4-01) | Approved | Requested clarifications: replace "business intelligence" with "operational dashboards", clarify `createdAt` is authoritative, define `recentlyResolvedCount` using `updatedAt`, and standardize `Asia/Bangkok (UTC+7)`. Approved after updates. | Clarified definitions in specification, API spec, and UI spec; merged PR into `lab4-staging`. |
| **[#85](https://github.com/Apichaya251400/TokTickIT/pull/85)** — PR 30: docs(lab-04): add test strategy and requirement traceability matrix (LAB4-03) | Approved | "I checked PR #85 carefully against the Lab 4 requirements. I did not find any major missing requirement or blocking issue... Overall, I think PR #85 is ready for approval. Good work!" | Merged PR into `lab4-staging`. |
| **[#86](https://github.com/Apichaya251400/TokTickIT/pull/86)** — PR 31: feat(db): extend Prisma schema with ActionTaken, IdempotencyRecord, migration, and idempotent seed (LAB4-03) | Approved (Changes requested & resolved) | Found issue in `migration.test.ts` where replay used `EXCEPTION WHEN OTHERS THEN NULL;` silently ignoring errors. Recommended allowing only duplicate-object errors. Approved after fix. | Updated `migration.test.ts` to fail on unexpected errors while permitting duplicate objects; merged PR into `lab4-staging`. |
| **[#87](https://github.com/Apichaya251400/TokTickIT/pull/87)** — PR 32: feat(actions): implement Actions Taken REST API operations, idempotency, lifecycle status transitions, and integration tests (LAB4-04) | Approved | Confirmed Actions Taken API, validation, idempotency, and concurrency checks look good; noted ticket status update concurrency would be verified in workflow PR. Approved. | Confirmed ticket status stale-update concurrency is handled in Issue 6 (PR #89); merged PR into `lab4-staging`. |
| **[#88](https://github.com/Apichaya251400/TokTickIT/pull/88)** — PR 33: feat(ui): implement Actions Taken workspace, role controls, and evidence capture (Issue 5) | Approved (Changes requested & resolved) | Recommended improving keyboard accessibility in Edit Action modal, showing error with retry option when loading assignees fails, and verifying ticket number sequence sync in seed. Approved after fixes. | Added modal keyboard focus trapping, retry state on assignee error, and verified `ticket_number_seq` synchronization; merged PR into `lab4-staging`. |
| **[#89](https://github.com/Apichaya251400/TokTickIT/pull/89)** — PR 34: feat(workflow): final ticket workflow, resolution gate, and concurrency controls (Issue 6) | Approved | Verified all 15 permitted transitions, UI error handling, stale updates (409 Conflict), Resolution Gate validation, and passing CI. Approved. | Merged PR into `lab4-staging`. |
| **[#91](https://github.com/Apichaya251400/TokTickIT/pull/91)** — PR 36: feat(dashboard): implement IT staff dashboard and authoritative metrics (LAB4-07) *(Superseded #90)* | Approved | Verified `GET /api/tickets` authorization rules documented in API spec (Administrator access permitted, Requester denied 403), operation matrix updated, and CI passing. Approved. | Documented operation-level authorization matrix for `GET /api/tickets` in `api-spec.md`; merged PR into `lab4-staging`. |
| **[#92](https://github.com/Apichaya251400/TokTickIT/pull/92)** — PR 37: feat(dashboard): implement requester dashboard, metrics, and attention worklist (LAB4-08) | Approved | Verified fixes: "Return to My Tickets" button navigates correctly, "Recently Resolved" card filters last 30 days, regression tests and API docs updated, and CI checks passing. Approved. | Aligned 30-day resolved filter contract, fixed not-found fallback navigation, added `EVD-REQBDASH-08` evidence; merged PR into `lab4-staging`. |
| **[#93](https://github.com/Apichaya251400/TokTickIT/pull/93)** — PR 38: feat(regression): complete Lab 1-3 regression, responsive-a11y, and product hardening (LAB4-09) | Approved & Merged | Verified 56/56 E2E, 282 server, 129 client tests (467 total). Reviewer requested CI Playwright job, 4-card responsive verification, visible badge text audit, simulated network drop retry, tests.md status updates to Pass, 44x44px touch targets, separate EVD-REG-01 component logs, ActionTaken record count assertion for idempotency, final product hardening audit (console errors, broken links, placeholder text, functional controls), full idempotency response contract object comparison (`toMatchObject` / `toEqual`), and real SPA navigation destination verification beyond HTTP < 400. Approved by [@Pilaiwan3492](https://github.com/Pilaiwan3492). | Implemented Playwright CI job, responsive 4-card checks, non-color badge loop, network drop test, updated tests.md to Pass, enforced >= 44x44px touch targets, added ActionTaken DB assertions, generated clean split logs (`EVD-REG-01-server`, `client`, `e2e`), implemented automated product hardening suite (`final-product-hardening.spec.ts` / `EVD-REG-07`), compared full idempotency response body contract, and tested real links and SPA view destinations across all 8 views without 404; merged into `lab4-staging`. |
| **PR 39** (Branch `feature/lab4-visual-qa`) — feat(visual-qa): Zen Green UI, responsive viewports, and accessibility verification (LAB4-10) | Under Review | Verified all 8 major TokTickIT screens across Desktop (1920×1080), Tablet (768×1024), and Mobile (375×812) viewports. Implemented automated Playwright visual-accessibility suite (`visual-accessibility-qa.spec.ts` - 7/7 PASS), verified zero horizontal overflow, visible focus rings (`#198754`), mobile touch targets >= 44×44px, and captured evidence artifacts `EVD-QA-01` through `EVD-QA-08`. | Submitted for peer review by [@Pilaiwan3492](https://github.com/Pilaiwan3492). |

### Changes Made in Response to Review
- **Issue 8 / PR #92**: Aligned My Tickets drill-down contract for 30-day recently resolved filter (`filterResolvedWithinDays=30`).
- **Issue 8 / PR #92**: Ensured Ticket Not Found state navigates back to My Tickets (`activeTab = "my-tickets"`).
- **Issue 8 / PR #92**: Added authoritative ownership-isolation API evidence (`EVD-REQBDASH-08.json`).
- **Issue 9 (Regression)**: Integrated Playwright E2E test suite (56 tests) directly into GitHub Actions CI (`.github/workflows/ci.yml`).
- **Issue 9 (Regression)**: Strengthened multi-viewport assertions in `TEST-RESP-01` across Desktop (`1920x1080`), Tablet (`768x1024`), and Mobile (`375x812`), verifying all 4 cards are rendered and responsive (sequential on desktop, stacked on mobile).
- **Issue 9 (Regression)**: Enhanced non-color accessibility verification in `TEST-A11Y-01` to loop through all visible status, priority, and role badges asserting explicit readable textual labels.
- **Issue 9 (Regression)**: Added real simulated network drop & UI retry test (`page.route` abort) confirming form inputs are preserved and retry succeeds with the same `Idempotency-Key`.
- **Issue 9 (Regression)**: Added visible focus rings (`2px solid #198754`) across all viewports to guarantee accessibility standards.
- **Issue 9 (Regression)**: Updated test helpers in Lab 3 and Lab 4 E2E suites to navigate to target tabs from the new default dashboard viewports.
- **Issue 9 (Regression)**: Updated test statuses in `docs/lab-04/tests.md` from `Planned` to `Pass` across all verified criteria (AC-13, AC-14, Lab 1 Foundation, Lab 2 Ticket Base, Lab 3 RBAC & Admin).
- **Issue 9 (Regression)**: Aligned touch target assertions in `TEST-RESP-01` to test both width and height >= 44px (`>= 44×44px`), and synchronized `EVD-REG-05` evidence metadata.
- **Issue 9 (Regression)**: Enhanced idempotency test in `e2e/lab-04/regression-hardening.spec.ts` with full response contract object matching (`toMatchObject`), deep equality verification (`expect(body2).toEqual(body1)`), unique payload marker, and querying `prisma.actionTaken` directly to assert `actionRecords.length === 1` and `actionRecords[0].id === body1.id`.
- **Issue 9 (Regression)**: Split regression test logs into dedicated clean files (`EVD-REG-01-server.txt`/`.log` with 282/282 PASS, `EVD-REG-01-client.txt`/`.log` with 129/129 PASS, and `EVD-REG-01-e2e.txt`/`.log` with 56/56 PASS), and updated `EVD-REG-01.txt` with integrated summary.
- **Issue 9 (Regression)**: Added and hardened automated product hardening test suite `e2e/lab-04/final-product-hardening.spec.ts` (`TEST-HARDEN-01..04`):
  - `TEST-HARDEN-01`: Zero browser console errors and zero unhandled page errors across all views.
  - `TEST-HARDEN-02`: Discovered real `<a href>` links and verified browser rendering destinations without 404/Page Not Found, and verified actual SPA navigation controls and view transitions across all 8 representative views.
  - `TEST-HARDEN-03`: Zero unfinished UI placeholders (`TODO`, `TBD`, `Lorem ipsum`, `Coming Soon`, `Under Construction`, `Not Implemented`).
  - `TEST-HARDEN-04`: Actively executed and asserted DOM state changes on representative interactive controls (Dashboard metric card → Queue, Queue → Detail/Actions, Back to Queue → Queue, My Tickets → Detail, Back to My Tickets → List, Create Ticket → Form, User Management → Admin view, Logout → Login redirect), and verified accessible labels and zero placeholder strings across all rendered buttons.
  - Captured hardening evidence artifacts `artifacts/lab-04/screenshots/regression/EVD-REG-07.json` and `EVD-REG-07.png`.

---

## Reviews I Gave

| Field | Value |
|---|---|
| **Partner name** | Pilaiwan Churdchu |
| **Partner student ID** | 67070503492 |
| **Partner GitHub username** | [@Pilaiwan3492](https://github.com/Pilaiwan3492) |
| **Partner repository** | https://github.com/Pilaiwan3492/TokTickIT |

Lab 4 Pull Requests reviewed on partner's repository (`Pilaiwan3492/TokTickIT`).

| Pull Request I reviewed | Comment I gave | Their response |
|---|---|---|
| **[#82](https://github.com/Pilaiwan3492/TokTickIT/pull/82)** — PR 30: docs specification, api-spec, and ui-spec contracts for sprint 4 | Clarify IT Staff current-user actions on dashboard, define recently resolved tickets calculation/time window, and use relative GitHub links. Approved after updates. | Updated specification with current-user actions, defined recently resolved tickets, updated links; merged into `lab4-staging`. |
| **[#83](https://github.com/Pilaiwan3492/TokTickIT/pull/83)** — PR 31: Planned Test Strategy, Test Matrix & AC/BR Traceability | Expand E2E-10 regression to cover full Labs 1–3 (auth/RBAC, requester, IT staff), add mobile screenshot inventory for resolution gate/concurrency, and fix test path consistency. Approved after updates. | Expanded regression scenarios, added mobile screenshot items, aligned test file paths; merged into `lab4-staging`. |
| **[#84](https://github.com/Pilaiwan3492/TokTickIT/pull/84)** — PR 32: Database Schema, Migration, Actions Taken Model & Seed Data | "Approved! Everything looks good and matches the Lab 4 requirements. Nice work!" | Merged PR into `lab4-staging`. |
| **[#85](https://github.com/Pilaiwan3492/TokTickIT/pull/85)** — PR 33: Actions Taken Backend Foundation, REST APIs & Concurrency Handling | "Approved! Everything looks good and matches the Lab 4 requirements. Nice work!" | Merged PR into `lab4-staging`. |
| **[#86](https://github.com/Pilaiwan3492/TokTickIT/pull/86)** — PR 34: Ticket Full Lifecycle Workflow, Status Transition Matrix & Backend Resolution Enforcement | Align Resolution Gate eligibility in BR-11 with BR-09, tighten ISO 8601 timezone offset validation, and add boundary tests for invalid offsets (e.g. `+12:60`). Approved after fixes. | Aligned BR-11 with REOPENED status, tightened offset regex, added timezone boundary tests; merged into `lab4-staging`. |
| **[#87](https://github.com/Pilaiwan3492/TokTickIT/pull/87)** — PR 35: Actions Taken Responsive UI, Create/Edit Modals & Role Visibility | Verify conflict-recovery flow in ActionTakenModal, ensure modal uses latest `updatedAt`, and confirm client tests/build pass. Approved after fixes. | Updated conflict-recovery flow with latest timestamp and added error handling tests; merged into `lab4-staging`. |
| **[#88](https://github.com/Pilaiwan3492/TokTickIT/pull/88)** — PR 36: Role Dashboards Backend APIs & Authoritative Metric Aggregations | Verify `priority=URGENT` drilldown matches metric, verify queue/requester filters reset on URL removal, and verify test/build. Approved after fixes. | Synchronized URGENT priority parameter, reset filters on query removal, added regression tests; merged into `lab4-staging`. |
| **[#89](https://github.com/Pilaiwan3492/TokTickIT/pull/89)** — PR 37: Implement responsive Requester and Staff Dashboards with Zen Green theme | Update `tests.md` statuses, verify drilldown destination filters, verify requester empty states, and test responsive/a11y/overflow. Approved after fixes. | Updated `tests.md` traceability, added drilldown filter assertions, verified empty states and responsive layouts; merged into `lab4-staging`. |
| **[#90](https://github.com/Pilaiwan3492/TokTickIT/pull/90)** — PR 38: Playwright E2E, Multi-Device Responsive & Visual/Accessibility Inspection | Approved after merge conflict resolution, test documentation update, form state preservation test, and double-click protection verification. | Resolved merge conflicts, updated documentation, verified form preservation and debounce protection; merged into `lab4-staging`. |
| **[#94](https://github.com/Apichaya251400/TokTickIT/pull/94)** — PR 39: Zen Green UI, Responsive Viewports & Accessibility Verification (Issue #81 / LAB4-10) | Comprehensive multi-device visual inspection, rendered `ui-spec.md` screenshot (`EVD-QA-05.png`), dynamic Staff Dashboard & Actions Taken responsive evidence (`EVD-QA-06`, `EVD-QA-07`), focus ring & keyboard navigation verification (`EVD-QA-08`), and complete checklist (`EVD-QA-04`). | Awaiting review from peer reviewer `@Pilaiwan3492`. |

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
