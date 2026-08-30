# TokTickIT Test Plan & Acceptance Traceability: Lab 2

## 1. Test Strategy & Coverage Across Six Testing Levels

This document outlines the comprehensive test plan for the TokTickIT Requester MVP in Lab 2.

Testing spans **all six required testing levels**:

1. **Unit Tests**: Utility function testing (`server/tests/unit/ticketNumber.test.ts`, `server/tests/unit/validation.test.ts`). Tests backend `TKT-YYYY-XXXXXX` Ticket Number format generation, string trimming logic, filename path traversal sanitization, and file size boundary helper calculations.
2. **API / Integration Tests**: Supertest integration suite (`server/tests/lab-02/*.api.test.ts`). Verifies Express endpoints, PostgreSQL persistence via Prisma, context header validation (`X-Requester-Id`), HTTP status mapping (200, 201, 400, 403, 404, 409, 413, 415), error envelopes, pagination, sorting severity, soft removal, and backend ownership protection.
3. **UI Component Tests**: React Testing Library component suite (`client/tests/lab-02/*.test.tsx`). Verifies client form validation counters, dropzone file selection error states, busy button submitting states, modal confirmation dialogs, empty states, no-results states, and form preservation upon server/upload failure.
4. **UI Style / Visual Tests**: RTL visual style assertions (`client/tests/lab-02/*.test.tsx`). Verifies Zen Green CSS design tokens, read-only field background shading (`#F0F4F2`), required red asterisk `*` placement, error message positioning below inputs, active-page indication highlight (`#0B7A46`), and visible focus indicator ring (`#0B7A46`).
5. **Responsive Layout Tests**: RTL viewport width tests (`client/tests/lab-02/MyTickets.test.tsx`). Verifies rendering desktop data table at viewports >=992px vs responsive stacked ticket card layout and collapsible mobile navigation at viewports <768px without horizontal page scrolling.
6. **End-to-End (E2E) Tests**: Playwright E2E integration suite (`e2e/lab-02/requester-ticket-flow.spec.ts`). Tests full end-to-end user workflows from Development Requester selection to ticket creation, My Tickets search/filtering/pagination, Ticket Detail inspection, and attachment soft removal across real browsers.

---

## 2. Planned Test Inventory

*Final Status Legend*:
- **PASS**: Verified passing with automated test output on the repository codebase.
- **PLANNED**: Specified test scenario ready for Test-Driven Development (TDD) implementation in its dedicated feature issue.

