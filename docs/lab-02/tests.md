# TokTickIT Test Plan & Acceptance Traceability: Lab 2

**Repository**: [Apichaya251400/TokTickIT](https://github.com/Apichaya251400/TokTickIT)  
**Branch**: `lab2-staging`  
**Verified Commit**: `24ea30d` (`Merge pull request #40 from Apichaya251400/fix/issue-31-ui-background`)

---

## 1. Test Strategy

### 1.1 Testing Approach

TokTickIT follows a strict **Spec-Driven Development (SDD)** architecture. Test planning and implementation precede and guide code execution, ensuring that all API contracts, database schemas, UI rules, and business logic strictly align with `docs/lab-02/specification.md`, `docs/lab-02/api-spec.md`, and `docs/lab-02/ui-spec.md`.

Testing is organized across all six required Lab 2 testing levels (Unit, API / Integration, UI Component, UI Style / Visual, Responsive Layout, and End-to-End E2E Workflows), complemented by manual visual inspection for CSS theme styling and visual layout alignment.

### 1.2 Six Testing Levels

| Level | Tooling | Actual Test Location | Purpose |
|---|---|---|---|
| **Unit** | Vitest | `server/tests/unit/ticketNumber.test.ts`, `server/tests/unit/validation.test.ts` | Validates backend `TKT-YYYY-XXXXXX` ticket number format generation, string trimming, filename path-traversal sanitization, and file size boundary helper functions. |
| **API / Integration** | Vitest + Supertest | `server/tests/lab-02/attachments.api.test.ts`, `server/tests/lab-02/create-ticket.api.test.ts`, `server/tests/lab-02/my-tickets.api.test.ts`, `server/tests/lab-02/reference-data.test.ts`, `server/tests/lab-02/ticket-detail.api.test.ts` | Validates Express route controllers, Prisma PostgreSQL queries, `X-Requester-Id` header validation, HTTP status code mapping (200, 201, 400, 403, 404, 409, 413, 415), error envelopes, attachment lifecycle, and backend ownership isolation returning 404. |
| **UI Component** | Vitest + RTL + jsdom | `client/tests/lab-02/CreateTicket.test.tsx`, `client/tests/lab-02/MyTicketsAndDetail.test.tsx`, `client/tests/lab-02/RequesterSelection.test.tsx` | Validates React form controls, character counters, dropzone file validation, busy submit buttons, modal confirmation dialogs, empty states, no-results states, keyboard focus, and data retention on failure. |
| **UI Style / Visual** | RTL + manual browser inspection | `client/tests/lab-02/CreateTicket.test.tsx`, `client/tests/lab-02/MyTicketsAndDetail.test.tsx` + Manual Inspection | Validates Zen Green CSS design tokens (`#006B3C`, `#0B7A46`, `#EAF6EF`, `#F5F7F6`), read-only field shading (`#F0F4F2`), required red asterisk `*` placement, and error text formatting (`#B42318`). |
| **Responsive** | RTL + manual browser inspection | `client/tests/lab-02/CreateTicket.test.tsx`, `client/tests/lab-02/MyTicketsAndDetail.test.tsx` + Manual Inspection | Validates desktop table layout (>=992px) vs mobile stacked ticket cards (<768px) and collapsible mobile navigation with zero horizontal page scroll. |
| **E2E** | Playwright | `e2e/lab-02/requester-ticket-flow.spec.ts` | Validates full end-to-end multi-step requester workflows across real Chromium browsers on Desktop (1280x800) and Mobile (375x667) viewports. |

---

## 2. Planned Test Inventory

### 2.1 Final Status Legend

- **PASS** = actual automated test executed and passed
- **MANUAL PASS** = manually verified against the UI specification
- **PLANNED** = planned but not yet implemented/executed
- **NOT DIRECTLY TESTED** = requirement has no direct automated evidence

*Note on Inventory Scenarios vs. Test Cases*: These 58 inventory scenarios provide requirement-level traceability across all functional specification features. The actual automated execution contains 115 Lab 2 test cases (58 server tests, 55 client tests, and 2 Playwright E2E tests).

### 2.2 Test Inventory

| Test ID | Level | Requirement / AC | Test Scenario | Expected Result | Automated Test File | Final Status |
|---|---|---|---|---|---|---|
| **UNIT-01** | Unit | BR-01 | Ticket Number format generator `TKT-YYYY-XXXXXX` | Returns string matching `^TKT-\d{4}-\d{6}$` | `server/tests/unit/ticketNumber.test.ts` | **PASS** |
| **UNIT-02** | Unit | BR-10, BR-11 | String trimming helper for summary and description | Trims whitespace, returns false if trimmed length is invalid | `server/tests/unit/validation.test.ts` | **PASS** |
| **UNIT-03** | Unit | BR-06, BR-16 | File size and filename path traversal sanitizer helper | Rejects >5,000,000 bytes; sanitizes `../secret.txt` to `secret.txt` | `server/tests/unit/validation.test.ts` | **PASS** |
| **API-01** | API | BR-09, BR-23 | Missing `X-Requester-Id` header on protected route | HTTP `400 Bad Request` | `server/tests/lab-02/create-ticket.api.test.ts` | **PASS** |
| **API-02** | API | BR-09 | Invalid/non-numeric/<=0 `X-Requester-Id` header | HTTP `400 Bad Request` | `server/tests/lab-02/create-ticket.api.test.ts` | **PASS** |
| **API-03** | API | BR-09, FR-01, FR-09 | Active Development Requesters endpoint | HTTP `200 OK` (returns 4 active, excludes Eve Adams) | `server/tests/lab-02/reference-data.test.ts` | **PASS** |
| **API-04** | API | BR-10, AC-09 | Summary boundary & whitespace validation (9 chars or whitespace-only) | HTTP `400 Bad Request` | `server/tests/lab-02/create-ticket.api.test.ts` | **PASS** |
| **API-05** | API | BR-10, AC-01 | Summary boundary test: exactly 10 characters | HTTP `201 Created` | `server/tests/lab-02/create-ticket.api.test.ts` | **PASS** |
| **API-06** | API | BR-10, AC-01 | Summary boundary test: exactly 120 characters | HTTP `201 Created` | `server/tests/lab-02/create-ticket.api.test.ts` | **PASS** |
| **API-07** | API | BR-10, AC-09 | Summary boundary test: 121 characters | HTTP `400 Bad Request` | `server/tests/lab-02/create-ticket.api.test.ts` | **PASS** |
| **API-08** | API | BR-11, AC-09 | Description boundary test: 19 characters | HTTP `400 Bad Request` | `server/tests/lab-02/create-ticket.api.test.ts` | **PASS** |
| **API-09** | API | BR-11, AC-01 | Description boundary test: exactly 20 characters | HTTP `201 Created` | `server/tests/lab-02/create-ticket.api.test.ts` | **PASS** |
| **API-10** | API | BR-11, AC-01 | Description boundary test: exactly 2,000 characters | HTTP `201 Created` | `server/tests/lab-02/create-ticket.api.test.ts` | **PASS** |
| **API-11** | API | BR-11, AC-09 | Description boundary test: 2,001 characters | HTTP `400 Bad Request` | `server/tests/lab-02/create-ticket.api.test.ts` | **PASS** |
| **API-12** | API | BR-12, AC-01 | Requested Priority: `URGENT` | HTTP `201 Created` | `server/tests/lab-02/create-ticket.api.test.ts` | **PASS** |
| **API-13** | API | BR-14, AC-20 | Duplicate submission during active processing | HTTP `409 Conflict` | `server/tests/lab-02/create-ticket.api.test.ts` | **PASS** |
| **API-14** | API | BR-04, BR-05, AC-03 | Request ticket owned by another requester | HTTP `404 Not Found` | `server/tests/lab-02/ticket-detail.api.test.ts` | **PASS** |
| **API-15** | API | BR-06, AC-04 | File size boundary test: 4,999,999 bytes | HTTP `201 Created` | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-16** | API | BR-06, AC-04 | File size boundary test: 5,000,000 bytes | HTTP `201 Created` | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-17** | API | BR-06, AC-04 | File size boundary test: 5,000,001 bytes | HTTP `413 Payload Too Large` | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-18** | API | BR-06, AC-04 | Unsupported file extension (e.g. `.exe`) | HTTP `415 Unsupported Media Type` | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-19** | API | BR-07, AC-07 | Upload 6th active attachment to ticket with 5 active | HTTP `409 Conflict` | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-20** | API | BR-08, AC-17 | Soft remove attachment with 4-character reason | HTTP `400 Bad Request` | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-21** | API | BR-08, AC-17 | Soft remove attachment with 5-character reason | HTTP `200 OK` (sets `removedAt`) | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-22** | API | BR-08, AC-17 | Soft remove attachment with 200-character reason | HTTP `200 OK` (sets `removedAt`) | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-23** | API | BR-08, AC-17 | Soft remove attachment with 201-character reason | HTTP `400 Bad Request` | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-24** | API | BR-08, AC-05 | Download soft-removed attachment (ownership checked first) | HTTP `409 Conflict` | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-25** | API | BR-04, BR-05, AC-16 | Request attachment owned by another requester | HTTP `404 Not Found` | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-26** | API | BR-19, AC-06 | Search tickets by keyword in `ticketNumber`/summary/description | Returns matching owned tickets | `server/tests/lab-02/my-tickets.api.test.ts` | **PASS** |
| **API-27** | API | BR-20, AC-06 | Combined filters: Category + Related System + Priority + Status | Returns matching filtered tickets | `server/tests/lab-02/my-tickets.api.test.ts` | **PASS** |
| **API-28** | API | BR-21, AC-11 | Sort by `requestedPriority` severity with secondary `id DESC` | URGENT -> HIGH -> MEDIUM -> LOW | `server/tests/lab-02/my-tickets.api.test.ts` | **PASS** |
| **API-29** | API | BR-22, AC-10 | Pagination page reset on filter change & page beyond last | Returns 200 with empty array beyond last | `server/tests/lab-02/my-tickets.api.test.ts` | **PASS** |
| **API-30** | API | BR-16 | Filename sanitization / path traversal protection (`../secret.txt`) | Filename sanitized to basename | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-31** | API | BR-18 | Attachment upload fails after Ticket creation | Ticket saved, failure reported | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-32** | API | BR-07, BR-08 | Soft-removed attachment does not count toward 5-active limit | HTTP `201 Created` (5 active + 1 removed) | `server/tests/lab-02/attachments.api.test.ts` | **PASS** |
| **API-33** | API | FR-09 | Active Related Systems endpoint | HTTP `200 OK` (returns 7 seeded related systems) | `server/tests/lab-02/reference-data.test.ts` | **PASS** |
| **UI-01** | UI | BR-10, AC-09 | Submit form with 9-character summary | Field error message displayed below input | `client/tests/lab-02/CreateTicket.test.tsx` | **PASS** |
| **UI-02** | UI | BR-14, AC-20 | Submit button enters busy state and disables on click | Prevents duplicate click submit | `client/tests/lab-02/CreateTicket.test.tsx` | **PASS** |
| **UI-03** | UI | BR-15, AC-15 | Ticket creation fails on server | Form data & file selections preserved | `client/tests/lab-02/CreateTicket.test.tsx` | **PASS** |
| **UI-04** | UI | BR-05, AC-03 | Open ticket detail for non-owned ticket ID | Displays "Ticket not found." | `client/tests/lab-02/MyTicketsAndDetail.test.tsx` | **PASS** |
| **UI-05** | UI | BR-08, AC-17 | Open soft removal modal and enter 4-char reason | Submit button disabled/error shown | `client/tests/lab-02/MyTicketsAndDetail.test.tsx` | **PASS** |
| **UI-06** | UI | BR-08, AC-05 | Render soft-removed attachment in Ticket Detail | Download & preview buttons disabled | `client/tests/lab-02/MyTicketsAndDetail.test.tsx` | **PASS** |
| **UI-07** | UI | BR-26, AC-12 | Requester with zero tickets loads My Tickets | Empty state container displayed | `client/tests/lab-02/MyTicketsAndDetail.test.tsx` | **PASS** |
| **UI-08** | UI | BR-26, AC-13 | Filter query returns zero matching tickets | No-results state container displayed | `client/tests/lab-02/MyTicketsAndDetail.test.tsx` | **PASS** |
| **UI-09** | UI | AC-18 | Mobile viewport layout check (<768px) | Tables convert to cards, 0 horizontal scroll | `client/tests/lab-02/MyTicketsAndDetail.test.tsx` | **PASS** |
| **UI-10** | UI | AC-19 | Keyboard navigation focus ring check | Focus ring `#0B7A46` visible | `client/tests/lab-02/CreateTicket.test.tsx` | **PASS** |
| **UI-11** | UI | BR-25, AC-02 | No Requester selected on protected screen | Redirects to Requester Selection | `client/tests/lab-02/RequesterSelection.test.tsx` | **PASS** |
| **UI-12** | UI | BR-24, AC-08 | Changing Requester context in header | Reloads new requester's data | `client/tests/lab-02/RequesterSelection.test.tsx` | **PASS** |
| **UI-13** | UI | AC-14 | API 500 failure state rendering | Displays safe error without DB traces | `client/tests/lab-02/CreateTicket.test.tsx` | **PASS** |
| **UI-14** | UI | BR-23 | Client API module reads LocalStorage | Attaches `X-Requester-Id` header | `client/tests/lab-02/CreateTicket.test.tsx` | **PASS** |
| **UI-15** | UI | BR-06, AC-04 | Select invalid attachment file (e.g. `.exe` or >5 MB) | Dropzone displays field error message | `client/tests/lab-02/CreateTicket.test.tsx` | **PASS** |
| **UI-16** | UI | BR-18, AC-15 | Attachment upload fails after ticket creation | Upload warning banner shown, form/file retained | `client/tests/lab-02/CreateTicket.test.tsx` | **PASS** |
| **VIS-01** | Visual | Section 7 | Visual style check for Zen Green tokens & read-only field shading | Read-only background `#F0F4F2`, focus `#0B7A46` | `client/tests/lab-02/CreateTicket.test.tsx` | **PASS** |
| **VIS-02** | Visual | AC-19, UI-Spec 3.1 | Active-page navigation visual indication check | Active tab shows `#0B7A46` highlight & `aria-current="page"` | `client/tests/lab-02/CreateTicket.test.tsx` | **PASS** |
| **RESP-01** | Responsive | AC-18 | Responsive layout check desktop >=992px vs mobile <768px | Desktop table vs mobile vertical card stack | `client/tests/lab-02/MyTicketsAndDetail.test.tsx` | **PASS** |
| **RESP-02** | Responsive | AC-18, UI-Spec 3.1 | Responsive mobile navigation check <768px | Collapsible mobile nav menu, 0 horizontal scroll | `client/tests/lab-02/MyTicketsAndDetail.test.tsx` | **PASS** |
| **E2E-01** | E2E | AC-01, AC-02, AC-03, AC-05, AC-06, AC-08, AC-17, AC-18 | Complete Desktop Flow (1280x800): Requester Selection -> Create Ticket -> Filter -> Detail -> Soft Remove | Full flow completes successfully | `e2e/lab-02/requester-ticket-flow.spec.ts` | **PASS** |
| **E2E-02** | E2E | AC-18 | Mobile Flow (375x667): Collapsible nav, card list rendering, zero horizontal scroll | Mobile responsive flow completes with zero page overflow | `e2e/lab-02/requester-ticket-flow.spec.ts` | **PASS** |

---

## 3. Acceptance-Criterion Traceability

| AC | Exact Requirement (`docs/lab-02/specification.md`) | Supporting Test(s) | Test File(s) | Evidence Type | Status |
|---|---|---|---|---|---|
| **AC-01** | Given valid ticket data, when Requester submits form with `X-Requester-Id`, then ticket is saved, unique `ticketNumber` is returned, and success state is shown. | `API-05`, `API-06`, `API-09`, `API-10`, `API-12`, `E2E-01` | `create-ticket.api.test.ts`, `CreateTicket.test.tsx`, `requester-ticket-flow.spec.ts` | Automated Integration + UI + E2E | **PASS** |
| **AC-02** | Given no Development Requester is selected, when user accesses protected screens, then system redirects to Requester Selection screen. | `UI-11`, `E2E-01` | `RequesterSelection.test.tsx`, `MyTicketsAndDetail.test.tsx`, `requester-ticket-flow.spec.ts` | Automated UI + E2E | **PASS** |
| **AC-03** | Given Requester B context, when requesting a ticket owned by Requester A, then backend rejects request with HTTP 404 Not Found. | `API-14`, `UI-04`, `E2E-01` | `ticket-detail.api.test.ts`, `attachments.api.test.ts`, `MyTicketsAndDetail.test.tsx`, `requester-ticket-flow.spec.ts` | Automated Integration + UI + E2E | **PASS** |
| **AC-04** | Given an attachment exceeds 5,000,000 bytes or is of unpermitted type (e.g. EXE), when uploaded, then API returns HTTP 413 or 415 and UI shows field/dropzone validation error. | `API-15`, `API-16`, `API-17`, `API-18`, `UI-15` | `attachments.api.test.ts`, `CreateTicket.test.tsx` | Automated Integration + UI | **PASS** |
| **AC-05** | Given an attachment is soft-removed, when download is attempted, then API evaluates ownership first (404 if non-owned) and returns HTTP 409 Conflict if soft-removed. | `API-24`, `UI-06`, `E2E-01` | `attachments.api.test.ts`, `MyTicketsAndDetail.test.tsx`, `requester-ticket-flow.spec.ts` | Automated Integration + UI + E2E | **PASS** |
| **AC-06** | Given user applies search, Category, Related System, Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), or Status filter, then only matching tickets owned by Requester are returned. | `API-26`, `API-27`, `E2E-01` | `my-tickets.api.test.ts`, `MyTicketsAndDetail.test.tsx`, `requester-ticket-flow.spec.ts` | Automated Integration + UI + E2E | **PASS** |
| **AC-07** | Given a ticket has 5 active attachments, when uploading a 6th, then API returns HTTP 409 Conflict and upload is blocked. | `API-19`, `API-32` | `attachments.api.test.ts`, `CreateTicket.test.tsx` | Automated Integration + UI | **PASS** |
| **AC-08** | Given Requester selection changes, when accessing My Tickets, then application reloads and displays only the new Requester's tickets. | `UI-12`, `E2E-01` | `RequesterSelection.test.tsx`, `MyTicketsAndDetail.test.tsx`, `requester-ticket-flow.spec.ts` | Automated UI + E2E | **PASS** |
| **AC-09** | Given Summary < 10 chars, Description < 20 chars, or whitespace-only input, when submitted, field validation messages display and API is not called. | `API-04`, `API-07`, `API-08`, `API-11`, `UI-01` | `create-ticket.api.test.ts`, `CreateTicket.test.tsx` | Automated Integration + UI | **PASS** |
| **AC-10** | Given valid tickets span multiple pages, when changing page, API returns correct page and metadata. Requesting a page beyond total returns 200 with empty array. | `API-29` | `my-tickets.api.test.ts`, `MyTicketsAndDetail.test.tsx` | Automated Integration + UI | **PASS** |
| **AC-11** | Given user selects a sort option (`createdAt`, `updatedAt`, `ticketNumber`, `requestedPriority`), tickets are returned in requested order with deterministic secondary sort `id DESC`. | `API-28` | `my-tickets.api.test.ts`, `MyTicketsAndDetail.test.tsx` | Automated Integration + UI | **PASS** |
| **AC-12** | Given a Requester has no tickets, My Tickets displays a meaningful empty state. | `UI-07` | `MyTicketsAndDetail.test.tsx` | Automated Component | **PASS** |
| **AC-13** | Given search/filter returns zero tickets, My Tickets displays a clear no-results state. | `UI-08` | `MyTicketsAndDetail.test.tsx` | Automated Component | **PASS** |
| **AC-14** | Given API failure, UI displays a safe error message without internal server details. | `UI-13` | `CreateTicket.test.tsx`, `MyTicketsAndDetail.test.tsx` | Automated Component | **PASS** |
| **AC-15** | Given ticket creation or upload fails, form inputs, selected files, and requester context are preserved. | `UI-03`, `UI-16` | `CreateTicket.test.tsx` | Automated Component | **PASS** |
| **AC-16** | Given Requester attempts to access another Requester's attachment directly, backend returns HTTP 404 Not Found. | `API-25` | `attachments.api.test.ts`, `MyTicketsAndDetail.test.tsx` | Automated Integration + UI | **PASS** |
| **AC-17** | Given user soft-removes an attachment, when removal reason is under 5 characters or omitted, removal is prevented and validation message displays. | `API-20`, `API-21`, `API-22`, `API-23`, `UI-05`, `E2E-01` | `attachments.api.test.ts`, `MyTicketsAndDetail.test.tsx`, `requester-ticket-flow.spec.ts` | Automated Integration + UI + E2E | **PASS** |
| **AC-18** | Given desktop, tablet, and mobile viewports, controls remain usable without clipping, overlap, or unintended horizontal scrolling. | `UI-09`, `RESP-01`, `RESP-02`, `E2E-01`, `E2E-02` | `MyTicketsAndDetail.test.tsx`, `requester-ticket-flow.spec.ts` | Automated + Manual Inspection | **PASS** |
| **AC-19** | Given keyboard user, controls are reachable, focus ring is visible (`#0B7A46`), and contrast meets WCAG AA. | `UI-10`, `VIS-01`, `VIS-02` | `CreateTicket.test.tsx`, `MyTicketsAndDetail.test.tsx` | Automated + Manual Inspection | **PASS** |
| **AC-20** | Given user submits a valid ticket, Submit button enters busy state and prevents duplicate submission during processing. | `API-13`, `UI-02` | `create-ticket.api.test.ts`, `CreateTicket.test.tsx` | Automated Integration + UI | **PASS** |

