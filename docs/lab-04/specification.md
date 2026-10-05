# Sprint 4 Engineering Specification: TokTickIT Actions Taken, Role Dashboards, Final Workflow, and Product Hardening

- **System Name**: TokTickIT
- **Sprint / Lab**: Lab 4 (Sprint 4)
- **Document Status**: Approved Engineering Specification
- **Repository Branch**: `feature/lab4-spec-dd`

---

## 1. Sprint Goal

Deliver a final-quality operational increment for TokTickIT. This sprint introduces parent-child Actions Taken tracking under Tickets, implements concise role-appropriate Dashboards for IT Staff and Requesters, enforces the complete Ticket status lifecycle with backend Resolution Gate rules, preserves all completed Lab 1–3 data and functionality, and hardens the full-stack application across Desktop, Tablet, and Mobile viewports under the Zen Green design language.

---

## 2. Stakeholder Request Interpretation

The stakeholder requires TokTickIT to complete service desk operational tracking and business intelligence:
- **Actions Taken Work Log**: IT Staff and Administrators require a structured, auditable way to record work performed on tickets. Each Action Taken must record date/time (`createdAt` as the authoritative Action Date/Time), description, result, follow-up requirements, follow-up notes, and attachment notes. The performer identity MUST be derived automatically from the authenticated session. The Ticket Owner coordinates the ticket as a whole, but different IT Staff members may record different Actions Taken on the same ticket.
- **Role-Appropriate Dashboards**: Requesters and IT Staff require concise, operational dashboards that summarize key metrics, urgent items, and recent activity without replacing detailed list and ticket screens. All metrics MUST be calculated server-side from authoritative database queries with explicit date/time boundaries and fixed Asia/Bangkok (UTC+7) timezone handling.
- **Final Ticket Workflow & Resolution Gate**: The complete ticket status lifecycle (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`) must be enforced server-side. Requester "Problem Appears Resolved" indication remains advisory; formal status updates to `RESOLVED` require IT Staff review and satisfaction of backend Resolution Gate rules.
- **Data Preservation & Hardening**: All Lab 1–3 Users, Tickets, Attachments, Public Comments, and Internal Notes must remain intact. The application must be resilient against duplicate submissions, stale concurrent updates, network retries, and accessibility defects.

---

## 3. Scope

### 3.1 Included Scope
- `ActionTaken` data model (relation Ticket 1:N) supporting list, create, edit, assign to active staff, status transitions (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), follow-up dependency validation, and attachment notes.
- Automatic performer identity attribution (`Performed By`) derived strictly from session tokens.
- IT Staff Dashboard API and UI featuring operational metric cards, current-user actions, urgent/recent ticket lists, and drill-downs to queue/detail screens.
- Requester Dashboard API and UI featuring owned ticket metrics, attention-required tickets, recent updates, and drill-downs to My Tickets or Ticket Detail screens.
- Server-side enforcement of final Ticket status transitions, terminal states (`CANCELLED`), and backend Resolution Gate preconditions.
- Atomic concurrency handling (`409 Conflict`) for stale ticket status or action updates.
- Prisma schema migration, backfill strategy for legacy zero-action tickets, and idempotent seed script.
- Continuous regression verification ensuring 100% pass rate for Labs 1–3 functionality.
- Zen Green UI polish, responsive layout checks across 1920×1080 (Desktop), 768×1024 (Tablet), and 375×812 (Mobile), and accessibility compliance.

### 3.2 Explicitly Excluded Scope (ห้ามทำ)
- Automatic SLA clocks, escalation engines, on-call scheduling, or breach notifications.
- Email, SMS, LINE, push, or external notification services.
- Inventory consumption, spare-parts management, purchasing, or cost accounting.
- Time-sheet billing, payroll, or detailed labor-cost calculations.
- Multi-level approval workflows or electronic signatures.
- Advanced business intelligence tools, custom report builders, or export warehouses.
- Multi-tenant organizations or production-scale cloud deployments.
- Self-registration or external user account creation.

---

## 4. Functional Requirements (FR)

### Actions Taken Management
- **FR-01**: The system MUST support parent-child `ActionTaken` records linked to a `Ticket` (1:N relationship).
- **FR-02**: The system MUST automatically attribute `Performed By` (`performedById`) to the authenticated user identity (session/token) upon creation of an `ActionTaken` record. `performedById` MUST remain unchanged during subsequent edits.
- **FR-03**: The system MUST validate that `followUpNote` is populated whenever `followUpRequired = true`.
- **FR-04**: The system MUST allow IT Staff and Administrators to create (default status `PENDING`), edit, assign to active staff assignees, and update status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`) for Actions Taken on active tickets. Action Taken creation/editing on `CANCELLED` tickets is strictly prohibited. Requesters may only view Actions Taken on owned tickets.

