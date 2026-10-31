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
| **[#93](https://github.com/Apichaya251400/TokTickIT/pull/93)** — PR 38: feat(regression): complete Lab 1-3 regression, responsive-a11y, and product hardening (LAB4-09) | Approved | Verified 56/56 E2E, 282 server, 129 client tests (467 total). Reviewer requested CI Playwright job, 4-card responsive verification, visible badge text audit, simulated network drop retry, tests.md status updates to Pass, 44x44px touch targets, separate EVD-REG-01 component logs, ActionTaken record count assertion for idempotency, final product hardening audit (console errors, broken links, placeholder text, functional controls), full idempotency response contract object comparison (`toMatchObject` / `toEqual`), and real SPA navigation destination verification beyond HTTP < 400. Approved by [@Pilaiwan3492](https://github.com/Pilaiwan3492). | Implemented Playwright CI job, responsive 4-card checks, non-color badge loop, network drop test, updated tests.md to Pass, enforced >= 44x44px touch targets, added ActionTaken DB assertions, generated clean split logs (`EVD-REG-01-server`, `client`, `e2e`), implemented automated product hardening suite (`final-product-hardening.spec.ts` / `EVD-REG-07`), compared full idempotency response body contract, and tested real links and SPA view destinations across all 8 views without 404; merged into `lab4-staging`. |
| **[#94](https://github.com/Apichaya251400/TokTickIT/pull/94)** — PR 39: feat(visual-qa): Zen Green UI, responsive viewports, and accessibility verification (LAB4-10) | Approved | Addressed all 7 review feedback points: generated rendered UI-spec screenshot (`EVD-QA-05.png`), dynamic layout assertions per breakpoint and pairwise no-overlap for metric cards (`EVD-QA-06`), complete form fields collision check and mobile touch targets >= 44×44px on all interactive controls (`EVD-QA-07`), exact 2px solid #198754 focus assertions (`EVD-QA-08`), automated semantic labels and adjacent validation placement checks across representative forms (`EVD-QA-04`), removed global masking rules and resolved root-cause mobile overflow via flex-wrap, and captured preserved Lab 1–3 screens. All 64 E2E tests, 282 server tests, 129 client tests pass, and CI is 100% green. | Merged into `lab4-staging` after peer review approval by [@Pilaiwan3492](https://github.com/Pilaiwan3492). |
| **[#95](https://github.com/Apichaya251400/TokTickIT/pull/95)** — PR 40: feat(e2e): end-to-end business flows and final hardening (LAB4-11) | Approved (Changes requested & resolved) | Received 5 peer review points from [@Pilaiwan3492](https://github.com/Pilaiwan3492): (1) `E2E-ACT-07` did not verify `dbAction.assigneeId === staffUser.id`, `performedById === staffUser.id`, and UI assigned staff name; (2) `EVD-E2E-01` process requirement: must follow two-phase lifecycle (final integrated log captured post-merge on `lab4-staging`); (3) `EVD-E2E-04` metadata fix: `testedRoles` stated 3 roles but only audited `IT_STAFF` across viewports; (4) Test data isolation: tests that mutate DB state (`E2E-ACT-07`, `TEST-CONC-01`, `TEST-IDEM`, `E2E-FLOW-08`) must restore state and clean up created records in `finally` blocks, and `E2E-FLOW-07` must be self-contained; (5) Recommendation: clean up React `act(...)` warning in client test and handle Vitest worker memory limit. | Implemented all fixes: added authoritative DB assertions for `assigneeId` and `performedById` and UI name assertion in `E2E-ACT-07`; documented two-phase verification lifecycle in `docs/lab-04/EVD-E2E-06.md`; updated `testedRoles: ["IT_STAFF"]` in `dashboards.spec.ts`; wrapped all mutating tests in `try ... finally` restoring ticket state and cleaning up records; eliminated React `act(...)` warning in `CreateTicket.test.tsx` (0 warnings); added `maxThreads: 2` in `vite.config.ts`. All 72 E2E, 282 server, and 129 client tests pass (483 total), and CI is 100% green. |

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
- **Issue 10 / PR #94 (Visual & Accessibility QA)**:
  - Generated full-page rendered screenshot artifact `artifacts/lab-04/screenshots/visual-qa/EVD-QA-05.png` directly from `docs/lab-04/ui-spec.md`.
  - Added explicit layout assertions (`expectedLayout[vp.name]`) and pairwise card non-overlap checks (`boxesOverlap`) across Desktop (4-column), Tablet (2x2 grid), and Mobile (single-column vertical stack) in `TEST-QA-04`.
  - Added complete top-to-bottom vertical collision checks across all Actions Taken form fields and asserted mobile touch targets >= 44×44px on all interactive controls (Submit, Cancel, Close, Select, Switch, Description, Result, Attachment Notes) in `TEST-QA-05`.
  - Enforced `.form-control { min-height: 44px !important; }` in `client/index.html` on mobile viewports (`<= 768px`).
  - Aligned focus ring in `ActionsTakenWorkspace.tsx` to `outline-offset: 2px !important;` matching `ui-spec.md` and `EVD-QA-08`.
  - Completely removed programmatic `.focus()` calls from `TEST-QA-06`, implementing 100% realistic keyboard-only navigation starting from initial `document.body` focus on page load and reload through Login inputs, Sign In button, and navigation tabs.
  - Automated semantic labels (`<label for="...">`) across representative forms (Login, Create Ticket, Actions Taken) and tightened adjacent validation alert/feedback placement in `TEST-QA-07` using relative DOM bounding coordinates.
  - Removed global `overflow-x: hidden` masking and fixed root-cause layout overflow on 375px mobile viewports via responsive flex-wrap across navigation bars, ticket detail headers, work logs, and comments.
  - Aligned `EVD-QA-06` title in `tests.md` to `Dedicated Staff Dashboard dynamic multi-device audit`.
  - Refined checklist wording in `docs/lab-04/ui-spec.md`, `docs/lab-04/visual-qa.md`, and `EVD-QA-04.json` to accurately specify representative/required controls and forms, clarifying No Clipping and No Overlap scope as visual inspection backed by targeted automated bounding-box checks.
  - Added Tablet viewport (`768×1024`) to `TEST-QA-05` so `EVD-QA-07` dynamically verifies Desktop, Tablet, and Mobile viewports without ambiguity.
  - Updated `README.md` test summary table and evidence descriptions to reflect the current Lab 4 full E2E test suite (64 / 64) and integrated test total (475 / 475), clarifying `EVD-REG-01` as the regression suite baseline.
- **Issue 11 / PR #95 (E2E Business Flows + Final Hardening)**:
  - **Authoritative Assignee & Performer Verification (`E2E-ACT-07`)**: Added database assertion verifying `dbAction.assigneeId === staffUser.id` and `dbAction.performedById === staffUser.id`, and added UI assertion verifying assigned staff name (`John Staff`) in the action card. Wrapped creation in `try ... finally` to delete created test actions and prevent DB pollution.
  - **Metadata Alignment (`EVD-E2E-04`)**: Corrected `testedRoles` in `e2e/lab-04/dashboards.spec.ts` from `["IT_STAFF", "REQUESTER", "ADMINISTRATOR"]` to `["IT_STAFF"]`, updated title to `"Operational Staff Dashboard Multi-Viewport Responsive Audit Evidence"`, and added `roleCoverageNote` clarifying that `E2E-DASH-01..03` cover role-specific operational calculations and ownership isolation.
  - **Two-Phase Verification Lifecycle (`EVD-E2E-01`)**: Updated `docs/lab-04/EVD-E2E-06.md` Section 4 defining the formal two-stage lifecycle: Phase 1 (pre-merge verification on PR #95 with all 72 tests passing and green CI), followed by Phase 2 (post-merge staging baseline capture on `lab4-staging` once PR #95 is merged).
  - **Deterministic Test Data Isolation & Idempotent Cleanup**:
    - `TEST-CONC-01` in `e2e/lab-04/regression-hardening.spec.ts`: Wrapped in `try ... finally` to restore `TKT-2026-000005`'s original summary (`"Grade submission app throws 500 error on final CSV export"`) and status (`"WAITING_FOR_REQUESTER"`).
    - `TEST-IDEM` in `e2e/lab-04/regression-hardening.spec.ts`: Wrapped in `try ... finally` to delete created `ActionTaken` and `IdempotencyRecord` entries.
    - `E2E-FLOW-08` in `e2e/lab-04/ticket-resolution.spec.ts`: Wrapped in `try ... finally` to restore `TKT-2026-000003` to `IN_PROGRESS` and clean up dynamically created actions.
    - `E2E-FLOW-07` in `e2e/lab-04/ticket-resolution.spec.ts`: Made completely self-contained with precondition verification to eliminate test order dependencies.
  - **Clean Client Test Suite & Zero Act Warnings**:
    - Added `await waitFor(...)` for success toast in `client/tests/lab-02/CreateTicket.test.tsx`, eliminating React `act(...)` warning (129/129 tests passing with 0 warnings).
    - Configured `poolOptions.threads.maxThreads: 2` in `client/vite.config.ts` to prevent jsdom thread memory overhead on Windows.


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
| **[#91](https://github.com/Pilaiwan3492/TokTickIT/pull/91)** — PR 39: Final Product Hardening, Full Regression, AI Reflection & Submission Package | Reviewed partner's PR 39 deliverables on `Pilaiwan3492/TokTickIT`. Verified multi-device regression suite (`E2E-10`), client tests for ticket lifecycle & resolution gate (`UI-09`..`UI-15`), dual traceability matrices, and submission package structure. | Partner marked PR as in-progress; awaiting final update for formal approval. |

---

## Repository Structure & Documentation Audit

### 1. README Check
- **Existence**: `README.md` exists in repository root.
- **Setup & Execution Instructions**: Validated server and client setup, database migration (`prisma:migrate`), idempotent seed (`prisma:seed`), and dev server commands.
- **Test Commands**: Verified commands for server tests (282), client tests (129), and Playwright E2E tests (72) (Integrated total: 483 tests).

### 2. Directory Structure Verification
- `client/`: Frontend React 18 + Vite source code, components, and Vitest unit tests.
- `server/`: Express API routes, middleware, Prisma schema, migrations, seed script, and Vitest API tests.
- `e2e/`: Playwright E2E test suites for Lab 2, Lab 3, and Lab 4.
- `docs/lab-04/`: Lab 4 documentation (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`, `reviewer.md`, `ai-use.md`, `regression-evidence.md`, `EVD-E2E-06.md`).
- `artifacts/lab-04/`: Evidence screenshots and JSON payloads for Actions Taken (`EVD-ACT-*`), Staff Dashboard (`EVD-STAFFDASH-*`), Requester Dashboard (`EVD-REQBDASH-*`), Ticket Workflow (`EVD-WORKFLOW-*`), Regression (`EVD-REG-*`), Visual QA (`EVD-QA-*`), and E2E Hardening (`EVD-E2E-*`).