---

## 4. Business-Rule Coverage

| BR | Exact Business Rule (`docs/lab-02/specification.md`) | Supporting Test(s) | Test File(s) | Status |
|---|---|---|---|---|
| **BR-01** | Official Ticket Number (`ticketNumber`) is generated by backend in format `TKT-YYYY-XXXXXX` and must be unique. | `UNIT-01`, `API-05` | `server/tests/unit/ticketNumber.test.ts`, `create-ticket.api.test.ts` | **PASS** |
| **BR-02** | A newly created ticket always begins with initial Current Status `NEW`. | `API-05` | `create-ticket.api.test.ts`, `CreateTicket.test.tsx` | **PASS** |
| **BR-03** | Requester selection via `X-Requester-Id` header is strictly a testing context and does not represent authentication. Active Development Requesters are fetched from `GET /api/requesters/active`. Seed data explicitly includes at least 4 active Development Requesters (Alice Smith, Bob Jones, Charlie Brown, Diana Prince) and 1 inactive Development Requester (Eve Adams). | `API-03`, `UI-11` | `reference-data.test.ts`, `RequesterSelection.test.tsx` | **PASS** |
| **BR-04** | Requesters can only access tickets and attachments they own. Queries must be scoped to `requesterId`. | `API-14`, `API-25` | `my-tickets.api.test.ts`, `ticket-detail.api.test.ts` | **PASS** |
| **BR-05** | Ownership checks must be enforced by the backend before evaluating resource status. Accessing another Requester's Ticket or Attachment must return HTTP `404 Not Found` to avoid disclosing resource existence. | `API-14`, `API-25`, `UI-04` | `ticket-detail.api.test.ts`, `attachments.api.test.ts` | **PASS** |
| **BR-06** | Allowed attachment file types are strictly `JPG`, `JPEG`, `PNG`, `WEBP`, and `PDF`. Maximum file size is strictly `5,000,000 bytes` (`MAX_FILE_SIZE_BYTES = 5_000_000`). Files of size `5,000,001 bytes` or greater must be rejected with HTTP `413 Payload Too Large`. | `UNIT-03`, `API-15`, `API-16`, `API-17`, `API-18`, `UI-15` | `attachments.api.test.ts`, `CreateTicket.test.tsx` | **PASS** |
| **BR-07** | A single ticket can contain a maximum of 5 ACTIVE attachments. Soft-removed attachments do not count toward the 5-active limit. Attempting to add a 6th active attachment must return HTTP `409 Conflict`. | `API-19`, `API-32` | `attachments.api.test.ts`, `CreateTicket.test.tsx` | **PASS** |
| **BR-08** | Attachment deletion must use soft removal by setting `removedAt` timestamp and `removalReason` (5–200 characters). For download and removal requests, ownership is checked first (returning 404 if non-owned); after ownership is established, if the file is soft-removed, download returns HTTP `409 Conflict`. | `API-20`, `API-21`, `API-22`, `API-23`, `API-24`, `UI-05`, `UI-06` | `attachments.api.test.ts`, `MyTicketsAndDetail.test.tsx` | **PASS** |
| **BR-09** | Inactive Requesters (e.g. Eve Adams) must not appear in the Development Requester Selector. If `X-Requester-Id` specifies an unknown or inactive requester ID, the API returns HTTP `403 Forbidden`. Missing, empty, non-numeric, or `<= 0` header returns HTTP `400 Bad Request`. | `API-01`, `API-02`, `API-03` | `create-ticket.api.test.ts`, `my-tickets.api.test.ts` | **PASS** |
| **BR-10** | Ticket Summary is required and must contain 10–120 characters after trimming leading/trailing whitespace. Whitespace-only input is invalid. | `UNIT-02`, `API-04`, `API-05`, `API-06`, `API-07`, `UI-01` | `create-ticket.api.test.ts`, `CreateTicket.test.tsx` | **PASS** |
| **BR-11** | Description is required and must contain 20–2,000 characters after trimming leading/trailing whitespace. Whitespace-only input is invalid. | `UNIT-02`, `API-08`, `API-09`, `API-10`, `API-11` | `create-ticket.api.test.ts`, `CreateTicket.test.tsx` | **PASS** |
| **BR-12** | Requested Priority must be one of: `LOW`, `MEDIUM`, `HIGH`, `URGENT`. | `API-12` | `create-ticket.api.test.ts`, `CreateTicket.test.tsx` | **PASS** |
| **BR-13** | Validation rules must be enforced on both frontend and backend. Backend validation is authoritative. | `API-04`, `UI-01` | `create-ticket.api.test.ts`, `CreateTicket.test.tsx` | **PASS** |
| **BR-14** | Duplicate submission means repeated submission of the same ticket creation request while the previous submission is still being processed. Repeated submission during processing returns HTTP 409 Conflict and preserves form values. | `API-13`, `UI-02` | `create-ticket.api.test.ts`, `CreateTicket.test.tsx` | **PASS** |
| **BR-15** | In case of submission or attachment upload failure, form inputs and requester context must be retained. | `UI-03`, `UI-16` | `CreateTicket.test.tsx` | **PASS** |
| **BR-16** | Uploaded filenames must be sanitized before storage to prevent path traversal (e.g. `../secret.txt`). | `UNIT-03`, `API-30` | `attachments.api.test.ts` | **PASS** |
| **BR-17** | Attachment metadata includes original filename, size in bytes, MIME type, storage path, upload timestamp, and removal information. | `API-15` | `attachments.api.test.ts` | **PASS** |
| **BR-18** | If attachment upload fails after ticket creation, the ticket remains saved, the failure is reported, and form/attachment selections are preserved for retry without creating corrupt attachment records. | `API-31`, `UI-16` | `attachments.api.test.ts`, `CreateTicket.test.tsx` | **PASS** |
| **BR-19** | Search is case-insensitive, matches substrings in Ticket Number (`ticketNumber`), Summary, or Description, and trims search input. | `API-26` | `my-tickets.api.test.ts`, `MyTicketsAndDetail.test.tsx` | **PASS** |
| **BR-20** | Filters combine with `AND` logic across Category, Related System, Requested Priority, and Status. | `API-27` | `my-tickets.api.test.ts`, `MyTicketsAndDetail.test.tsx` | **PASS** |
| **BR-21** | Sorting supports `createdAt`, `updatedAt`, `ticketNumber`, and `requestedPriority`. Default sort is `createdAt DESC`. Secondary sort is `id DESC`. `requestedPriority` sorts by severity (`URGENT` > `HIGH` > `MEDIUM` > `LOW`). | `API-28` | `my-tickets.api.test.ts`, `MyTicketsAndDetail.test.tsx` | **PASS** |
| **BR-22** | Pagination starts at page 1. Default pageSize is 10. Allowed pageSizes are 10, 20, 50. Changing search, filter, sort, or pageSize resets page to 1. Requesting a page beyond total pages returns 200 OK with an empty array. | `API-29` | `my-tickets.api.test.ts`, `MyTicketsAndDetail.test.tsx` | **PASS** |
| **BR-23** | Client stores `selectedRequesterId` in LocalStorage and attaches `X-Requester-Id` header to API requests. | `API-01`, `UI-14` | `RequesterSelection.test.tsx`, `CreateTicket.test.tsx` | **PASS** |
| **BR-24** | Switching Development Requester reloads requester-specific ticket data. | `UI-12` | `RequesterSelection.test.tsx`, `MyTicketsAndDetail.test.tsx` | **PASS** |
| **BR-25** | If no Requester is selected, protected UI routes redirect to the Requester Selection screen. | `UI-11` | `RequesterSelection.test.tsx` | **PASS** |
| **BR-26** | Empty states are displayed when a requester has no tickets; no-results states are displayed when search/filters match zero tickets. | `UI-07`, `UI-08` | `MyTicketsAndDetail.test.tsx` | **PASS** |
| **BR-27** | Lab 2 does not implement real password or login authentication. The Development Requester Selection mechanism is strictly a temporary testing mechanism used to simulate requester context (`X-Requester-Id` header) for Lab 2 workflows. It is intended to be replaced by real authentication and session-based requester identification in Lab 3. | `API-03`, `UI-11` | `docs/lab-02/specification.md`, `RequesterSelection.test.tsx` | **PASS** |