### Role Dashboards
- **FR-05**: The system MUST provide an IT Staff Dashboard (`GET /api/dashboards/staff`) displaying backend-calculated metrics, current-user actions, and urgent/recent tickets with direct drill-down links.
- **FR-06**: The system MUST provide a Requester Dashboard (`GET /api/dashboards/requester`) displaying backend-calculated metrics for owned tickets, recent tickets, and attention-required items.
- **FR-07**: The system MUST calculate all dashboard metrics using authoritative database queries adhering to documented date/time boundaries (`ActionTaken.createdAt` for action metrics) and fixed Asia/Bangkok (UTC+7) timezone rules.
- **FR-08**: The system MUST handle zero-count metric states gracefully without broken UI elements, layout shifts, or division-by-zero errors.

### Final Ticket Workflow & Resolution Rules
- **FR-09**: The system MUST enforce server-side role authorization and valid state transitions across all 8 Ticket statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
- **FR-10**: The system MUST enforce a server-side Resolution Gate requiring at least one completed `ActionTaken` record (status `COMPLETED`) OR a non-empty staff `resolutionNote` before a ticket can transition to `RESOLVED`.
- **FR-11**: The system MUST reject unauthorized or invalid status transitions with safe error responses (`400 Bad Request` or `403 Forbidden`).
- **FR-12**: The system MUST detect concurrent or stale ticket status updates and return `409 Conflict` (`STALE_UPDATE`) to prevent data corruption.

### Regression & Product Hardening
- **FR-13**: The system MUST preserve all Lab 1–3 data models, users, tickets, attachments, public comments, and internal notes without data loss or schema corruption.
- **FR-14**: The system MUST prevent duplicate Action Taken creation caused by repeated button clicks or network retries through client debouncing and header-based backend idempotency (`Idempotency-Key`). Other state-changing operations MUST use appropriate idempotent or stale-state protection as defined by their API contracts.
- **FR-15**: The system MUST maintain full responsive and accessibility compliance across Desktop, Tablet, and Mobile viewports under the Zen Green visual theme.

---

## 5. Business Rules (BR)

### Actions Taken Rules
- **BR-01**: An `ActionTaken` record belongs to exactly one `Ticket`.
- **BR-02**: The Ticket Owner coordinates the ticket overall, but an Action Taken MAY be performed and recorded by a different IT Staff member or Administrator.
- **BR-03**: `Performed By` (`performedById`) is derived strictly from the authenticated actor identity. Client-supplied performer IDs in request payloads MUST be rejected with `400 Bad Request`.
- **BR-04**: Actions Taken may be assigned only to active IT Staff or Administrator accounts (`isActive = true AND role IN ('IT_STAFF', 'ADMINISTRATOR')`). `REQUESTER` accounts MUST NOT be valid assignees. Assigning an action to an inactive user, non-staff user, or invalid user ID MUST be rejected with `400 Bad Request`.
- **BR-05**: When `followUpRequired = true`, `followUpNote` MUST be non-empty (1 to 1000 characters). If `followUpRequired = false`, `followUpNote` is optional.
- **BR-06**: Requesters CANNOT create, edit, assign, complete, or cancel Actions Taken. Requesters may view Actions Taken on owned tickets in a read-only capacity.