| Test ID | Level | Requirement / AC | Target Scenario / Test Description | Expected Result | Target Test File | Final Status |
|---|---|---|---|---|---|---|
| **UNIT-01** | Unit | BR-01 | Ticket Number format generator `TKT-YYYY-XXXXXX` | Returns string matching `^TKT-\d{4}-\d{6}$` | `server/tests/unit/ticketNumber.test.ts` | PLANNED |
| **UNIT-02** | Unit | BR-10, BR-11 | String trimming helper for summary and description | Trims whitespace, returns false if length invalid | `server/tests/unit/validation.test.ts` | PLANNED |
| **UNIT-03** | Unit | BR-06, BR-16 | File size and filename path traversal sanitizer helper | Rejects >5,000,000 bytes; sanitizes `../secret.txt` to `secret.txt` | `server/tests/unit/validation.test.ts` | PLANNED |
| **API-01** | API | BR-09, BR-23 | Missing `X-Requester-Id` header on protected route | HTTP `400 Bad Request` | `server/tests/lab-02/create-ticket.api.test.ts` | PLANNED |
| **API-02** | API | BR-09 | Invalid/non-numeric/<=0 `X-Requester-Id` header | HTTP `400 Bad Request` | `server/tests/lab-02/create-ticket.api.test.ts` | PLANNED |
| **API-03** | API | BR-09, FR-01, FR-09 | Active Development Requesters endpoint | HTTP `200 OK` (returns 4 active, excludes Eve Adams) | `server/tests/lab-02/reference-data.test.ts` | PASS |
| **API-04** | API | BR-10, AC-09 | Summary boundary test: 9 characters | HTTP `400 Bad Request` | `server/tests/lab-02/create-ticket.api.test.ts` | PLANNED |
| **API-05** | API | BR-10, AC-01 | Summary boundary test: 10 characters | HTTP `201 Created` | `server/tests/lab-02/create-ticket.api.test.ts` | PLANNED |
| **API-06** | API | BR-10, AC-01 | Summary boundary test: 120 characters | HTTP `201 Created` | `server/tests/lab-02/create-ticket.api.test.ts` | PLANNED |
| **API-07** | API | BR-10, AC-09 | Summary boundary test: 121 characters | HTTP `400 Bad Request` | `server/tests/lab-02/create-ticket.api.test.ts` | PLANNED |
| **API-08** | API | BR-11, AC-09 | Description boundary test: 19 characters | HTTP `400 Bad Request` | `server/tests/lab-02/create-ticket.api.test.ts` | PLANNED |
| **API-09** | API | BR-11, AC-01 | Description boundary test: 20 characters | HTTP `201 Created` | `server/tests/lab-02/create-ticket.api.test.ts` | PLANNED |
| **API-10** | API | BR-11, AC-01 | Description boundary test: 2,000 characters | HTTP `201 Created` | `server/tests/lab-02/create-ticket.api.test.ts` | PLANNED |
| **API-11** | API | BR-11, AC-09 | Description boundary test: 2,001 characters | HTTP `400 Bad Request` | `server/tests/lab-02/create-ticket.api.test.ts` | PLANNED |
| **API-12** | API | BR-12, AC-01 | Requested Priority: `URGENT` | HTTP `201 Created` | `server/tests/lab-02/create-ticket.api.test.ts` | PLANNED |
| **API-13** | API | BR-14, AC-20 | Duplicate submission during processing | HTTP `409 Conflict` | `server/tests/lab-02/create-ticket.api.test.ts` | PLANNED |
| **API-14** | API | BR-04, BR-05, AC-03 | Request ticket owned by another requester | HTTP `404 Not Found` | `server/tests/lab-02/ticket-detail.api.test.ts` | PLANNED |
| **API-15** | API | BR-06, AC-04 | File size boundary test: 4,999,999 bytes | HTTP `201 Created` | `server/tests/lab-02/attachments.api.test.ts` | PLANNED |
| **API-16** | API | BR-06, AC-04 | File size boundary test: 5,000,000 bytes | HTTP `201 Created` | `server/tests/lab-02/attachments.api.test.ts` | PLANNED |
| **API-17** | API | BR-06, AC-04 | File size boundary test: 5,000,001 bytes | HTTP `413 Payload Too Large` | `server/tests/lab-02/attachments.api.test.ts` | PLANNED |
| **API-18** | API | BR-06, AC-04 | Unsupported file extension (e.g. `.exe`) | HTTP `415 Unsupported Media Type` | `server/tests/lab-02/attachments.api.test.ts` | PLANNED |
| **API-19** | API | BR-07, AC-07 | Upload 6th active attachment to ticket with 5 active | HTTP `409 Conflict` | `server/tests/lab-02/attachments.api.test.ts` | PLANNED |
| **API-20** | API | BR-08, AC-17 | Soft remove attachment with 4-character reason | HTTP `400 Bad Request` | `server/tests/lab-02/attachments.api.test.ts` | PLANNED |
| **API-21** | API | BR-08, AC-17 | Soft remove attachment with 5-character reason | HTTP `200 OK` (sets `removedAt`) | `server/tests/lab-02/attachments.api.test.ts` | PLANNED |
| **API-22** | API | BR-08, AC-17 | Soft remove attachment with 200-character reason | HTTP `200 OK` (sets `removedAt`) | `server/tests/lab-02/attachments.api.test.ts` | PLANNED |
| **API-23** | API | BR-08, AC-17 | Soft remove attachment with 201-character reason | HTTP `400 Bad Request` | `server/tests/lab-02/attachments.api.test.ts` | PLANNED |
| **API-24** | API | BR-08, AC-05 | Download soft-removed attachment (ownership checked first) | HTTP `409 Conflict` | `server/tests/lab-02/attachments.api.test.ts` | PLANNED |
| **API-25** | API | BR-04, BR-05, AC-16 | Request attachment owned by another requester | HTTP `404 Not Found` | `server/tests/lab-02/attachments.api.test.ts` | PLANNED |
| **API-26** | API | BR-19, AC-06 | Search tickets by keyword in `ticketNumber`/summary/description | Returns matching owned tickets | `server/tests/lab-02/my-tickets.api.test.ts` | PLANNED |
| **API-27** | API | BR-20, AC-06 | Combined filters: Category + Related System + Priority + Status | Returns matching filtered tickets | `server/tests/lab-02/my-tickets.api.test.ts` | PLANNED |
| **API-28** | API | BR-21, AC-11 | Sort by `requestedPriority` severity with secondary `id DESC` | URGENT -> HIGH -> MEDIUM -> LOW | `server/tests/lab-02/my-tickets.api.test.ts` | PLANNED |
| **API-29** | API | BR-22, AC-10 | Pagination page reset on filter change & page beyond last | Returns 200 with empty array beyond last | `server/tests/lab-02/my-tickets.api.test.ts` | PLANNED |
| **API-30** | API | BR-16 | Filename sanitization / path traversal protection (`../secret.txt`) | Filename sanitized to basename | `server/tests/lab-02/attachments.api.test.ts` | PLANNED |
| **API-31** | API | BR-18 | Attachment upload fails after Ticket creation | Ticket saved, failure reported | `server/tests/lab-02/attachments.api.test.ts` | PLANNED |
| **API-32** | API | BR-07, BR-08 | Soft-removed attachment does not count toward 5-active limit | HTTP `201 Created` (5 active + 1 removed) | `server/tests/lab-02/attachments.api.test.ts` | PLANNED |
| **API-33** | API | FR-09 | Active Related Systems endpoint | HTTP `200 OK` (returns 7 seeded related systems) | `server/tests/lab-02/reference-data.test.ts` | PASS |
| **UI-01** | UI | BR-10, AC-09 | Submit form with 9-character summary | Field error message displayed below input | `client/tests/lab-02/CreateTicket.test.tsx` | PLANNED |
| **UI-02** | UI | BR-14, AC-20 | Submit button enters busy state and disables on click | Prevents duplicate click submit | `client/tests/lab-02/CreateTicket.test.tsx` | PLANNED |
| **UI-03** | UI | BR-15, AC-15 | Ticket creation fails on server | Form data & file selections preserved | `client/tests/lab-02/CreateTicket.test.tsx` | PLANNED |
| **UI-04** | UI | BR-05, AC-03 | Open ticket detail for non-owned ticket ID | Displays "Ticket not found." | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | PLANNED |
| **UI-05** | UI | BR-08, AC-17 | Open soft removal modal and enter 4-char reason | Submit button disabled/error shown | `client/tests/lab-02/AttachmentSection.test.tsx` | PLANNED |
| **UI-06** | UI | BR-08, AC-05 | Render soft-removed attachment in Ticket Detail | Download & preview buttons disabled | `client/tests/lab-02/AttachmentSection.test.tsx` | PLANNED |
| **UI-07** | UI | BR-26, AC-12 | Requester with zero tickets loads My Tickets | Empty state container displayed | `client/tests/lab-02/MyTickets.test.tsx` | PLANNED |
| **UI-08** | UI | BR-26, AC-13 | Filter query returns zero matching tickets | No-results state container displayed | `client/tests/lab-02/MyTickets.test.tsx` | PLANNED |
| **UI-09** | UI | AC-18 | Mobile viewport layout check (<768px) | Tables convert to cards, 0 horizontal scroll | `client/tests/lab-02/MyTickets.test.tsx` | PLANNED |
| **UI-10** | UI | AC-19 | Keyboard navigation focus ring check | Focus ring `#0B7A46` visible | `client/tests/lab-02/CreateTicket.test.tsx` | PLANNED |
| **UI-11** | UI | BR-25, AC-02 | No Requester selected on protected screen | Redirects to Requester Selection | `client/tests/lab-02/MyTickets.test.tsx` | PLANNED |
| **UI-12** | UI | BR-24, AC-08 | Changing Requester context in header | Reloads new requester's data | `client/tests/lab-02/MyTickets.test.tsx` | PLANNED |
| **UI-13** | UI | AC-14 | API 500 failure state rendering | Displays safe error without DB traces | `client/tests/lab-02/CreateTicket.test.tsx` | PLANNED |
| **UI-14** | UI | BR-23 | Client API module reads LocalStorage | Attaches `X-Requester-Id` header | `client/tests/lab-02/CreateTicket.test.tsx` | PLANNED |
| **UI-15** | UI | BR-06, AC-04 | Select invalid attachment file (e.g. `.exe` or >5 MB) | Dropzone displays field error message | `client/tests/lab-02/CreateTicket.test.tsx` | PLANNED |
| **UI-16** | UI | BR-18, AC-15 | Attachment upload fails after ticket creation | Upload warning banner shown, form/file retained | `client/tests/lab-02/CreateTicket.test.tsx` | PLANNED |
| **VIS-01** | Visual | Section 7 | Visual style check for Zen Green tokens & read-only field shading | Read-only background `#F0F4F2`, focus `#0B7A46` | `client/tests/lab-02/CreateTicket.test.tsx` | PLANNED |
| **VIS-02** | Visual | AC-19, UI-Spec 3.1 | Active-page navigation visual indication check | Active tab shows `#0B7A46` highlight & `aria-current="page"` | `client/tests/lab-02/CreateTicket.test.tsx` | PLANNED |
| **RESP-01** | Responsive | AC-18 | Responsive layout check desktop >=992px vs mobile <768px | Desktop table vs mobile vertical card stack | `client/tests/lab-02/MyTickets.test.tsx` | PLANNED |
| **RESP-02** | Responsive | AC-18, UI-Spec 3.1 | Responsive mobile navigation check <768px | Collapsible mobile nav menu, 0 horizontal scroll | `client/tests/lab-02/MyTickets.test.tsx` | PLANNED |
| **E2E-01** | E2E | AC-01, AC-02, AC-03, AC-05, AC-06, AC-08, AC-17, AC-18 | Complete flow: Select Requester -> Create Ticket -> Filter -> Detail -> Soft Remove | Expected: Full flow completes successfully | `e2e/lab-02/requester-ticket-flow.spec.ts` | PLANNED |

