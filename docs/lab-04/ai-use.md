# Sprint 4 AI Usage Report & Reflection: TokTickIT

- **System Name**: TokTickIT
- **Sprint / Lab**: Lab 4 (Sprint 4)
- **Document Status**: Final AI Usage Report & Reflection
- **AI Tool / Platform**: Google Antigravity (Agentic AI Coding Assistant)
- **Primary LLM**: Gemini 2.0 Flash / Gemini 1.5 Pro (Google DeepMind)
- **Author**: Aphichaya Klinhual (67070503447)
- **Peer Reviewer**: Pilaiwan Churdchu (67070503492)
- **Repository**: https://github.com/Apichaya251400/TokTickIT

---

## 1. AI Usage Philosophy & Approach

Throughout Lab 4 development, AI was utilized as a pair-programming reasoning engine, architectural validator, specification co-designer, and verification assistant. Lab 4 introduced advanced software engineering concepts including optimistic concurrency control (`updatedAt` token matching), header-based backend idempotency (`Idempotency-Key`), transactional state transitions (Resolution Gate), operational aggregate dashboard queries, and multi-device accessibility.

All AI interactions were governed by strict engineering guardrails:
1. **No ungrounded code generation**: Every prompt required grounding in the Lab 4 specification, business rules, and architectural contracts before proposing code changes.
2. **Verification over assumption**: Every AI-proposed change had to be substantiated with executable unit, API integration, or Playwright E2E tests verified against real PostgreSQL/SQLite databases.
3. **Preservation of existing behavior**: Earlier Lab 1–3 functionality, security boundaries, and ownership rules could not be weakened or bypassed.
4. **Human-in-the-loop review**: All code and documentation modifications were audited by the repository author and submitted for formal peer review by the collaborator (`@Pilaiwan3492`).

---

## 2. Representative Key Prompts

### Prompt 1: Optimistic Concurrency & Conditional Update Design
> **"We are designing concurrent status transition handling for ticket resolution (`AC-11`, `AC-17`). Instead of relying on naive database updates, analyze how to implement atomic conditional updates (`WHERE id=:id AND updatedAt=:expectedUpdatedAt`) in Prisma / PostgreSQL to detect mid-flight collisions. Explain how the API should detect 0 affected rows and return `409 Conflict` with `STALE_UPDATE`, and specify the client banner interaction."**

- **Intent & Purpose**: Established atomic optimistic concurrency control patterns preventing conflicting mid-flight status updates.
- **Outcome**: Implemented conditional status mutation in `server/src/routes/ticket.routes.ts` returning `409 STALE_UPDATE`, and added 409 refresh recovery banners in `TicketWorkflow.tsx` and `ActionsTakenWorkspace.tsx`.

---

### Prompt 2: Header-Based Idempotency Caching & Atomic Persistence
> **"Trace the request lifecycle for `POST /api/tickets/:id/actions` with an `Idempotency-Key` header. Analyze how to structure the database unique constraint on `(userId, ticketId, endpoint, idempotencyKey)` inside an atomic transaction. If a network retry occurs with the same key, how should the cached 201 response be returned without re-executing action creation or corrupting database counters?"**

- **Intent & Purpose**: Designed and verified server-side idempotency deduplication and transaction isolation to prevent double submissions.
- **Outcome**: Added `IdempotencyRecord` table in Prisma schema with compound unique constraint, implemented deduplication middleware caching `201 Created` payloads, and rejected payload reuse with `409 IDEMPOTENCY_KEY_REUSED`.

---

### Prompt 3: Resolution Gate State Transition Matrix Verification
> **"Review the Resolution Gate requirements (`AC-09`, `AC-10`). The system must enforce that a ticket can only transition to `RESOLVED` if at least one completed Action Taken exists OR the staff provides a non-empty `resolutionNote`. Construct a state machine boundary test matrix verifying all 8 valid ticket statuses, terminal locks on `CANCELLED` tickets, and advisory requester signals."**