### Workflow & Resolution Gate Rules
- **BR-07**: Requester indication that a problem appears resolved (`POST /api/tickets/:id/resolve-indicator`) is advisory and DOES NOT change ticket status to `RESOLVED`.
- **BR-08**: Transitioning a ticket to `RESOLVED` requires IT Staff or Administrator action and MUST satisfy the server-side Resolution Gate: at least one `ActionTaken` record with status `COMPLETED` OR a non-empty staff `resolutionNote`. The Resolution Gate transaction MUST use an isolation/locking strategy that prevents a concurrent ActionTaken state change from invalidating the Gate between evaluation and Ticket status commit (e.g. `SERIALIZABLE` isolation level or an equivalent row-locking strategy). The committed transaction MUST NOT allow a Ticket to reach `RESOLVED` unless the Resolution Gate is satisfied by the same committed state.
- **BR-09**: `CANCELLED` is a terminal state. No further status transitions or Action Taken additions, edits, or status transitions are permitted once a ticket is `CANCELLED`. Attempts MUST return `400 Bad Request` with error code `TICKET_TERMINAL`. Action Taken operations (`POST /api/tickets/:id/actions`, `PUT /api/actions/:id`, `PUT /api/actions/:id/status`) that depend on parent Ticket state MUST verify the parent Ticket's non-terminal state (`currentStatus != 'CANCELLED'`) atomically with the mutation or inside a database transaction. Parent Ticket terminal-state checks MUST use the same concurrency control protocol as Ticket status transitions. Concurrent Action mutation and transition to `CANCELLED` MUST be serialized (e.g. by locking the parent Ticket row or using `SERIALIZABLE` isolation), so no Action mutation can commit after the Ticket has committed to `CANCELLED`.
- **BR-10**: Concurrent modifications targeting the same ticket or action resource MUST be evaluated atomically using REQUIRED `expectedUpdatedAt` timestamps in update payloads (executed via atomic conditional update `WHERE id = :id AND updatedAt = :expectedUpdatedAt`). Missing `expectedUpdatedAt` in status/update payloads MUST return `400 Bad Request` (`MISSING_EXPECTED_UPDATED_AT`). Conflicting stale updates affecting 0 rows MUST return `409 Conflict` (`STALE_UPDATE`). Serialization or transaction conflicts caused by concurrent Ticket or Action Taken updates MUST be retried when safe; if the operation cannot be safely retried, the backend MUST return `409 Conflict` (`STALE_UPDATE`) rather than exposing an unhandled `500 Internal Server Error`.

### Dashboard Metric & Time Boundary Rules
- **BR-11**: Dashboard metrics MUST be calculated server-side from authoritative database queries. Browser-side dataset aggregation for dashboard totals is strictly prohibited.
- **BR-12**: Time-sensitive metrics strictly use Asia/Bangkok (UTC+7) local boundaries: `Today's Actions` filters `createdAt >= startOfDay AND createdAt < startOfNextDay`; `Recently Resolved` filters `currentStatus = 'RESOLVED' AND updatedAt >= startOfDay(today - 29 calendar days) AND updatedAt < startOfNextDay` (covering the current day and previous 29 calendar days). Timezone conversion occurs prior to boundary evaluation. Query parameter overrides for timezone are prohibited.
- **BR-13**: Ownership-scoped metrics filter strictly by the authenticated user's ID using role-appropriate relationships (`Ticket.ownerId = req.user.id` for staff workload metrics, and `Ticket.requesterId = req.user.id` for requester ticket metrics).
- **BR-14**: Every metric card MUST define an explicit empty state behavior (e.g. displaying `0` with accessible helper text).
- **BR-15**: Clicking an actionable metric card or list item MUST navigate to the corresponding filtered queue or ticket detail view with active query filters applied.

### Security & Scope Rules
- **BR-16**: IT Staff and Administrators MAY access or modify `ActionTaken` records (`GET`, `POST`, `PUT`, `PUT status`) only for Tickets they are authorized to access under the existing Lab 3 Ticket authorization rules. ActionTaken authorization MUST NOT bypass parent Ticket authorization.
- **BR-17**: All required textual fields (`description`, `result`, `followUpNote`, `resolutionNote`) MUST be validated after trimming leading and trailing whitespace. Whitespace-only strings are considered empty and MUST be rejected with `400 Bad Request`.

---

## 6. Operation-Level Authorization Matrix

| Operation / Feature | Requester | IT Staff | Administrator |
|---|---|---|---|
| Authenticate (Login / Logout / Current User) | Allow | Allow | Allow |
| Change Initial Password | Allow | Allow | Allow |
| View Owned Ticket Actions Taken | Allow (Ownership) | Allow | Allow |
| Create Action Taken on Ticket | Deny | Allow | Allow |
| Edit / Update Action Taken | Deny | Allow | Allow |
| Assign Action to Active Staff | Deny | Allow | Allow |
| Transition Action Status (Complete / Cancel) | Deny | Allow | Allow |
| View IT Staff Dashboard (`/staff/dashboard`) | Deny | Allow | Allow |
| View Requester Dashboard (`/requester/dashboard`) | Allow (Ownership) | Deny | Deny |
| Execute Ticket Status Transition | Deny | Allow | Allow (Per Handout §4.3) |
| Enforce Backend Resolution Gate | Deny | Enforced | Enforced |
| Admin User Management | Deny | Deny | Allow |