---

## 5. Responsive & Visual Checklist

### 5.1 Responsive Coverage

| Viewport | Screen | Evidence | Status |
|---|---|---|---|
| **Desktop (>=992px)** | My Tickets | Renders multi-column data table with sortable headers and action controls | **PASS** (Automated + Manual) |
| **Desktop (>=992px)** | Create Ticket & Ticket Detail | Multi-column form layout, sidebar metadata card, side-by-side attachments | **PASS** (Automated + Manual) |
| **Tablet (768–991px)** | All Screens | Adaptive grid layout, flexible container margins | **PASS** (Automated + Manual) |
| **Mobile (<768px)** | My Tickets | Converts data table to vertical stacked ticket cards; zero horizontal page scroll | **PASS** (Automated + Manual) |
| **Mobile (<768px)** | Application Shell | Renders collapsible mobile navigation menu and compact header identity badge | **PASS** (Automated + Manual) |

### 5.2 Visual Checklist

| Requirement | Automated Evidence | Manual Evidence | Status |
|---|---|---|---|
| **Global Page Background `#F5F7F6`** | Applied in `client/index.html` (`body { background-color: #F5F7F6; }`) | Verified in browser inspection | **MANUAL PASS** |
| **Primary Theme Color `#006B3C`** | CSS token `.btn-zen-primary` (`background: #006B3C`) | Verified in browser inspection | **MANUAL PASS** |
| **Active Accent Color `#0B7A46`** | Active tab class `aria-current="page"` & CSS focus ring | Verified in browser inspection | **MANUAL PASS** |
| **Pale Emphasis Color `#EAF6EF`** | CSS token `.bg-zen-pale` (`background: #EAF6EF`) | Verified in browser inspection | **MANUAL PASS** |
| **Read-Only Fields `#F0F4F2`** | `readOnly` attribute & `.bg-zen-readonly` shading | Verified in browser inspection | **MANUAL PASS** |
| **Required Indicators `*`** | Form labels contain `<span class="text-danger">*</span>` | Verified in browser inspection | **MANUAL PASS** |
| **Validation Error Placement** | RTL asserts error text rendered beneath invalid field (`#B42318`) | Verified in browser inspection | **MANUAL PASS** |
| **Button Hierarchy** | Class bindings for primary, secondary outline, and destructive action buttons | Verified in browser inspection | **MANUAL PASS** |
| **Loading / Busy State** | RTL asserts button `disabled` attribute & spinner element | Verified in browser inspection | **MANUAL PASS** |
| **Success Callout** | RTL asserts success alert message rendering (`#006B3C`) | Verified in browser inspection | **MANUAL PASS** |
| **Error Banner** | RTL asserts safe error message banner (`#F8D7DA`) without database traces | Verified in browser inspection | **MANUAL PASS** |
| **Attachment Badges** | RTL asserts active vs soft-removed file listing and modal controls | Verified in browser inspection | **MANUAL PASS** |
| **Keyboard Focus Ring `#0B7A46`** | Focus ring CSS rules applied across form controls | Verified in browser inspection | **MANUAL PASS** |