- **Intent & Purpose**: Built comprehensive boundary tests ensuring formal workflow transitions cannot bypass the Resolution Gate.
- **Outcome**: Implemented server-side gate evaluation in `server/src/routes/ticket.routes.ts` (`TEST-FLOW-03..05`, `TEST-GATE-01`), client validation modal in `TicketWorkflow.tsx`, and E2E verification across valid paths #1 and #2 (`E2E-FLOW-08`).

---

### Prompt 4: Timezone-Bounded Workload Aggregation Queries
> **"For the Staff Dashboard and Requester Dashboard aggregate queries (`AC-06`, `AC-07`), tickets resolved 'today' and 'within the last 30 days' must be calculated according to Asia/Bangkok (UTC+7) calendar day boundaries. Formulate the Prisma query filters and unit tests verifying that boundary timestamps at 23:59:59 and 00:00:00 UTC+7 are categorized accurately without relying on local server timezone defaults."**

- **Intent & Purpose**: Ensured authoritative server-side date range boundary calculations aligned with the application timezone specification.
- **Outcome**: Created `server/src/utils/timezone.ts` and unit tests in `timezone.test.ts` verifying exact UTC+7 calendar boundaries for `todayActionsCount` and `recentlyResolvedCount`.

---

### Prompt 5: Responsive Viewports, No Horizontal Overflow & Focus Rings
> **"Review the UI specifications for Desktop (`1920×1080`), Tablet (`768×1024`), and Mobile (`375×812`). Design a Playwright test suite (`TEST-RESP-01`, `TEST-A11Y-01`) that validates four-card grid stacking, touch targets >= 44×44px, table scroll wrappers (`overflow-x: auto`), visible focus rings (`2px solid #198754`), and proves that `document.documentElement.scrollWidth <= window.innerWidth` across all viewports."**

- **Intent & Purpose**: Designed automated E2E tests for multi-device responsive layout adaptation and WCAG accessibility standards.
- **Outcome**: Created `e2e/lab-04/responsive-a11y.spec.ts` and `visual-accessibility-qa.spec.ts`, automated non-color badge label assertions, enforced 44×44px touch targets on all interactive controls, and captured responsive evidence `EVD-QA-01..08`.

---

### Prompt 6: Recoverable Failure Resilience & Form Input Preservation
> **"When an IT Staff fills out an Action Taken with lengthy diagnostic details and encounters a recoverable validation error or network failure, the form must preserve all entered inputs without clearing the DOM. How should the React form state and RTL / Playwright tests verify that user input is never lost upon recoverable failures (`TEST-FAIL-01`)?"**

- **Intent & Purpose**: Hardened form components against data loss during recoverable errors and implemented regression tests verifying input preservation.
- **Outcome**: Added persistent controlled form state in `ActionsTakenWorkspace.tsx`, verified with component test `TEST-FAIL-01` in `ActionsTaken.test.tsx` and network drop simulation (`page.route` abort) in `regression-hardening.spec.ts`.

---

### Prompt 7: Cross-Role Regression Risk Analysis
> **"With the integration of the new Staff and Requester Dashboards as the default landing viewports, identify potential regressions in earlier Lab 3 E2E test suites (authentication, staff queue, user administration). Suggest the minimal and non-destructive adjustments to test helpers so all Playwright E2E tests pass cleanly without altering production business rules."**

- **Intent & Purpose**: Identified and resolved landing page locator mismatches in earlier E2E suites after integrating Lab 4 dashboard navigation.
- **Outcome**: Updated E2E navigation helpers to explicitly select the Target tab from dashboard landing pages, preserving 100% pass rates across Lab 2, Lab 3, and Lab 4 test suites.

---

### Prompt 8: Deterministic Test Data Isolation & Dynamic State Restoration
> **"Several E2E tests mutate existing database records (`E2E-ACT-07`, `TEST-CONC-01`, `TEST-IDEM`, `E2E-FLOW-08`, `E2E-FLOW-07`). Standard Prisma updates automatically update `@updatedAt`, causing timestamp drift across test runs. How can we implement dynamic snapshotting before mutation and restore exact original values including authoritative `updatedAt` timestamps in `finally` blocks using raw SQL?"**