---

## 7. Dashboard Metrics & Calculations Matrix

| Metric / Section Name | Target Role | Definition | Backend Database Query / Logic | Time Boundary | Timezone | Empty State Behavior | Drill-Down Destination |
|---|---|---|---|---|---|---|---|
| **Unassigned Tickets** | IT Staff / Admin | Total open tickets with no owner | `Ticket.ownerId IS NULL AND currentStatus NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')` | N/A | UTC+7 | Display `0` | `/staff/queue?owner=unassigned` |
| **My Assigned Tickets** | IT Staff / Admin | Tickets assigned to logged-in user | `Ticket.ownerId = req.user.id AND currentStatus NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')` | N/A | UTC+7 | Display `0` | `/staff/queue?owner=my_queue` |
| **Today's Actions** | IT Staff / Admin | Actions recorded today by staff/admin | `ActionTaken.performedById = req.user.id AND createdAt >= startOfDay AND createdAt < startOfNextDay` | `startOfDay` to `startOfNextDay` | Asia/Bangkok | Display `0` | `/staff/queue?view=today_actions` |
| **Urgent Workload** | IT Staff / Admin | Urgent tickets needing staff action | `itPriority = 'URGENT' AND currentStatus IN ('NEW', 'OPEN', 'IN_PROGRESS')` | N/A | UTC+7 | Display `0` | `/staff/queue?itPriority=URGENT` |
| **My Recent Tickets** | IT Staff / Admin | Workload tickets assigned to user | `Ticket.ownerId = req.user.id ORDER BY updatedAt DESC, id ASC LIMIT 5` | N/A | UTC+7 | Display `[]` + UI "No recent tickets" | `/staff/tickets/:id` |
| **Current Staff Actions** | IT Staff / Admin | Recent actions performed by user | `ActionTaken.performedById = req.user.id ORDER BY createdAt DESC, id ASC LIMIT 5` | N/A | UTC+7 | Display `[]` + UI "No recent actions recorded" | `/staff/tickets/:ticketId` |
| **My Open Tickets** | Requester | Open tickets owned by requester | `Ticket.requesterId = req.user.id AND currentStatus NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')` | N/A | UTC+7 | Display `0` | `/tickets/my-tickets?status=open` |
| **Waiting for My Response** | Requester | Tickets waiting for requester | `Ticket.requesterId = req.user.id AND currentStatus = 'WAITING_FOR_REQUESTER'` | N/A | UTC+7 | Display `0` | `/tickets/my-tickets?status=WAITING_FOR_REQUESTER` |
| **In Progress** | Requester | Tickets currently being worked on | `Ticket.requesterId = req.user.id AND currentStatus = 'IN_PROGRESS'` | N/A | UTC+7 | Display `0` | `/tickets/my-tickets?status=IN_PROGRESS` |
| **Recently Resolved** | Requester | Resolved tickets in current day + past 29 calendar days | `Ticket.requesterId = req.user.id AND currentStatus = 'RESOLVED' AND updatedAt >= startOfDay(today - 29 days) AND updatedAt < startOfNextDay` | `today - 29 days` to `startOfNextDay` | Asia/Bangkok | Display `0` | `/tickets/my-tickets?status=RESOLVED` |
| **Recent Tickets** | Requester | Recent tickets owned by requester | `Ticket.requesterId = req.user.id ORDER BY updatedAt DESC, id ASC LIMIT 5` | N/A | UTC+7 | Display `[]` + UI "No recent tickets" | `/tickets/:id` |
| **Attention Required Tickets** | Requester | Tickets needing requester action | `Ticket.requesterId = req.user.id AND currentStatus = 'WAITING_FOR_REQUESTER' ORDER BY updatedAt DESC, id ASC LIMIT 5` | N/A | UTC+7 | Display `[]` + UI "No tickets require attention" | `/tickets/:id` |

---

## 8. Status Transition Matrices

### 8.1 Ticket Status Transition Matrix