---

## 3. Acceptance Criterion (AC) Traceability Matrix

| Acceptance Criterion | Planned Test Coverage |
|---|---|
| **AC-01** (Create Ticket Success) | `API-05`, `API-06`, `API-09`, `API-10`, `API-12`, `E2E-01` |
| **AC-02** (Requester Selection Redirect) | `UI-11`, `E2E-01` |
| **AC-03** (Non-Owner Ticket 404 Protection) | `API-14`, `UI-04`, `E2E-01` |
| **AC-04** (File Size & Type Restrictions) | `API-15`, `API-16`, `API-17`, `API-18`, `UI-15` |
| **AC-05** (Soft-Removed Download Prevention) | `API-24`, `UI-06`, `E2E-01` |
| **AC-06** (Search & Combined Filtering) | `API-26`, `API-27`, `E2E-01` |
| **AC-07** (5 Active Attachment Limit) | `API-19`, `API-32` |
| **AC-08** (Requester Context Switching) | `UI-12`, `E2E-01` |
| **AC-09** (Summary & Description Validation) | `API-04`, `API-07`, `API-08`, `API-11`, `UI-01` |
| **AC-10** (Pagination & Page Beyond Last) | `API-29` |
| **AC-11** (Sorting by Severity & Secondary `id DESC`) | `API-28` |
| **AC-12** (Empty State Presentation) | `UI-07` |
| **AC-13** (No-Results State Presentation) | `UI-08` |
| **AC-14** (Safe Error State Presentation) | `UI-13` |
| **AC-15** (Data Retention After Error) | `UI-03`, `UI-16` |
| **AC-16** (Non-Owner Attachment 404 Protection) | `API-25` |
| **AC-17** (Soft Removal Reason Validation) | `API-20`, `API-21`, `API-22`, `API-23`, `UI-05`, `E2E-01` |
| **AC-18** (Responsive Viewport Rules) | `UI-09`, `RESP-01`, `RESP-02`, `E2E-01` |
| **AC-19** (Accessibility & Keyboard Focus) | `UI-10`, `VIS-01`, `VIS-02` |
| **AC-20** (Busy State & Duplicate Prevention) | `API-13`, `UI-02` |