*Note on Evidence Classification: Automated component assertions verify element presence, accessibility attributes, and class bindings. Exact visual pixel alignment, color token fidelity, and contrast ratios are confirmed via Manual Visual Inspection.*

---

## 6. Test Commands

### Server
```bash
cd server
npm test
```
*Executes 9 server test files (71 tests total, 58 Lab 2 API tests) using Vitest and Supertest against PostgreSQL.*

### Client
```bash
cd client
npm test
```
*Executes 6 client test files (58 tests total, 55 Lab 2 UI tests) using Vitest, React Testing Library, and jsdom.*

### E2E
```bash
npx playwright test --config=playwright.config.ts
```
*Executes 2 E2E Playwright browser tests across Desktop (1280x800) and Mobile (375x667) viewports as configured in [`playwright.config.ts`](../../playwright.config.ts).*

---

## 7. Final Test Execution Results

```text
===============================================================================
                       TOK TICK IT — LAB 2 FINAL TEST RESULTS
===============================================================================

[SERVER]  cd server && npm test
  Test Files : 5/5 Lab 2 files passed (9/9 total server files)
  Tests      : 58/58 Lab 2 tests passed (71/71 total server tests)
  Duration   : 2.84s
  Status     : PASS

[CLIENT]  cd client && npm test
  Test Files : 3/3 Lab 2 files passed (6/6 total client files)
  Tests      : 55/55 Lab 2 tests passed (58/58 total client tests)
  Duration   : 38.17s
  Status     : PASS

[E2E]     npx playwright test --config=playwright.config.ts
  Scenarios  : 2/2 browser tests passed (Desktop 1280x800 & Mobile 375x667)
  Status     : PASS

-------------------------------------------------------------------------------
LAB 2 AUTOMATED TEST TOTAL  : 115 / 115 PASS (100%)
BROADER REPO COMBINED TOTAL : 131 / 131 PASS (Includes 16 baseline Lab 1 tests)
===============================================================================
```

---

## 8. Known Limitations & Deferred Scope

The following capabilities are intentionally excluded from the Lab 2 Requester MVP scope and are deferred to future sprint labs per the approved engineering contract:

1. **Real Authentication & Authorization (Deferred to Lab 3)**
   - Passwords, Argon2id password hashing, sessions, JWT tokens, login/logout screens, and authenticated identities are deferred to Lab 3.
   - Lab 2 strictly uses the temporary Development Requester Selection mechanism (`X-Requester-Id` header testing context) per `BR-27`.

2. **IT Staff Workflows & Ticket Lifecycle (Deferred to Lab 4)**
   - IT Staff dashboard, queue management, claiming/reassigning tickets, setting IT Priority, and status transitions beyond initial `NEW` status (Resolving, Closing, Reopening, Cancelling) are deferred to Lab 4.

3. **Public Comments & Activity Audit Trails (Deferred to Later Labs)**
   - Public Comments, Internal Notes, and Actions Taken audit trails are excluded from Lab 2 MVP scope.

4. **Advanced Infrastructure & Security Features (Out of Scope)**
   - Virus scanning on attachment uploads, rate limiting, signed download URLs, CSRF protection, and database encryption at rest are excluded from Lab 2 scope.