| Current Status | Permitted Next Statuses | Permitted Action by IT Staff / Admin | Permitted Action by Requester | Resolution Gate Condition |
|---|---|---|---|---|
| `NEW` | `OPEN`, `CANCELLED` | Transition to `OPEN` or `CANCELLED` | None | N/A |
| `OPEN` | `IN_PROGRESS`, `CANCELLED` | Transition to `IN_PROGRESS` or `CANCELLED` | None | N/A |
| `IN_PROGRESS` | `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` | Transition to `WAITING_FOR_REQUESTER`, `RESOLVED`, or `CANCELLED` | Send "Problem Appears Resolved" (Advisory) | Transition to `RESOLVED` requires >= 1 COMPLETED ActionTaken OR non-empty staff resolutionNote |
| `WAITING_FOR_REQUESTER` | `IN_PROGRESS`, `RESOLVED`, `CANCELLED` | Transition to `IN_PROGRESS`, `RESOLVED`, or `CANCELLED` | Post Public Comment; Send "Problem Appears Resolved" | Transition to `RESOLVED` requires >= 1 COMPLETED ActionTaken OR non-empty staff resolutionNote |
| `RESOLVED` | `CLOSED`, `REOPENED` | Transition to `CLOSED` or `REOPENED` | None | N/A |
| `CLOSED` | `REOPENED` | Transition to `REOPENED` | None | N/A |
| `REOPENED` | `IN_PROGRESS`, `CANCELLED` | Transition to `IN_PROGRESS` or `CANCELLED` | None | N/A |
| `CANCELLED` | *(Terminal State)* | None | None | Locked |

### 8.2 Action Status Transition Matrix

| Current Status | Permitted Next Statuses | Description & Enforcement Rules |
|---|---|---|
| `PENDING` | `IN_PROGRESS`, `COMPLETED`, `CANCELLED` | Action is queued; staff may start work, complete, or cancel action |
| `IN_PROGRESS` | `COMPLETED`, `CANCELLED` | Action is underway; staff may complete or cancel action |
| `COMPLETED` | *(Terminal State)* None | Action is finalized; status cannot be transitioned further |
| `CANCELLED` | *(Terminal State)* None | Action is cancelled; status cannot be transitioned further |

- **Terminal Action Editing Rule**: `COMPLETED` and `CANCELLED` `ActionTaken` records cannot undergo status transitions, but may still have their editable content fields updated using optimistic concurrency (`expectedUpdatedAt`), unless the parent Ticket is `CANCELLED`.

---

## 9. Data Changes & Migration Decisions

### 9.1 Database Model Additions & Field Reuses
- **`ActionTaken` Model**: Contains `id` (UUID), `ticketId` (FK to `Ticket`), `performedById` (FK to `User`), `assigneeId` (nullable FK to `User`), `description` (Text), `result` (Text), `status` (Enum: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), `followUpRequired` (Boolean), `followUpNote` (Text, nullable), `attachmentNotes` (Text, nullable), `createdAt` (DateTime), `updatedAt` (DateTime).
- **Action Date/Time Clarification**: `createdAt` is the authoritative Action Date/Time for an `ActionTaken` record and records when the action record was created. `updatedAt` records the most recent modification time and MUST NOT be used as the Action Date/Time.
- **Index Additions**: Composite index on `ActionTaken(ticketId, createdAt)` and `ActionTaken(performedById, createdAt)` for fast dashboard and workspace queries.
- **Pre-existing Field Reuse Clarification**:
  - `resolutionNote`: Reuses the existing `Ticket.resolutionNote` string field from Lab 3; no new database schema migration is required.
  - `requesterResolvedIndicatedAt`: Reuses the existing `Ticket.requesterResolvedIndicatedAt` timestamp field from Lab 3; no new database schema migration is required.

### 9.2 Idempotency Storage & Model
- **`IdempotencyRecord` Model**: Stores client idempotency tokens for Action Taken creation (`POST /api/tickets/:id/actions`).
  - Fields: `id` (UUID), `userId` (FK to `User`), `ticketId` (FK to `Ticket`), `endpoint` (String), `idempotencyKey` (String), `requestHash` (String), `responseStatus` (Int), `responseBody` (JSON Text), `createdAt` (DateTime).
  - Unique Constraint: `(userId, ticketId, endpoint, idempotencyKey)`.
- **Enforcement Logic & Concurrent Race Handling**:
  - Same key scope + identical payload hash → returns cached `201 Created` response.
  - Same key scope + different payload hash → returns `409 Conflict` (`IDEMPOTENCY_KEY_REUSED`).
  - Concurrent requests using the same `(userId, ticketId, endpoint, idempotencyKey)` MUST be serialized by the database unique constraint. If a concurrent request encounters a unique constraint conflict upon inserting an idempotency record, it MUST re-read the committed `IdempotencyRecord` and return the cached successful response rather than throwing an unhandled `500 Internal Server Error`.
