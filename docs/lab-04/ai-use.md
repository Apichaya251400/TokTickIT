# Sprint 4 AI Usage Report & Reflection: TokTickIT

- **System Name**: TokTickIT
- **Sprint / Lab**: Lab 4 (Sprint 4)
- **Document Status**: Final AI Usage Report & Reflection

---

## 1. AI Usage Philosophy & Approach

Throughout Lab 4 development, AI was utilized as a pair-programming reasoning engine, architectural validator, and verification assistant. Lab 4 introduced advanced engineering concepts including optimistic concurrency control (`updatedAt` token matching), header-based backend idempotency (`Idempotency-Key`), transactional state transitions (Resolution Gate), operational aggregate dashboard queries, and multi-device accessibility.

All AI interactions were governed by strict engineering guardrails:
1. No ungrounded code generation: every prompt required reference to the Lab 4 specification and business rules.
2. Verification over assumption: assertions and conclusions had to be substantiated with passing automated tests and database queries.
3. Preservation of existing behavior: earlier Lab 1–3 functionality, security boundaries, and ownership rules could not be weakened or bypassed.

---

## 2. Representative Prompts

### Prompt 1: Optimistic Concurrency & Conditional Update Design
> **"We are designing concurrent status transition handling for ticket resolution (`AC-11`, `AC-17`). Instead of relying on naive database updates, analyze how to implement atomic conditional updates (`WHERE id=:id AND updatedAt=:expectedUpdatedAt`) in Prisma / PostgreSQL to detect mid-flight collisions. Explain how the API should detect 0 affected rows and return `409 Conflict` with `STALE_UPDATE`, and specify the client banner interaction."**

- **Intent & Purpose**: Established atomic optimistic concurrency control patterns preventing conflicting mid-flight status updates.

---

### Prompt 2: Header-Based Idempotency Caching & Atomic Persistence
> **"Trace the request lifecycle for `POST /api/tickets/:id/actions` with an `Idempotency-Key` header. Analyze how to structure the database unique constraint on `(userId, ticketId, endpoint, idempotencyKey)` inside an atomic transaction. If a network retry occurs with the same key, how should the cached 201 response be returned without re-executing action creation or corrupting database counters?"**

- **Intent & Purpose**: Designed and verified server-side idempotency deduplication and transaction isolation to prevent double submissions.

---

### Prompt 3: Resolution Gate State Transition Matrix Verification
> **"Review the Resolution Gate requirements (`AC-09`, `AC-10`). The system must enforce that a ticket can only transition to `RESOLVED` if at least one completed Action Taken exists OR the staff provides a non-empty `resolutionNote`. Construct a state machine boundary test matrix verifying all 8 valid ticket statuses, terminal locks on `CANCELLED` tickets, and advisory requester signals."**

- **Intent & Purpose**: Built comprehensive boundary tests ensuring formal workflow transitions cannot bypass the Resolution Gate.

---

### Prompt 4: Timezone-Bounded Workload Aggregation Queries
> **"For the Staff Dashboard and Requester Dashboard aggregate queries (`AC-06`, `AC-07`), tickets resolved 'today' and 'within the last 30 days' must be calculated according to Asia/Bangkok (UTC+7) calendar day boundaries. Formulate the Prisma query filters and unit tests verifying that boundary timestamps at 23:59:59 and 00:00:00 UTC+7 are categorized accurately without relying on local server timezone defaults."**

- **Intent & Purpose**: Ensured authoritative server-side date range boundary calculations aligned with the application timezone specification.

---

### Prompt 5: Responsive Viewports, No Horizontal Overflow & Focus Rings
> **"Review the UI specifications for Desktop (`1920×1080`), Tablet (`768×1024`), and Mobile (`375×812`). Design a Playwright test suite (`TEST-RESP-01`, `TEST-A11Y-01`) that validates four-card grid stacking, touch targets >= 44×44px, table scroll wrappers (`overflow-x: auto`), visible focus rings (`2px solid #198754`), and proves that `document.documentElement.scrollWidth <= window.innerWidth` across all viewports."**

- **Intent & Purpose**: Designed automated E2E tests for multi-device responsive layout adaptation and WCAG accessibility standards.

---

### Prompt 6: Recoverable Failure Resilience & Form Input Preservation
> **"When an IT Staff fills out an Action Taken with lengthy diagnostic details and encounters a recoverable validation error or network failure, the form must preserve all entered inputs without clearing the DOM. How should the React form state and RTL / Playwright tests verify that user input is never lost upon recoverable failures (`TEST-FAIL-01`)?"**

- **Intent & Purpose**: Hardened form components against data loss during recoverable errors and implemented regression tests verifying input preservation.

---

### Prompt 7: Cross-Role Regression Risk Analysis
> **"With the integration of the new Staff and Requester Dashboards as the default landing viewports, identify potential regressions in earlier Lab 3 E2E test suites (authentication, staff queue, user administration). Suggest the minimal and non-destructive adjustments to test helpers so all 52 Playwright E2E tests pass cleanly without altering production business rules."**

- **Intent & Purpose**: Identified and resolved landing page locator mismatches in earlier E2E suites after integrating Lab 4 dashboard navigation.

---

### Prompt 8: Final Integration & Audit Verification
> **"Compile the final regression audit verifying that all 282 server tests, 129 client tests, and 52 Playwright E2E tests remain green. Verify database migration idempotency, dynamic sequence synchronization (`ticket_number_seq`), and production build viability."**

- **Intent & Purpose**: Established final release verification ensuring zero regressions across all 4 Labs.

---

## 3. Reflection

Working on Lab 4 deepened my understanding of building enterprise-grade, concurrency-safe web applications. The most valuable takeaway was realizing how critical atomic transaction boundaries and idempotency tokens are when network failures and user retries occur in real-world systems.

A key challenge occurred when verifying idempotency token deduplication: concurrent requests sharing the same key could race between cache lookup and record insertion. Rather than relying on application-level locks, we enforced a database unique constraint on `(userId, ticketId, endpoint, idempotencyKey)` inside an atomic transaction. This ensured that even concurrent parallel requests cleanly serialize on the database constraint without creating duplicate action records.

Additionally, introducing new dashboards revealed the importance of backward compatibility in automated test suites: when the default landing tab changed from Queue to Dashboard, earlier test suites needed explicit navigation steps to verify queue operations. By addressing these systematically, we maintained 100% test coverage (463/463 tests passing) while hardening the application for production.