- **Intent & Purpose**: Guaranteed 100% deterministic test data restoration and database idempotency across repeated test runs.
- **Outcome**: Implemented `prisma.$executeRaw` dynamic state restoration in `finally` blocks for `updatedAt` and ticket statuses, verifying exact millisecond timestamp equality in post-test assertions.

---

### Prompt 9: Automated Product Hardening QA Suite (`TEST-HARDEN-01..04`)
> **"Design an automated product hardening test suite that audits the live application for: (1) zero browser console errors and zero unhandled page exceptions, (2) zero broken internal links and real SPA navigation view transitions across all 8 views, (3) zero unfinished UI placeholders (`TODO`, `TBD`, `Lorem ipsum`, `Coming Soon`), and (4) functional button behaviors with accessible labels across all rendered interactive controls."**

- **Intent & Purpose**: Automated release-gate quality assurance replacing subjective manual spot checks with machine-verified assertions.
- **Outcome**: Created `e2e/lab-04/final-product-hardening.spec.ts` capturing `EVD-REG-07.png` and `.json`, verifying 0 console errors, 0 broken links, 0 placeholder strings, and valid interactive button labels across all views.

---

### Prompt 10: Final Cross-Document Consistency & Release Gate Verification
> **"Perform a cross-document consistency audit across `specification.md`, `tests.md`, `ui-spec.md`, and `api-spec.md`. Verify that all Functional Requirements (`FR-01..15`), Business Rules (`BR-01..17`), Acceptance Criteria (`AC-01..23`), API route signatures, and test file paths match physical files in the repository without discrepancies."**

- **Intent & Purpose**: Ensured absolute internal consistency across all four engineering specifications before tagging the final release.
- **Outcome**: Automated cross-audit script verified zero missing requirements, zero undefined rules, 100% physical test file existence (21/21 files), and unified terminology across documents.

---

## 3. Reflection

### 3.1 Reflection on Specification-Agent and Coding-Agent Use

Working on Lab 4 with an agentic AI coding workflow highlighted the distinct strengths of utilizing AI across separate engineering phases:

1. **Specification Agent (Design & Contract Phase)**:
   - The specification agent excelled at discovering subtle edge cases and boundary conditions before a single line of production code was written. For example, during Resolution Gate design, the agent helped formalize the edge condition where a ticket has multiple actions, but none are in `COMPLETED` status (e.g. only `PENDING` or `CANCELLED`). This forced us to clarify in `specification.md` and `api-spec.md` that only *completed* actions satisfy the prerequisite when no resolution note is provided.
   - Using the agent to construct state transition matrices and authorization matrices ensured that all 15 permitted transitions and 49 invalid transitions were exhaustively documented and traceable to concrete test IDs.

2. **Coding Agent (Implementation & Verification Phase)**:
   - The coding agent was most effective when constrained by strict specifications and failing tests (TDD). When implementing optimistic concurrency, the agent proposed an atomic update pattern (`UPDATE ... WHERE id = :id AND updatedAt = :expectedUpdatedAt`) rather than a vulnerable check-then-act pattern.
   - However, the coding agent required rigorous human verification regarding test assertions. In early iterations, the agent generated tests that asserted HTTP status codes (`200 OK`) without asserting resulting database state. As the human engineer, I enforced the guardrail that every state transition test must query the database directly to confirm resulting ticket and action states, and verify that `@updatedAt` timestamps were restored accurately.

### 3.2 Engineering Lessons Learned

The most valuable takeaway from Lab 4 was realizing how critical atomic transaction boundaries and idempotency tokens are when network failures and user retries occur in real-world systems. Concurrent requests sharing the same idempotency key could race between cache lookup and record insertion. Rather than relying on fragile application-level locks, enforcing a database unique constraint on `(userId, ticketId, endpoint, idempotencyKey)` inside an atomic transaction ensured that parallel requests cleanly serialize on the database constraint without creating duplicate records.

Additionally, introducing new dashboards revealed the importance of backward compatibility in automated test suites: when default landing tabs changed, earlier test suites needed explicit navigation steps. By systematically verifying all 483 automated tests (282 server, 129 client, 72 Playwright E2E) across every release stage, we achieved production readiness with full confidence.