- **Transaction Atomicity & Cache Boundary**:
  - `ActionTaken` creation and the corresponding `IdempotencyRecord` persistence MUST be committed atomically in the same database transaction.
  - The cached response MUST be stored only as part of a successfully committed `ActionTaken` creation.
  - A failed `ActionTaken` transaction MUST NOT leave a reusable successful idempotency record.

### 9.3 Migration & Backfill Strategy
- All existing Lab 1–3 users, tickets, public comments, internal notes, and attachments are preserved without alteration.
- Legacy tickets created in Labs 1–3 migrate with zero `ActionTaken` records (`0 actions`).
- Idempotent seed script (`prisma/seed.ts`) produces realistic test scenarios: tickets with 0, 1, and multiple `ActionTaken` records, across assigned/unassigned states and all workflow statuses.

### 9.4 Recovery & Rollback Strategy
- The Prisma migration is purely additive and DOES NOT rewrite existing Ticket, User, Public Comment, Internal Note, or Attachment rows.
- Existing tickets remain fully valid with zero `ActionTaken` rows.
- A pre-migration database snapshot/backup MUST be taken prior to deployment.
- Recovery procedure: In the event of a migration execution failure, restore the pre-migration database backup.
- No destructive data rollback is required as the migration performs no destructive data transformations.

---

## 10. REST API Contract Summary

The system exposes RESTful JSON endpoints under `/api`:
- **Actions Taken**: `GET /api/tickets/:id/actions`, `POST /api/tickets/:id/actions`, `PUT /api/actions/:id`, `PUT /api/actions/:id/status`
- **Dashboards**: `GET /api/dashboards/staff`, `GET /api/dashboards/requester`
- **Workflow & Resolution**: `PUT /api/tickets/:id/status`, `POST /api/tickets/:id/claim`, `PUT /api/tickets/:id/assign`
- **Labs 1–3 Preserved APIs**: All `/api/auth/*`, `/api/tickets/*`, `/api/comments/*`, `/api/notes/*`, and `/api/admin/users/*` endpoints.

---

## 11. Acceptance Criteria (AC)

