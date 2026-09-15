# TokTickIT Test Plan & Acceptance Traceability: Lab 3 (Sprint 3)

- **Repository**: [Apichaya251400/TokTickIT](https://github.com/Apichaya251400/TokTickIT)  
- **Branch**: `feature/lab3-test-dd` / `lab3-staging`  
- **Document Status**: Approved Test Strategy & Traceability Matrix  

---

## 1. Test Strategy

### 1.1 Spec-Driven Development (SDD) Testing Approach

TokTickIT Sprint 3 enforces a strict **Spec-Driven Development (SDD)** architecture. Test strategy and traceability planning precede code implementation, ensuring that all authentication mechanisms, server-side role authorization guards (RBAC), IT Staff ticket queue and operational state transitions, Public Comment vs. Internal Note visibility controls, database schema migration integrity, concurrency safety rules, and Administrator user management features strictly align with Handout Section 10 & 12, `docs/lab-03/specification.md`, `docs/lab-03/api-spec.md`, and `docs/lab-03/ui-spec.md`.

Testing is structured across six required testing levels (Unit, API / Integration, UI Component, UI Style / Visual, Responsive Layout, and End-to-End E2E Workflows), complemented by automated migration testing, concurrency race condition verification, and regression testing to guarantee that existing Lab 2 Requester capabilities remain completely unbroken.

### 1.2 Six Testing Levels & Tooling Stack

| Level | Tooling | Target Location | Scope & Primary Objectives |
|---|---|---|---|
| **Unit** | Vitest | [`server/tests/unit/password.test.ts`](../../server/tests/unit/password.test.ts)<br>[`server/tests/unit/sanitizer.test.ts`](../../server/tests/unit/sanitizer.test.ts)<br>[`server/tests/unit/jwt.test.ts`](../../server/tests/unit/jwt.test.ts)<br>[`server/tests/unit/ticketNumber.test.ts`](../../server/tests/unit/ticketNumber.test.ts) | Validates isolated utility functions: password complexity validator (BR-02), XSS entity escaping sanitizer (BR-11), JWT token helper functions/blocklist, and ticket number generator format `TKT-2026-XXXXXX`. |
| **API / Integration** | Vitest + Supertest | [`server/tests/lab-03/auth.api.test.ts`](../../server/tests/lab-03/auth.api.test.ts)<br>[`server/tests/lab-03/authorization.api.test.ts`](../../server/tests/lab-03/authorization.api.test.ts)<br>[`server/tests/lab-03/migration.test.ts`](../../server/tests/lab-03/migration.test.ts)<br>[`server/tests/lab-03/requester-regression.api.test.ts`](../../server/tests/lab-03/requester-regression.api.test.ts)<br>[`server/tests/lab-03/staff-queue.api.test.ts`](../../server/tests/lab-03/staff-queue.api.test.ts)<br>[`server/tests/lab-03/staff-ticket-detail.api.test.ts`](../../server/tests/lab-03/staff-ticket-detail.api.test.ts)<br>[`server/tests/lab-03/comments-notes.api.test.ts`](../../server/tests/lab-03/comments-notes.api.test.ts)<br>[`server/tests/lab-03/users-admin.api.test.ts`](../../server/tests/lab-03/users-admin.api.test.ts) | Validates Express route controllers, Prisma PostgreSQL queries, JWT HTTP-Only cookie authentication, server-side token revocation blocklist (AC-13), explicit 401/403 RBAC matrix (`authorization.api.test.ts`), DB schema evolution & idempotent seeding (`migration.test.ts`), Requester ownership isolation under auth (`requester-regression.api.test.ts`), Status Transition Matrix & concurrent claim/update safety (`staff-ticket-detail.api.test.ts`), and Admin safety rules (`users-admin.api.test.ts`). |
| **UI Component** | Vitest + RTL + jsdom | [`client/tests/lab-03/Login.test.tsx`](../../client/tests/lab-03/Login.test.tsx)<br>[`client/tests/lab-03/Change Password.test.tsx`](../../client/tests/lab-03/Change%20Password.test.tsx)<br>[`client/tests/lab-03/StaffTicketQueue.test.tsx`](../../client/tests/lab-03/StaffTicketQueue.test.tsx)<br>[`client/tests/lab-03/StaffTicketDetail.test.tsx`](../../client/tests/lab-03/StaffTicketDetail.test.tsx)<br>[`client/tests/lab-03/User Management.test.tsx`](../../client/tests/lab-03/User%20Management.test.tsx) | Validates React component form validation, login error messages, mandatory password change redirect dialogs, staff queue search/filtering/pagination, IT Staff detail control states, comment/note rendering, and admin modal dialogs. |
| **UI Style / Visual** | RTL + Browser Inspection | `client/tests/lab-03/*` + Manual Inspection | Validates Zen Green CSS design tokens, Public Comment green borders vs. Internal Note amber alert styling (`#FEF3C7` / `#B45309`), role badges, and read-only Admin state shading. |
| **Responsive** | RTL + Playwright | [`client/tests/lab-03/StaffTicketQueue.test.tsx`](../../client/tests/lab-03/StaffTicketQueue.test.tsx), `e2e/lab-03/` | Validates desktop queue table layout (>=992px) vs mobile stacked ticket cards (<768px), collapsible mobile app shell nav, and zero horizontal page scroll across viewports. |
| **E2E** | Playwright | [`e2e/lab-03/authentication.spec.ts`](../../e2e/lab-03/authentication.spec.ts)<br>[`e2e/lab-03/staff-ticket-flow.spec.ts`](../../e2e/lab-03/staff-ticket-flow.spec.ts)<br>[`e2e/lab-03/user-administration.spec.ts`](../../e2e/lab-03/user-administration.spec.ts)<br>[`e2e/lab-03/lab2-regression.spec.ts`](../../e2e/lab-03/lab2-regression.spec.ts) | Validates complete multi-step user workflows. `authentication.spec.ts` tests login & forced password change. `staff-ticket-flow.spec.ts` tests IT Staff queue, claim, priority, status transition, comments, and notes. `user-administration.spec.ts` tests admin CRUD & safety rules. `lab2-regression.spec.ts` proves Lab 2 Requester capabilities (login -> create -> upload attachment -> view list -> view detail -> download attachment -> public comment) work seamlessly. |

---

## 2. Handout Section 10 Traceability Matrix

Every Functional Requirement (FR), Business Rule (BR), Acceptance Criterion (AC), and Concurrency Scenario is mapped in accordance with the required Handout Section 10 format with clickable working file links.

| Test ID | Type | Requirement/AC | What It Tests | Expected Result | Automated Test File | Final Status |
|---|---|---|---|---|---|---|
| **API-AUTH-01** | API | AC-01, FR-01, BR-01 | User authentication with valid credentials | Valid email/password returns 200 OK, sets HTTP-Only JWT cookie, returns user profile & role. | [`server/tests/lab-03/auth.api.test.ts`](../../server/tests/lab-03/auth.api.test.ts) | PASS |
| **API-AUTH-02** | API | AC-02, FR-02, BR-02 | Mandatory password change flag on first login | Login for user with `requiresPasswordChange = true` returns `requiresPasswordChange: true`. Protected routes block access. | [`server/tests/lab-03/auth.api.test.ts`](../../server/tests/lab-03/auth.api.test.ts) | PASS |
| **API-AUTH-03** | API | AC-13, FR-03, BR-03 | Server-side token revocation blocklist on logout | `POST /api/auth/logout` revokes token. Reusing revoked token returns `401 Unauthorized`. | [`server/tests/lab-03/auth.api.test.ts`](../../server/tests/lab-03/auth.api.test.ts) | PASS |
| **API-AUTH-04** | API | FR-04, BR-13 | Real-time DB identity and role verification (`GET /api/auth/me`) | Auth middleware verifies `isActive` and `role` against DB on every request. Deactivated user immediately loses access. | [`server/tests/lab-03/auth.api.test.ts`](../../server/tests/lab-03/auth.api.test.ts) | PASS |
| **API-AUTH-05** | API | BR-12, FR-07 | Generic unauthenticated error responses | Invalid credentials or inactive account returns generic `401 Unauthorized` without leaking account state. | [`server/tests/lab-03/auth.api.test.ts`](../../server/tests/lab-03/auth.api.test.ts) | PASS |
| **API-RBAC-01** | API | AC-04, BR-04, FR-05 | Internal Notes endpoint protection for Requesters | Requester calling `GET` or `POST /api/tickets/:id/notes` receives `403 Forbidden` without note leakage. | [`server/tests/lab-03/authorization.api.test.ts`](../../server/tests/lab-03/authorization.api.test.ts) | PASS |
| **API-RBAC-02** | API | AC-11, FR-05 | Admin user management route protection for non-Admins | Requester or IT Staff requesting `/api/admin/*` receives `403 Forbidden`. | [`server/tests/lab-03/authorization.api.test.ts`](../../server/tests/lab-03/authorization.api.test.ts) | PASS |
| **API-RBAC-03** | API | AC-17, FR-05 | Admin read-only enforcement on ticket mutation endpoints | Admin calling `PUT /api/tickets/:id/status` or `PUT /api/tickets/:id/priority` receives `403 Forbidden`. | [`server/tests/lab-03/authorization.api.test.ts`](../../server/tests/lab-03/authorization.api.test.ts) | PASS |
| **API-MIG-01** | Integration | BR-15, Section 7 | Database migration schema evolution (`RequesterUser` -> `User`) | Migrated database preserves user records, password hashes, and correct `Role` assignments. | [`server/tests/lab-03/migration.test.ts`](../../server/tests/lab-03/migration.test.ts) | PASS |
| **API-MIG-02** | Integration | BR-15, Section 7 | Idempotent database seed execution check | Running `prisma db seed` multiple times executes cleanly with zero duplicate constraint errors. | [`server/tests/lab-03/migration.test.ts`](../../server/tests/lab-03/migration.test.ts) | PASS |
| **API-REQ-01** | API | AC-03, FR-06, BR-03 | Requester ticket ownership isolation on My Tickets & Detail | Requester `GET /api/tickets/my-tickets` returns owned tickets only. Requesting non-owned ticket returns `404 Not Found`. | [`server/tests/lab-03/requester-regression.api.test.ts`](../../server/tests/lab-03/requester-regression.api.test.ts) | PASS |
| **API-REQ-02** | API | BR-15, FR-12 | Lab 2 Requester ticket creation & attachment flow under JWT Auth | Requester creates ticket and uploads attachment using verified JWT session identity without `X-Requester-Id`. | [`server/tests/lab-03/requester-regression.api.test.ts`](../../server/tests/lab-03/requester-regression.api.test.ts) | PASS |
| **API-QUEUE-01** | API | AC-05, FR-08, BR-14 | IT Staff Queue query filtering by status, priority, and `owner=my_queue` | `GET /api/tickets` with `status`, `requestedPriority`, `itPriority`, and `owner=my_queue` returns filtered queue records. | [`server/tests/lab-03/staff-queue.api.test.ts`](../../server/tests/lab-03/staff-queue.api.test.ts) | PASS |
| **API-QUEUE-02** | API | AC-16, BR-14 | Queue query parameter validation & default safety fallbacks | Invalid `sortBy` or out-of-bounds `page` defaults safely to `createdAt desc` page 1 or returns `400 Bad Request`. | [`server/tests/lab-03/staff-queue.api.test.ts`](../../server/tests/lab-03/staff-queue.api.test.ts) | PASS |
| **API-OPS-01** | API | AC-06, FR-09 | IT Staff ticket claim & ownership reassignment | `POST /api/tickets/:id/claim` sets `ownerId` to current IT Staff. `PUT /api/tickets/:id/assign` reassigns to active staff/admin. | [`server/tests/lab-03/staff-ticket-detail.api.test.ts`](../../server/tests/lab-03/staff-ticket-detail.api.test.ts) | PASS |
| **API-OPS-02** | API | AC-07, FR-10 | Status Transition Matrix enforcement by IT Staff | Permitted transitions succeed (e.g. `NEW` -> `OPEN`). Prohibited transitions (e.g. `NEW` -> `CLOSED`) return `400 Bad Request`. | [`server/tests/lab-03/staff-ticket-detail.api.test.ts`](../../server/tests/lab-03/staff-ticket-detail.api.test.ts) | PASS |
| **API-OPS-03** | API | AC-14, FR-13, BR-05 | Requester resolve/reopen signalling without status mutation | Requester calling `resolve-indicator` or `reopen-request` sets timestamp indicator without mutating `currentStatus`. | [`server/tests/lab-03/staff-ticket-detail.api.test.ts`](../../server/tests/lab-03/staff-ticket-detail.api.test.ts) | PASS |
| **API-CONCUR-01** | API | Concurrency / BR-03 | Concurrent ticket claim race condition handling | Two IT Staff members attempt `POST /api/tickets/:id/claim` simultaneously. First succeeds (200 OK), second gets `409 Conflict`. | [`server/tests/lab-03/staff-ticket-detail.api.test.ts`](../../server/tests/lab-03/staff-ticket-detail.api.test.ts) | PASS |
| **API-CONCUR-02** | API | Concurrency / BR-10 | Concurrent status transition race condition handling | Two simultaneous status updates on same ticket evaluate atomically. Conflicting transition receives `409 Conflict` or `400`. | [`server/tests/lab-03/staff-ticket-detail.api.test.ts`](../../server/tests/lab-03/staff-ticket-detail.api.test.ts) | PASS |
| **API-NOTE-01** | API | AC-08, FR-11, BR-04 | IT Staff & Admin Internal Note creation and retrieval | IT Staff/Admin post append-only Internal Notes. Notes are retrieved correctly and isolated from Requesters. | [`server/tests/lab-03/comments-notes.api.test.ts`](../../server/tests/lab-03/comments-notes.api.test.ts) | PASS |
| **API-NOTE-02** | API | AC-15, BR-11 | Comment/Note input validation (1-2000 chars) & XSS entity escaping | Whitespace or >2000 char content returns `400 Bad Request`. HTML tags (`<script>`) are safely escaped into HTML entities. | [`server/tests/lab-03/comments-notes.api.test.ts`](../../server/tests/lab-03/comments-notes.api.test.ts) | PASS |
| **API-ADM-01** | API | AC-09, FR-14, BR-07 | Admin user creation duplicate email validation | Creating account with pre-existing email returns `409 Conflict` error envelope. | [`server/tests/lab-03/users-admin.api.test.ts`](../../server/tests/lab-03/users-admin.api.test.ts) | PASS |
| **API-ADM-02** | API | AC-10, FR-15, BR-08, BR-09 | Admin safety guards (self-deactivation & last Admin protection) | Admin attempting self-deactivation or removing last active Admin receives `400 Bad Request` / `403 Forbidden`. | [`server/tests/lab-03/users-admin.api.test.ts`](../../server/tests/lab-03/users-admin.api.test.ts) | PASS |
| **API-ADM-03** | API | BR-10, FR-14 | Admin password reset automatically sets `requiresPasswordChange = true` | Admin resetting user password automatically sets target account `requiresPasswordChange = true`. | [`server/tests/lab-03/users-admin.api.test.ts`](../../server/tests/lab-03/users-admin.api.test.ts) | PASS |
| **UI-LOG-01** | UI | AC-01, AC-02 | Login form rendering, client validation, and password change redirect | Renders login controls, displays client validation errors, and redirects to Password Change modal when required. | [`client/tests/lab-03/Login.test.tsx`](../../client/tests/lab-03/Login.test.tsx) | PASS |
| **UI-PWD-01** | UI | AC-02, BR-02 | Mandatory Password Change form validation & strength meter | Enforces password complexity rules, checks password match, and submits new password to backend. | [`client/tests/lab-03/Change Password.test.tsx`](../../client/tests/lab-03/Change%20Password.test.tsx) | PASS |
| **UI-QUEUE-01** | UI | AC-05, AC-16 | IT Staff Queue search, filter dropdowns, tabs, and pagination | Renders queue table, updates query state on filter change, and supports page navigation. | [`client/tests/lab-03/StaffTicketQueue.test.tsx`](../../client/tests/lab-03/StaffTicketQueue.test.tsx) | PASS |
| **UI-DET-01** | UI | AC-06, AC-07, AC-08 | IT Staff Detail view controls, status transition buttons, and note rendering | Renders claim/reassign dropdowns, IT priority selector, permitted status buttons, and amber note boxes (`#FEF3C7`). | [`client/tests/lab-03/StaffTicketDetail.test.tsx`](../../client/tests/lab-03/StaffTicketDetail.test.tsx) | PASS |
| **UI-ADM-01** | UI | AC-09, AC-10, AC-14 | Admin User Management table, user creation modal, and activation toggle | Renders user list, role filter, creation dialog with role selector, and active status toggle buttons. | [`client/tests/lab-03/User Management.test.tsx`](../../client/tests/lab-03/User%20Management.test.tsx) | PASS |
| **E2E-AUTH-01** | E2E | AC-01, AC-02 | End-to-end authentication & forced password change workflow | User logs in with initial password, forced into password change screen, updates password, and gains full system access. | [`e2e/lab-03/authentication.spec.ts`](../../e2e/lab-03/authentication.spec.ts) | PASS |
| **E2E-STAFF-01** | E2E | AC-05..08, AC-14 | End-to-end IT Staff ticket processing & communication workflow | Staff claims ticket from queue, sets IT Priority to HIGH, transitions status OPEN -> IN_PROGRESS, posts note & comment. | [`e2e/lab-03/staff-ticket-flow.spec.ts`](../../e2e/lab-03/staff-ticket-flow.spec.ts) | PASS |
| **E2E-ADM-01** | E2E | AC-09..11 | End-to-end Admin user management & safety guard verification | Admin creates new IT Staff account, resets initial password, verifies self-deactivation block, and tests RBAC isolation. | [`e2e/lab-03/user-administration.spec.ts`](../../e2e/lab-03/user-administration.spec.ts) | PASS |
| **E2E-REG-01** | E2E | AC-12, BR-15 | End-to-end Lab 2 Requester capability regression flow | Requester logs in, creates ticket, uploads image, views list/detail, downloads file, and posts public comment without error. | [`e2e/lab-03/lab2-regression.spec.ts`](../../e2e/lab-03/lab2-regression.spec.ts) | PASS |

---

## 3. Business Rules (BR) Traceability Summary

Every Business Rule (BR-01 through BR-15) defined in `docs/lab-03/specification.md` is mapped to its enforcement mechanism and target test file below.

| BR ID | Business Rule Summary | Enforcement Mechanism | Target Test File | Verification Assertion |
|---|---|---|---|---|
| **BR-01** | Active account credential verification | Auth Service & Auth Middleware | [`server/tests/lab-03/auth.api.test.ts`](../../server/tests/lab-03/auth.api.test.ts) | Deactivated accounts (`isActive = false`) return `401 Unauthorized` on login attempt. |
| **BR-02** | Mandatory initial password change complexity | Password Utility & Auth Middleware | [`server/tests/lab-03/auth.api.test.ts`](../../server/tests/lab-03/auth.api.test.ts)<br>[`server/tests/unit/password.test.ts`](../../server/tests/unit/password.test.ts) | Enforces min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char. Blocks access to protected routes until updated. |
| **BR-03** | Identity from session token (no client ID spoofing) | Auth Middleware (`req.user`) | [`server/tests/lab-03/staff-queue.api.test.ts`](../../server/tests/lab-03/staff-queue.api.test.ts)<br>[`server/tests/lab-03/requester-regression.api.test.ts`](../../server/tests/lab-03/requester-regression.api.test.ts) | Ignores any client-supplied user ID in headers/body; relies strictly on verified JWT token payload. |
| **BR-04** | Public Comments vs. Internal Notes visibility | Notes Controller RBAC Guard | [`server/tests/lab-03/comments-notes.api.test.ts`](../../server/tests/lab-03/comments-notes.api.test.ts)<br>[`server/tests/lab-03/authorization.api.test.ts`](../../server/tests/lab-03/authorization.api.test.ts) | Public comments visible to all 3 roles. Internal notes rejected with `403 Forbidden` for Requester accounts. |
| **BR-05** | Requester signalling vs. IT Staff status authority | Ticket Controller Guard | [`server/tests/lab-03/staff-ticket-detail.api.test.ts`](../../server/tests/lab-03/staff-ticket-detail.api.test.ts) | Requesters can post resolve/reopen indicators but receive `403 Forbidden` on direct status mutation attempts. |
| **BR-06** | Single role assignment per user | Database Schema Constraint (`Role` Enum) | [`server/tests/lab-03/users-admin.api.test.ts`](../../server/tests/lab-03/users-admin.api.test.ts) | Rejects multi-role assignments or invalid role strings during user creation/edit. |
| **BR-07** | Unique email address constraint | Prisma Schema (`@unique`) & Admin Service | [`server/tests/lab-03/users-admin.api.test.ts`](../../server/tests/lab-03/users-admin.api.test.ts) | Creating or updating user with existing email returns `409 Conflict`. |
| **BR-08** | Administrator self-deactivation protection | Admin Service Guard | [`server/tests/lab-03/users-admin.api.test.ts`](../../server/tests/lab-03/users-admin.api.test.ts) | Admin deactivating `req.user.id` returns `400 Bad Request` / `403 Forbidden`. |
| **BR-09** | Protection for last active Administrator | Admin Service Guard | [`server/tests/lab-03/users-admin.api.test.ts`](../../server/tests/lab-03/users-admin.api.test.ts) | Query count of active Admins before deactivation/role change; rejects if count <= 1. |
| **BR-10** | Admin password reset sets `requiresPasswordChange` | Admin Service | [`server/tests/lab-03/users-admin.api.test.ts`](../../server/tests/lab-03/users-admin.api.test.ts) | Admin setting new password automatically updates target user's `requiresPasswordChange = true`. |
| **BR-11** | Comment/Note length bounding & XSS escaping | Sanitizer Utility & Validation Helper | [`server/tests/lab-03/comments-notes.api.test.ts`](../../server/tests/lab-03/comments-notes.api.test.ts)<br>[`server/tests/unit/sanitizer.test.ts`](../../server/tests/unit/sanitizer.test.ts) | Length 1-2000 enforced (`400 Bad Request` if invalid). HTML entities (`<script>`) safely escaped. |
| **BR-12** | Generic unauthenticated error responses | Auth Controller Error Handler | [`server/tests/lab-03/auth.api.test.ts`](../../server/tests/lab-03/auth.api.test.ts) | Wrong email or wrong password both return identical generic `401 Unauthorized` message. |
| **BR-13** | Database verification on every API request | Auth Middleware DB Query | [`server/tests/lab-03/auth.api.test.ts`](../../server/tests/lab-03/auth.api.test.ts) | Auth middleware queries DB for `isActive` and `role` on every request. Admin deactivating account immediately revokes access on next request. |
| **BR-14** | Safe handling of invalid query parameters | Queue Controller Query Parser | [`server/tests/lab-03/staff-queue.api.test.ts`](../../server/tests/lab-03/staff-queue.api.test.ts) | Invalid status/sort parameter defaults safely to `createdAt desc` or returns `400 Bad Request`. |
| **BR-15** | Lab 2 Requester features continuity | Ticket Routes & Auth Session | [`server/tests/lab-03/requester-regression.api.test.ts`](../../server/tests/lab-03/requester-regression.api.test.ts)<br>[`e2e/lab-03/lab2-regression.spec.ts`](../../e2e/lab-03/lab2-regression.spec.ts) | Ticket creation, listing, attachment upload/download function seamlessly under verified JWT identity without `X-Requester-Id`. |

---

## 4. Planned Test Suites & File Structure Breakdown

### 4.0 Unit Test Suites (`server/tests/unit/`)

1. **`password.test.ts`**:
   - Validates password complexity validator helper function against BR-02 requirements:
     - Accepts valid complex passwords (min 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special character).
     - Rejects passwords under 8 characters.
     - Rejects passwords missing uppercase, lowercase, digit, or special character.
2. **`sanitizer.test.ts`**:
   - Validates HTML entity escaping utility against BR-11 requirements:
     - Escapes dangerous tags (`<script>`, `<iframe>`, `onclick=`) into safe HTML entities (`&lt;script&gt;`).
     - Preserves clean text content and spacing without corrupting valid strings.
3. **`jwt.test.ts`**:
   - Validates JWT payload signing, decoding, and expiration handling:
     - Ensures token payload includes `userId`, `email`, and `role`.
     - Validates token expiration duration set to 15 minutes.
     - Validates server-side token revocation blocklist check functions.
4. **`ticketNumber.test.ts`**:
   - Validates `TKT-2026-XXXXXX` ticket number generation and string trimming utilities.

### 4.1 Server API Integration, Migration & Concurrency Test Suites (`server/tests/lab-03/`)

1. **`auth.api.test.ts`**:
   - `POST /api/auth/login` (active user success, inactive user 401, wrong credentials 401, generic errors).
   - `POST /api/auth/change-password` (mandatory password change requirement, complexity rules, clearing `requiresPasswordChange`).
   - `POST /api/auth/logout` (token revocation blocklist check, post-logout requests return 401).
   - `GET /api/auth/me` (real-time DB check for `isActive` and `role`, immediate deactivation enforcement per BR-13).

2. **`authorization.api.test.ts`**:
   - Mandatory RBAC Matrix verification suite across all endpoints:
     - Tests explicit `401 Unauthorized` for unauthenticated requests across protected routes.
     - Tests explicit `403 Forbidden` for Requester accounts attempting IT Staff/Admin routes (`/api/tickets`, `/api/tickets/:id/notes`, `/api/admin/*`).
     - Tests explicit `403 Forbidden` for IT Staff accounts attempting Admin routes (`/api/admin/*`).
     - Tests explicit `403 Forbidden` for Admin accounts attempting operational status transitions or IT priority updates (`PUT /api/tickets/:id/status`, `PUT /api/tickets/:id/priority`).

3. **`migration.test.ts`**:
   - Validates database schema evolution from Lab 2 `RequesterUser` model to unified Sprint 3 `User` model.
   - Idempotent database seed execution check: running `prisma db seed` multiple times succeeds with zero duplicate key errors.
   - Ticket ownership integrity check: verifies that pre-existing Lab 2 tickets preserve correct `requesterId`/`ownerId` alignment and attachment links after migration.

4. **`requester-regression.api.test.ts`**:
   - `GET /api/tickets/my-tickets` (Requester list owned tickets under JWT session identity).
   - `POST /api/tickets` (Create ticket using authenticated Requester identity).
   - `GET /api/tickets/:id` (Open owned ticket detail; non-owned ticket returns 404 per AC-03).
   - `POST /api/tickets/:id/attachments` & `GET /api/attachments/:id/download` (Attachment upload/download under JWT session identity).
   - Verifies 100% backward compatibility for Lab 2 features without client-supplied `X-Requester-Id` headers (BR-15).

5. **`staff-queue.api.test.ts`**:
   - `GET /api/tickets` (IT Staff access allow, Requester/Admin access deny/allow rules per matrix).
   - Search filtering by keyword `q` in ticket number, summary, and description.
   - Filter dropdowns: `requestedPriority`, `itPriority`, `status`, ownership (`all`, `my_queue`, `unassigned`).
   - Pagination parameters (`page`, `limit`) and sorting (`sortBy`, `sortDir`).
   - Query validation & fallback handling for invalid parameters (BR-14).

6. **`staff-ticket-detail.api.test.ts`**:
   - `POST /api/tickets/:id/claim` (IT Staff ownership claim).
   - `PUT /api/tickets/:id/assign` (IT Staff/Admin ownership reassignment).
   - `PUT /api/tickets/:id/priority` (IT Staff IT Priority update; Admin/Requester 403 Forbidden).
   - `PUT /api/tickets/:id/status` (Status Transition Matrix enforcement; Admin/Requester 403 Forbidden).
   - `POST /api/tickets/:id/resolve-indicator` & `POST /api/tickets/:id/reopen-request` (Requester signalling without status mutation).
   - **`API-CONCUR-01` Race Condition Test**: Simulates simultaneous ticket claim requests from two IT Staff members (`POST /api/tickets/:id/claim`). Asserts that the first request succeeds (`200 OK`) and updates `ownerId`, while the second request is safely rejected with `409 Conflict` (or safe state warning).
   - **`API-CONCUR-02` Race Condition Test**: Simulates simultaneous status transition requests on the same ticket to verify atomic status updates without data corruption.

7. **`comments-notes.api.test.ts`**:
   - `GET /api/tickets/:id/comments` & `POST /api/tickets/:id/comments` (Public comments visible to Requester owner, IT Staff, Admin).
   - `GET /api/tickets/:id/notes` & `POST /api/tickets/:id/notes` (Internal notes allowed for IT Staff and Admin; 403 Forbidden for Requester).
   - Content boundary validation (1 to 2000 characters) and XSS HTML entity escaping (BR-11).

8. **`users-admin.api.test.ts`**:
   - `GET /api/admin/users` (RBAC guard: Admin allowed, Requester/IT Staff 403 Forbidden).
   - `POST /api/admin/users` (User creation, single role assignment, duplicate email 409 Conflict).
   - `PUT /api/admin/users/:id` (User detail edit, activation/deactivation).
   - `POST /api/admin/users/:id/password` (Admin password reset, sets `requiresPasswordChange = true`).
   - Admin safety guards (self-deactivation block BR-08, last active Admin protection BR-09).

### 4.2 Client Component Test Suites (`client/tests/lab-03/`)

1. **`Login.test.tsx`**:
   - Renders Login card with email/password input fields.
   - Validates client-side form validation and server error banner rendering.
   - Tests successful login submission and session token storage.

2. **`Change Password.test.tsx`**:
   - Renders mandatory Password Change dialog when `requiresPasswordChange: true`.
   - Validates real-time password strength meter and confirm password match validation.
   - Tests successful password change submission and clear of password change flag.

3. **`StaffTicketQueue.test.tsx`**:
   - Renders IT Staff Queue with search bar, filter dropdowns (`requestedPriority`, `itPriority`, `status`, `owner`), ownership tabs, and paginated table.
   - Tests switching desktop table layout to responsive mobile card stack (<768px).
   - Validates query state synchronization and pagination controls.

4. **`StaffTicketDetail.test.tsx`**:
   - Renders IT Staff Detail view with Owner claim/reassign controls, IT Priority dropdown, and permitted Status transition buttons.
   - Renders Public Comment list (green accent) and Internal Note list (amber background `#FEF3C7` with lock icon).
   - Renders read-only view state when accessed by Administrator user.

5. **`User Management.test.tsx`**:
   - Renders User Management table with role filters and search bar.
   - Tests user creation modal dialog with role selector (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`).
   - Tests user activation/deactivation toggle buttons and confirmation dialogs.
   - Tests Admin password reset modal dialog.

### 4.3 End-to-End Playwright Workflows (`e2e/lab-03/`)

1. **`authentication.spec.ts`**:
   - **Flow 1: Initial Login & Mandatory Password Change**: Log in with seeded initial credentials (`admin@toktick.it`), verify forced password change prompt, update password, and verify successful entry into system.

2. **`staff-ticket-flow.spec.ts`**:
   - **Flow 2: IT Staff Queue & Operational Lifecycle**: Log in as IT Staff (`staff@toktick.it`), locate a `NEW` ticket in queue, claim ownership, transition status to `OPEN` -> `IN_PROGRESS`, set IT Priority to `HIGH`, post an Internal Note, and post a Public Comment.

3. **`user-administration.spec.ts`**:
   - **Flow 3: Admin User Management & Safety Rules**: Log in as Admin (`admin@toktick.it`), create new IT Staff account, reset initial password, verify self-deactivation block, and verify non-Admin access to user management is denied (`403 Forbidden`).

4. **`lab2-regression.spec.ts`**:
   - **Flow 0: Lab 2 Requester Capabilities Regression**: Log in as authenticated Requester (`requester@toktick.it`), create a new ticket with summary and description, upload an image attachment, verify ticket appears on My Tickets list with correct badge, open Ticket Detail view, download the attachment, post a Public Comment, and confirm that all core Lab 2 Requester features operate flawlessly under the new JWT authentication system.

---

## 5. Summary Matrix of Requirements to Test Files

```mermaid
flowchart TD
    subgraph "Specifications"
        FR[FR-01 to FR-15]
        BR[BR-01 to BR-15]
        AC[AC-01 to AC-17]
    end

    subgraph "Unit Tests"
        UnitTest["server/tests/unit/ (password, sanitizer, jwt, ticketNumber)"]
    end

    subgraph "Backend API & Migration Tests"
        AuthTest["server/tests/lab-03/auth.api.test.ts"]
        AuthzTest["server/tests/lab-03/authorization.api.test.ts"]
        MigrateTest["server/tests/lab-03/migration.test.ts"]
        ReqRegTest["server/tests/lab-03/requester-regression.api.test.ts"]
        QueueTest["server/tests/lab-03/staff-queue.api.test.ts"]
        OpsTest["server/tests/lab-03/staff-ticket-detail.api.test.ts"]
        NotesTest["server/tests/lab-03/comments-notes.api.test.ts"]
        AdminTest["server/tests/lab-03/users-admin.api.test.ts"]
    end

    subgraph "Frontend UI Component Tests"
        LoginUI["client/tests/lab-03/Login.test.tsx"]
        PwdUI["client/tests/lab-03/Change Password.test.tsx"]
        QueueUI["client/tests/lab-03/StaffTicketQueue.test.tsx"]
        DetailUI["client/tests/lab-03/StaffTicketDetail.test.tsx"]
        AdminUI["client/tests/lab-03/User Management.test.tsx"]
    end

    subgraph "E2E Workflows"
        E2EAuth["e2e/lab-03/authentication.spec.ts"]
        E2EStaff["e2e/lab-03/staff-ticket-flow.spec.ts"]
        E2EAdmin["e2e/lab-03/user-administration.spec.ts"]
        E2EReg["e2e/lab-03/lab2-regression.spec.ts"]
    end

    AC --> "Backend API & Migration Tests"
    AC --> "Frontend UI Component Tests"
    BR --> "Unit Tests"
    BR --> "Backend API & Migration Tests"
    FR --> "E2E Workflows"
```