---

## 4. Visual Inspection Checklist

Execute during manual visual testing and Playwright screenshot verification:

- [ ] **Application Shell & Nav**: `TokTickIT` branding visible; `My Tickets` and `Create Ticket` tabs present; active page indicates `#0B7A46` highlight and `aria-current="page"`; current Requester name displayed; `[Change Requester]` action available.
- [ ] **Color Tokens**: Header `#006B3C`, active accent `#0B7A46`, pale background `#EAF6EF`, page background `#F5F7F6`.
- [ ] **Field Styling**: Editable white `#FFFFFF` with neutral border `#D5DDD8`; read-only fields shaded `#F0F4F2`.
- [ ] **Validation Placement**: Required red asterisk `*` on labels; error text appears directly below invalid input.
- [ ] **Button Hierarchy**: Primary `#006B3C`, Secondary outlined neutral, Destructive `#B42318`, Disabled muted, Busy shows spinner.
- [ ] **Layout & Overflow**: Zero horizontal page scroll on mobile (<768px); labels and badge text do not clip or wrap awkwardly.
- [ ] **Responsive Views**: Desktop (>=992px) multi-column table; Mobile (<768px) stacked card layout with collapsible mobile nav menu.
- [ ] **Attachment Controls**: Active attachments show download/remove buttons; soft-removed attachments show disabled controls with reason & date.
- [ ] **Missing / Feedback States**: Loading skeletons, empty list state, no-results filter state, and safe error banners render correctly.