- **AC-01**: Given an IT Staff user, when creating an Action Taken with valid data, then it is saved linked to the ticket with `performedById` auto-set to the authenticated user.
- **AC-02**: Given any user, when attempting to create an Action Taken with a client-supplied performer ID, then the backend rejects the request with `400 Bad Request` (BR-03).
- **AC-03**: Given an IT Staff user, when `followUpRequired = true` and `followUpNote` is empty, then the system rejects submission with `400 Bad Request` (BR-05).
- **AC-04**: Given a Requester user, when attempting to create or edit an Action Taken, then the backend rejects the request with `403 Forbidden` (BR-06).
- **AC-05**: Given a Ticket, when multiple IT Staff members record actions, then all actions render in chronological order (`createdAt ASC`, tie-break `id ASC`) and preserve individual performer identities.
- **AC-06**: Given an IT Staff user, when opening `/staff/dashboard`, then backend-calculated metric cards, urgent tickets, and recent actions display accurately.
- **AC-07**: Given a Requester user, when opening `/requester/dashboard`, then only owned ticket metrics, recent tickets, and attention-required items are returned.
- **AC-08**: Given an IT Staff user, when clicking a dashboard metric card (e.g. Unassigned Tickets), then the browser navigates to the ticket queue with matching filters applied.
- **AC-09**: Given a ticket in `IN_PROGRESS` with 0 completed Actions Taken, when IT Staff attempts `PUT /api/tickets/:id/status` to `RESOLVED`, then the backend rejects it with `400 Bad Request` per Resolution Gate rules.
- **AC-10**: Given a Requester sending a "Problem Appears Resolved" indicator, when submitted, then `requesterResolvedIndicatedAt` is recorded while ticket status remains unchanged (BR-07).
- **AC-11**: Given a ticket whose Resolution Gate preconditions are satisfied, when two IT Staff members attempt to resolve the same ticket simultaneously using the same `expectedUpdatedAt`, exactly one request succeeds with `200 OK` and the competing stale request is rejected with `409 Conflict` (`STALE_UPDATE`).
- **AC-12**: Given a `CANCELLED` ticket, when an authorized IT Staff or Administrator attempts further status or Action modifications, the backend rejects the request with `400 Bad Request` (`TICKET_TERMINAL`).
- **AC-13**: Given the completed Lab 4 increment, when running the full Lab 1–3 regression test suite, then 100% of tests pass cleanly without regressions.
- **AC-14**: Given Desktop, Tablet, and Mobile viewports, when rendering dashboards and Actions Taken UI, then layouts adapt responsively without text clipping or horizontal overflow.
- **AC-15**: Given dashboard metrics with zero matching records, then zero-count metrics render as `0` and list components display documented empty state UI without layout shifts or errors (FR-08).
- **AC-16**: Given duplicate Action Taken creation requests with identical `Idempotency-Key`, then the backend creates only one record and returns identical successful responses (`201 Created`) without duplicating data (FR-14).
- **AC-17**: Given two users modifying the same `ActionTaken` or `Ticket` using a stale `expectedUpdatedAt` timestamp, then the backend rejects the stale request with `409 Conflict` (`STALE_UPDATE`) without overwriting newer data (BR-10, FR-12).
- **AC-18**: Given a ticket in `CANCELLED` status, when a user attempts to create an ActionTaken, then the backend rejects the request with `400 Bad Request` (`TICKET_TERMINAL`) and no action is created (BR-09, FR-04).
- **AC-19**: Given required Desktop, Tablet, and Mobile viewports, then Dashboard and Actions Taken UI satisfy visible focus rings, keyboard navigation, accessible labels, and no unintended page-level horizontal overflow (FR-15).
- **AC-20**: Given an existing `Idempotency-Key`, when the same authenticated user reuses it with a different request payload, then the backend rejects the request with `409 Conflict` (`IDEMPOTENCY_KEY_REUSED`) and creates no additional ActionTaken record.
- **AC-21**: Given an IT Staff user, when attempting to create or assign an Action Taken to an inactive user, non-staff user, or invalid user ID, then the backend rejects the submission with `400 Bad Request` (BR-04).
- **AC-22**: Given an Action Taken record, when status transitions follow permitted next states (`PENDING` → `IN_PROGRESS`, `COMPLETED`, `CANCELLED`; `IN_PROGRESS` → `COMPLETED`, `CANCELLED`), then the backend accepts the update with `200 OK`; when attempting invalid transitions from terminal states (`COMPLETED` or `CANCELLED`), then the backend rejects the request with `400 Bad Request`.
- **AC-23**: Given a user attempting to access or modify Actions Taken via `GET`, `POST`, or `PUT` endpoints for a ticket they are not authorized to access under Lab 3 authorization rules, then the backend rejects the request with `403 Forbidden` without bypassing parent ticket authorization (BR-16).

---

## 12. Definition of Done (DoD)

- [ ] All 23 Acceptance Criteria (AC-01 to AC-23) implemented and verified.
- [ ] Prisma database schema updated, migrated, and idempotent seed script verified.
- [ ] Server unit & API integration tests (`server/tests/lab-04/`) passing 100%.
- [ ] Client component tests (`client/tests/lab-04/`) passing 100%.
- [ ] Playwright E2E tests (`e2e/lab-04/`) passing 100% across Desktop, Tablet, and Mobile viewports.
- [ ] Full Lab 1–3 regression suite passing 100%.
- [ ] All 6 documentation files created/updated in `docs/lab-04/` (`specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`, `reviewer.md`, `ai-use.md`).
- [ ] Peer review completed and logged in `docs/lab-04/reviewer.md` with approvals.
- [ ] All 12 GitHub Issues in Done on GitHub Project Board.
- [ ] Feature branches merged into `lab4-staging`, and final release PR merged into `main`.

---

## 13. Technical Assumptions & Architectural Decisions

1. **Performer vs Owner Separation**: `performedById` on `ActionTaken` records who executed a specific task, while `ownerId` on `Ticket` records overall ticket coordination. They are distinct fields and relationships.
2. **Authoritative Backend Dashboards**: Dashboard endpoints execute focused Prisma aggregate/count queries rather than returning raw arrays, optimizing network payload and ensuring exact count accuracy.
3. **Timezone Handling**: Date boundaries use local Asia/Bangkok (UTC+7) time for `startOfDay` calculations while storing UTC timestamps in PostgreSQL.
