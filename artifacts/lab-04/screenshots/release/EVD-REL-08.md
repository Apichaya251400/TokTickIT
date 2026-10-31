# EVD-REL-08: Complete Traceability Index & Cross-Reference Matrix

**Sprint**: Lab 4 (Sprint 4)  
**Repository**: https://github.com/Apichaya251400/TokTickIT  
**Branch**: `feature/lab4-release`  
**Verification Stage**: Pre-merge Release Candidate (PR #96)  
**Generated**: 2026-11-01  
**Audit Status**: 100% Bidirectional Traceability Verified (0 undefined IDs, 0 unmapped requirements)

---

## 1. Functional Requirements Traceability Matrix (FR-01 .. FR-15)

| Requirement ID | Requirement Summary | Mapped Acceptance Criteria & Business Rules | Planned Test IDs |
|---|---|---|---|
| **FR-01** | Parent-child `ActionTaken` 1:N relationship under Ticket | AC-01, AC-05, BR-01 | `TEST-ACT-01`, `TEST-ACT-05`, `TEST-DB-01` |
| **FR-02** | Automatic performer attribution (`performedById = req.user.id`) | AC-01, AC-02, BR-03 | `TEST-ACT-01`, `TEST-ACT-02` |
| **FR-03** | Mandatory `followUpNote` when `followUpRequired = true` | AC-03, BR-05 | `TEST-ACT-03` |
| **FR-04** | IT Staff/Admin Action creation & management; Requester read-only; Terminal state block | AC-04, AC-18, AC-22, BR-04, BR-06, BR-09 | `TEST-ACT-04`, `TEST-TERM-02`, `TEST-TERM-03`, `TEST-ACT-07` |
| **FR-05** | IT Staff Dashboard backend metrics & drill-down | AC-06, AC-08, BR-13, BR-15 | `TEST-DASH-01`, `TEST-DASH-03`, `TEST-CARD-01..06` |
| **FR-06** | Requester Dashboard backend metrics & drill-down | AC-07, BR-13, BR-15 | `TEST-DASH-02`, `TEST-CARD-07..12` |
| **FR-07** | Authoritative backend queries & Asia/Bangkok (UTC+7) time boundaries | BR-11, BR-12 | `TEST-DASH-05`, `TEST-UNIT-02` |
| **FR-08** | Graceful zero-count metric rendering | AC-15, BR-14 | `TEST-DASH-04` (API), `TEST-CARD-00` (UI) |
| **FR-09** | Enforce 8 Ticket workflow statuses & state transitions | Section 8.1, AC-09, AC-12, BR-08, BR-09 | `TEST-FLOW-01..06`, `TEST-FLOW-CYCLE-01`, `TEST-TERM-01` |
| **FR-10** | Server-side Resolution Gate rule | AC-09, BR-08 | `TEST-GATE-01`, `TEST-FLOW-03..05` |
| **FR-11** | Safe error responses for invalid transitions & authorization | AC-02, AC-03, AC-04, AC-21, AC-23, BR-16 | `TEST-ACT-02`, `TEST-ACT-03`, `TEST-ACT-04`, `TEST-ACT-06`, `TEST-SEC-01` |
| **FR-12** | Concurrent & stale update detection (`409 Conflict`) | AC-11, AC-17, BR-10 | `TEST-CONCUR-01`, `TEST-CONCUR-02` |
| **FR-13** | Lab 1–3 data & feature preservation | AC-13 | `TEST-REGR-01`, `TEST-DB-02` |
| **FR-14** | Debouncing & backend `Idempotency-Key` duplicate protection | AC-16, AC-20 | `TEST-IDEM-01`, `TEST-IDEM-02`, `TEST-IDEM-03` |
| **FR-15** | Responsive & accessibility compliance | AC-14, AC-19 | `TEST-RESP-01`, `TEST-A11Y-01`, `TEST-STYLE-01` |

---

## 2. Business Rules Traceability Matrix (BR-01 .. BR-17)

| Rule ID | Rule Summary | Mapped Acceptance Criteria | Planned Test IDs | Target Test File |
|---|---|---|---|---|
| **BR-01** | ActionTaken belongs to exactly 1 Ticket | AC-01 | `TEST-DB-01` | `server/tests/lab-04/db-schema.test.ts` |
| **BR-02** | Ticket Owner vs Action Performer separation | AC-05 | `TEST-ACT-14` | `server/tests/lab-04/actions.api.test.ts` |
| **BR-03** | Performer ID derived strictly from actor session token | AC-02 | `TEST-ACT-02` | `server/tests/lab-04/actions.api.test.ts` |
| **BR-04** | Action assignee must be active IT Staff or Administrator | AC-21 | `TEST-ACT-06` | `server/tests/lab-04/actions.api.test.ts` |
| **BR-05** | `followUpNote` mandatory when `followUpRequired = true` | AC-03 | `TEST-ACT-03` | `server/tests/lab-04/actions.api.test.ts` |
| **BR-06** | Requester read-only access for Actions Taken | AC-04 | `TEST-ACT-04` | `server/tests/lab-04/actions.api.test.ts` |
| **BR-07** | Requester "Problem Appears Resolved" indication is advisory | AC-10 | `TEST-GATE-02` | `server/tests/lab-04/ticket-workflow.api.test.ts` |
| **BR-08** | Resolution Gate evaluation (>= 1 COMPLETED or note) | AC-09 | `TEST-GATE-01` | `server/tests/lab-04/ticket-workflow.api.test.ts` |
| **BR-09** | Terminal `CANCELLED` status locks transitions & actions | AC-12, AC-18 | `TEST-TERM-01..03` | `server/tests/lab-04/ticket-workflow.api.test.ts` & `actions.api.test.ts` |
| **BR-10** | Optimistic concurrency via mandatory `expectedUpdatedAt` | AC-11, AC-17 | `TEST-CONCUR-01..02` | `server/tests/lab-04/concurrency.api.test.ts` |
| **BR-11** | Dashboard metrics calculated server-side | AC-06, AC-07 | `TEST-DASH-05` | `server/tests/lab-04/staff-dashboard.api.test.ts` |
| **BR-12** | Asia/Bangkok (UTC+7) time boundary calculations | AC-06, AC-07 | `TEST-UNIT-02` | `server/tests/unit/timezone.test.ts` |
| **BR-13** | Ownership-scoped dashboard metric filtering | AC-06, AC-07 | `TEST-DASH-06` | `server/tests/lab-04/staff-dashboard.api.test.ts` |
| **BR-14** | Explicit empty state `0` behavior for metric cards | AC-15 | `TEST-CARD-00` | `client/tests/lab-04/StaffDashboard.test.tsx` |
| **BR-15** | Metric card click drill-down navigation | AC-08 | `TEST-DASH-03` | `e2e/lab-04/staff-dashboard.spec.ts` |
| **BR-16** | ActionTaken authorization bound to parent Ticket | AC-23 | `TEST-SEC-01` | `server/tests/lab-04/actions.api.test.ts` |
| **BR-17** | Whitespace-only string rejection on textual inputs | AC-03, AC-09 | `TEST-UNIT-03` | `server/tests/unit/validation.test.ts` |

---

## 3. Acceptance Criteria Traceability Matrix (AC-01 .. AC-23)

| Requirement / AC ID | Category / Description | Planned Test ID | Test Type | Target File / Execution Path | Expected Result | Status |
|---|---|---|---|---|---|---|
| **AC-01 / FR-01, FR-02** | Create Action Taken with valid data & auto performer attribution | `TEST-ACT-01` | Integration / API | `server/tests/lab-04/actions.api.test.ts` | `201 Created`, action linked to ticket, `performedById = req.user.id` | `Pass` |
| **AC-02 / BR-03** | Reject client-supplied performer ID in request payload | `TEST-ACT-02` | Integration / API | `server/tests/lab-04/actions.api.test.ts` | `400 Bad Request` (`INVALID_PERFORMER_ATTRIBUTE`) | `Pass` |
| **AC-03 / FR-03, BR-05** | Reject `followUpRequired = true` when `followUpNote` is empty/whitespace | `TEST-ACT-03` | Integration / API | `server/tests/lab-04/actions.api.test.ts` | `400 Bad Request` (`MISSING_FOLLOW_UP_NOTE`) | `Pass` |
| **AC-04 / BR-06** | Reject Requester attempting `POST` / `PUT` on ActionTaken | `TEST-ACT-04` | Integration / API | `server/tests/lab-04/actions.api.test.ts` | `403 Forbidden` (`FORBIDDEN`) | `Pass` |
| **AC-05 / FR-01** | Multi-staff actions ordered chronologically (`createdAt ASC`, `id ASC`) | `TEST-ACT-05` | Integration / API | `server/tests/lab-04/actions.api.test.ts` | `200 OK`, returned list strictly sorted by `createdAt ASC`, tie-break `id ASC` | `Pass` |
| **AC-06 / FR-05** | IT Staff Dashboard calculates accurate metrics, urgent & recent items | `TEST-DASH-01` | Integration / API | `server/tests/lab-04/staff-dashboard.api.test.ts` | `200 OK`, exact aggregate counts for `unassignedCount`, `myAssignedCount`, `todayActionsCount`, `urgentWorkloadCount` | `Pass` |
| **AC-06 / FR-05** | Administrator can access dashboard and IT queue endpoints | `TEST-DASH-ADMIN-01` | Integration / API | `server/tests/lab-04/staff-dashboard.api.test.ts` | `200 OK`, Administrator receives dashboard metrics and queue tickets without 403 Forbidden | `Pass` |
| **AC-06 / FR-05** | Administrator dashboard Today's Actions drill-down query | `TEST-DASH-ADMIN-02` | Integration / API | `server/tests/lab-04/staff-dashboard.api.test.ts` | `200 OK`, Administrator queries `/api/tickets?view=today_actions` returning performed actions | `Pass` |
| **AC-07 / FR-06** | Requester Dashboard calculates accurate owned metrics & attention items | `TEST-DASH-02` | Integration / API & UI | `server/tests/lab-04/requester-dashboard.api.test.ts` & `client/tests/lab-04/RequesterDashboard.test.tsx` (E2E: `requester-dashboard.spec.ts`) | `200 OK`, exact aggregate counts for `openTicketsCount`, `waitingForRequesterCount`, `inProgressCount`, `recentlyResolvedCount` | `Pass` |
| **AC-08 / BR-15** | IT Staff Dashboard metric card click navigates to filtered staff queue | `TEST-DASH-03` | Playwright E2E | `e2e/lab-04/staff-dashboard.spec.ts` | Clicking metric card navigates to target staff queue URL (e.g. `/staff/queue?view=unassigned_active`) | `Pass` |
| **AC-08 / BR-15** | Unassigned Active drill-down excludes CLOSED / RESOLVED tickets | `TEST-DASH-DRILL-01` | Integration / API | `server/tests/lab-04/staff-dashboard.api.test.ts` | `200 OK`, `view=unassigned_active` returns only active open unassigned tickets | `Pass` |
| **AC-08 / BR-15** | My Queue Active drill-down excludes RESOLVED / CLOSED tickets | `TEST-DASH-DRILL-02` | Integration / API | `server/tests/lab-04/staff-dashboard.api.test.ts` | `200 OK`, `view=my_queue_active` returns only active tickets assigned to current user | `Pass` |
| **AC-08 / BR-15** | Urgent Workload drill-down excludes non-actionable statuses | `TEST-DASH-DRILL-03` | Integration / API | `server/tests/lab-04/staff-dashboard.api.test.ts` | `200 OK`, `view=urgent_workload` returns only urgent tickets in `NEW`, `OPEN`, `IN_PROGRESS` | `Pass` |
| **AC-08 / BR-15** | Administrator Dashboard load & drill-down to queue without 403 | `E2E-STAFFDASH-07` | Playwright E2E | `e2e/lab-04/staff-dashboard.spec.ts` | Administrator accesses dashboard, drills down to `/staff/queue` without 403; Requester denied access | `Pass` |
| **AC-09 / FR-10, BR-08** | Resolution Gate blocks resolving `IN_PROGRESS` ticket with 0 completed actions & empty note | `TEST-GATE-01` | Integration / API | `server/tests/lab-04/ticket-workflow.api.test.ts` | `400 Bad Request` (`BAD_REQUEST`) | `Pass` |
| **AC-10 / BR-07** | Requester "Problem Appears Resolved" indication records timestamp, status unchanged | `TEST-GATE-02` | Integration / API | `server/tests/lab-04/ticket-workflow.api.test.ts` | `200 OK`, `requesterResolvedIndicatedAt` set, `currentStatus` remains `IN_PROGRESS` | `Pass` |
| **AC-11 / BR-10** | Concurrent ticket resolution race condition using same `expectedUpdatedAt` | `TEST-CONCUR-01` | Integration / API | `server/tests/lab-04/concurrency.api.test.ts` | Concurrent `Promise.all`: exactly 1 request gets `200 OK`, competing request gets `409 Conflict` (`STALE_UPDATE`) | `Pass` |
| **AC-12 / BR-09** | Reject status transition on `CANCELLED` ticket | `TEST-TERM-01` | Integration / API | `server/tests/lab-04/ticket-workflow.api.test.ts` | `400 Bad Request` (`TICKET_TERMINAL`) | `Pass` |
| **AC-12 / BR-09** | Reject Action creation on `CANCELLED` ticket | `TEST-TERM-02` | Integration / API | `server/tests/lab-04/actions.api.test.ts` & `ticket-workflow.api.test.ts` | `400 Bad Request` (`TICKET_TERMINAL`) | `Pass` |
| **AC-12 / BR-09** | Reject Action edit or status transition on `CANCELLED` ticket | `TEST-TERM-03` | Integration / API | `server/tests/lab-04/actions.api.test.ts` | `400 Bad Request` (`TICKET_TERMINAL`) | `Pass` |
| **AC-13 / FR-13** | Full Lab 1–3 regression test suite verification | `TEST-REGR-01` | E2E & API | `npm --prefix server test` & `npx playwright test` | 100% of Lab 1–3 server and E2E regression tests pass cleanly | `Pass` |
| **AC-14 / FR-15** | Visual Responsive Layout Adaptation across Desktop, Tablet, and Mobile viewports | `TEST-RESP-01` | Playwright E2E | `e2e/lab-04/responsive-a11y.spec.ts` | Viewports `1920×1080`, `768×1024`, `375×812` render grid, table, and cards without clipping/overflow | `Pass` |
| **AC-15 / FR-08, BR-14** | Zero-count metric API payload response validation | `TEST-DASH-04` | Integration / API | `server/tests/lab-04/staff-dashboard.api.test.ts` | Endpoint returns `0` counts for empty datasets in JSON payload | `Pass` |
| **AC-15 / FR-08, BR-14** | Zero-count metric UI card rendering & empty state text | `TEST-CARD-00` | UI Component | `client/tests/lab-04/StaffDashboard.test.tsx` | Metric cards render `0` and empty lists render clean message (e.g. `"No recent tickets"`) | `Pass` |
| **AC-16 / FR-14** | Duplicate ActionTaken creation with identical `Idempotency-Key` returns cached response | `TEST-IDEM-01` | Integration / API | `server/tests/lab-04/actions.api.test.ts` | `201 Created`, cached response returned, exactly 1 ActionTaken record created in database | `Pass` |
| **AC-17 / BR-10, FR-12** | Stale ActionTaken or Ticket update using outdated `expectedUpdatedAt` | `TEST-CONCUR-02` | Integration / API | `server/tests/lab-04/concurrency.api.test.ts` | `409 Conflict` (`STALE_UPDATE`), database state unmodified by stale request | `Pass` |
| **AC-18 / BR-09, FR-04** | ActionTaken creation attempt on `CANCELLED` ticket | `TEST-TERM-02` | Integration / API | `server/tests/lab-04/actions.api.test.ts` & `ticket-workflow.api.test.ts` | `400 Bad Request` (`TICKET_TERMINAL`), zero actions added | `Pass` |
| **AC-19 / FR-15** | Interactive Accessibility: keyboard navigation, focus ring, ARIA, touch targets | `TEST-A11Y-01` | Playwright E2E | `e2e/lab-04/responsive-a11y.spec.ts` | Visible focus rings (`2px solid #198754`), valid ARIA roles, touch targets >= 44×44px, no body horizontal overflow | `Pass` |
| **AC-20 / FR-14** | Reuse existing `Idempotency-Key` with different request payload | `TEST-IDEM-02` | Integration / API | `server/tests/lab-04/actions.api.test.ts` | `409 Conflict` (`IDEMPOTENCY_KEY_REUSED`), zero new records created | `Pass` |
| **AC-21 / BR-04** | Assign action to inactive user, non-staff user, or invalid UUID | `TEST-ACT-06` | Integration / API | `server/tests/lab-04/actions.api.test.ts` | `400 Bad Request` (`INVALID_ASSIGNEE`) | `Pass` |
| **AC-22 / Section 8.2** | Valid action status transitions pass; invalid transitions from terminal states fail | `TEST-ACT-07` | Integration / API | `server/tests/lab-04/actions.api.test.ts` | Permitted status transitions return `200 OK`; terminal `COMPLETED`/`CANCELLED` status changes return `400 Bad Request` | `Pass` |
| **AC-23 / BR-16** | Cross-ticket ActionTaken access authorization check (unauthorized ticket) | `TEST-SEC-01` | Integration / API | `server/tests/lab-04/actions.api.test.ts` | `403 Forbidden` (`FORBIDDEN`), ActionTaken access bound strictly to parent Ticket authorization | `Pass` |

---

## 4. Test Suite Execution & Requirement Coverage Summary

- **Functional Requirements Coverage**: 15 / 15 (100% Verified)
- **Business Rules Coverage**: 17 / 17 (100% Verified)
- **Acceptance Criteria Coverage**: 23 / 23 (100% Verified)
- **Server Test Suite**: 29 test files, 284 passed (100% PASS)
- **Client Test Suite**: 17 test files, 129 passed (100% PASS)
- **Playwright E2E Hardening Suite**: 13 specs, 72 passed (100% PASS)
- **Integrated Full-Stack Total**: 59 test files, 485 passed (100% GREEN)