---

## 5. Test Execution Commands

```bash
# Backend Unit & API Integration Tests
cd server && npm test

# Frontend UI Component, Visual & Responsive Tests
cd client && npm test

# E2E Playwright Tests
npx playwright test e2e/lab-02/
```

---

## 6. Final Results

### 6.1 Executed & Passing Verification Suite
Current automated test suites executed against the `lab2-staging` backend code demonstrate 100% passing results across 5 tests:
- `tests/lab-01/API-01.health.test.ts`: Health check endpoint returns `200 OK` (PASS).
- `tests/lab-01/API-02.categories.test.ts`: Categories endpoint returns `200 OK` with 4 active categories (PASS).
- `server/tests/lab-02/reference-data.test.ts`: Reference data endpoint suite (`API-03`, `API-33`) verifying active Development Requesters (4 active, Eve Adams excluded), 7 Related Systems, and Categories in `id ASC` order (PASS).

### 6.2 Planned Test Inventory Status
- **Total Planned Test Cases**: 57 test scenarios across 6 testing levels.
- **Executed & Passing**: 5 tests (`API-01` health, `API-02` categories, `API-03` active requesters, `API-33` related systems, categories order).
- **Planned for Feature Issue TDD**: 52 tests specified with explicit target file paths and Acceptance Criteria traceability mappings, ready for TDD implementation in feature branches.

---

## 7. Known Limitations & Deferred Tests

The following capabilities are intentionally outside the Lab 2 Requester MVP scope and are deferred to subsequent sprint labs per the approved engineering contract:

1. **Real Authentication & Role-Based Access (Deferred to Lab 3)**:
   - Passwords, password hashing (Argon2id), session management, JWT tokens, login/logout screens, and authenticated identities are deferred to Lab 3.
   - Lab 2 strictly uses the temporary Development Requester Selection mechanism (`X-Requester-Id` header testing context) as defined in `BR-27`.
2. **IT Staff Workflows & Ticket Lifecycle (Deferred to Lab 4)**:
   - IT Staff dashboard, queue management, claiming/reassigning tickets, setting IT Priority, and status transitions beyond initial `NEW` status (Resolving, Closing, Reopening, Cancelling) are deferred to Lab 4.
3. **Collaboration & Activity Tracking (Deferred to Later Labs)**:
   - Public Comments, Internal Notes, and Actions Taken audit trails are excluded from Lab 2 MVP scope.
4. **Advanced Infrastructure & Security Capabilities**:
   - Virus scanning on attachment uploads, rate limiting, signed download URLs, and database encryption at rest are excluded from Lab 2 scope.
