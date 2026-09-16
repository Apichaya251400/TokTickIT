# Sprint 3 Engineering Specification: TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens

- **System Name**: TokTickIT
- **Sprint / Lab**: Lab 3 (Sprint 3)
- **Document Status**: Approved Engineering Specification
- **Repository Branch**: `feature/lab3-spec-dd`

---

## 1. Sprint Goal

Deliver a production-ready authentication and role-based operational increment for TokTickIT. This sprint replaces the temporary Lab 2 Development Requester selector with secure user authentication, mandatory first-login password changes, server-side role-based authorization for three distinct roles (`Requester`, `IT Staff`, and `Administrator`), an operational IT Staff Ticket Queue and Detail workflow featuring distinct Public Comments and role-restricted Internal Notes, and a minimalist Administrator User Management interface, while fully preserving all completed Lab 2 Requester capabilities and ticket data.

---

## 2. Stakeholder Request Interpretation

The stakeholder requires TokTickIT to transition from a development prototype using mock identities to a secure, role-restricted operational system:
- **Authentication & Security**: Users authenticate using email and password credentials. Passwords must never be stored in plaintext. Users assigned an initial password must set a new valid password at first login before accessing normal system features. Logout MUST invalidate authenticated access.
- **Requester Continuity**: Requesters manage tickets under their authenticated identity. They can post Public Comments and indicate that a problem appears resolved or request a reopen, but formal resolution remains the responsibility of IT Staff.
- **IT Staff Workflow**: IT Staff require a queue interface to locate, prioritize, claim, or reassign tickets, update IT Priority, perform permitted status transitions, communicate with Requesters via Public Comments, and record private operational observations in Internal Notes.
- **Minimalist User Administration**: Administrators require a simple interface to list users, create accounts with one assigned role, update basic user information, activate or deactivate accounts, and set new initial passwords. Administrators can also view ticket details and internal notes in a read-only capacity and be assigned ticket ownership when needed per Handout Section 4.5.
- **Security & Design**: All endpoints and screens must enforce role and resource ownership checks at the backend (hiding UI buttons is insufficient). The Zen Green design language from Lab 2 must be preserved.

---

## 3. Scope

### 3.1 Included Scope
- Secure email/password authentication, logout session invalidation via server-side token blocklist, and current user identity retrieval (`/auth/me`).
- Mandatory first-login password change for accounts flagged with initial passwords (`requiresPasswordChange = true`).
- Three strictly single-assignment roles: `Requester`, `IT Staff`, and `Administrator`.
- Server-side Role-Based Access Control (RBAC) and Requester resource ownership protection across all REST endpoints.
- Database schema evolution migrating Lab 2 `RequesterUser` records into a unified `User` model, adding `PublicComment` and `InternalNote` entities, and adding `ownerId`, `itPriority`, `requesterResolvedIndicatedAt`, and `requesterReopenRequestedAt` to `Ticket`.
- Idempotent database seed script with active/inactive accounts across all roles, tickets, comments, and internal notes.
- IT Staff Ticket Queue with search, filtering (by requested/IT priority, status, ownership), sorting, pagination, and responsive Desktop/Mobile views.
- IT Staff Ticket Detail interface for ownership claiming/reassignment, IT Priority updates, permitted status transitions, and visually distinct Public Comments vs. Internal Notes.
- Requester Ticket Detail extensions for posting Public Comments, indicating "Problem Appears Resolved", and requesting ticket reopening.
- Administrator User Management interface (list, search, filter by role, create, edit, activate/deactivate, reset initial password, and admin safety rules).
- Comprehensive automated test suite (Unit, API Integration, Client Component, and Playwright E2E including Lab 2 regression).

### 3.2 Explicitly Excluded Scope (ห้ามทำ)
- Email invitations, password-reset emails, multi-factor authentication (MFA), social login, or SSO.
- Self-registration or Requester-created accounts.
- "Actions Taken" by IT Staff (deferred to Lab 4).
- Formal SLA calculation, escalation rules, or notification services.
- Analytics dashboards or KPI charts beyond queue counts.
- Multi-tenant organizations, departments, or customer administration.
- Multiple roles per user (strictly 1 role per user).
- User account deletion, bulk user operations, user import/export, or account audit history.
- Advanced Admin list features (mandatory pagination, multi-column sorting, multiple simultaneous filters).
- Self-deactivation by Administrators, or deactivation/role modification of the last active Administrator.

---

## 4. Functional Requirements (FR)

### Authentication & Session Management
- **FR-01**: The system MUST authenticate active users via valid email address and password credentials.
- **FR-02**: The system MUST require users with `requiresPasswordChange = true` to set a new valid password before entering normal application screens.
- **FR-03**: The system MUST provide a secure logout mechanism that invalidates authenticated sessions/tokens via server-side token blocklist.
- **FR-04**: The system MUST provide a current-user endpoint (`GET /api/auth/me`) returning the authenticated user's profile and role.

### Authorization & Security
- **FR-05**: The system MUST enforce server-side role authorization (RBAC) on all protected endpoints according to the Operation-level Authorization Matrix.
- **FR-06**: The system MUST enforce Requester ownership isolation so Requesters can only access or modify their own tickets and attachments.
- **FR-07**: The system MUST return generic authentication error messages and avoid leaking resource existence on forbidden (403) or unauthenticated (401) requests.

### IT Staff Ticket Queue & Detail Operations
- **FR-08**: The system MUST provide IT Staff with a searchable, filterable, sortable, and paginated Ticket Queue.
- **FR-09**: The system MUST allow IT Staff and Administrators to claim unassigned tickets or reassign ticket ownership to active IT Staff or Administrator users.
- **FR-10**: The system MUST allow IT Staff to update IT Priority and perform permitted status transitions according to the Status Transition Matrix.
- **FR-11**: The system MUST allow posting append-only Public Comments (visible to Requester, IT Staff, Admin) and Internal Notes (visible ONLY to IT Staff and Admin).

### Requester Workflow & Regression
- **FR-12**: The system MUST maintain all Lab 2 ticket creation, viewing, and attachment features using the authenticated Requester identity without the development selector.
- **FR-13**: The system MUST allow Requesters to post Public Comments on their owned tickets, indicate "Problem Appears Resolved", or request a reopen via dedicated signalling endpoints.

### Administrator User Management
- **FR-14**: The system MUST provide Administrators with a User Management interface to list, search, filter by role, create, edit basic details, activate/deactivate, and set new initial passwords for user accounts.
- **FR-15**: The system MUST reject user creation/updates with duplicate emails, block Administrator self-deactivation, and prevent removing the last active Administrator.

---

## 5. Business Rules (BR)

### Security & Password Rules
- **BR-01**: Only active users (`isActive = true`) with valid credentials may authenticate. Inactive account login attempts MUST be rejected with a generic safe error (`401 Unauthorized`).
- **BR-02**: A user marked as requiring a password change (`requiresPasswordChange = true`) CANNOT access normal application routes until a valid new password meeting complexity criteria (minimum 8 characters, at least 1 uppercase letter, 1 lowercase letter, 1 number, and 1 special character, matching UI mockup) is saved.
- **BR-03**: The authenticated user identity (from session/token), NOT any client-supplied ID, determines resource ownership for Requester operations.
- **BR-04**: Public Comments are append-only and visible to Requester (ticket owner), IT Staff, and Administrator. Internal Notes are append-only and visible ONLY to IT Staff and Administrator. Requests for Internal Notes from Requester accounts MUST be rejected with `403 Forbidden` without exposing note content.
- **BR-05**: A Requester may indicate that a reported problem appears resolved (via `POST /api/tickets/:id/resolve-indicator`) or request a reopen (via `POST /api/tickets/:id/reopen-request`), but CANNOT formally update ticket status to `RESOLVED`, `CLOSED`, or `REOPENED`. Formal status transition MUST be performed by IT Staff.

### Administrator Safety Rules
- **BR-06**: Each user account MUST be assigned exactly one permitted role (`REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`). Multiple role assignment is prohibited.
- **BR-07**: Email addresses MUST be unique across all user accounts. Attempting to create or update an account with an existing email MUST return a `409 Conflict` error.
- **BR-08**: An Administrator CANNOT deactivate their own account while logged in.
- **BR-09**: The system MUST prevent deactivating or changing the role of the last active Administrator account in the system.
- **BR-10**: Setting a new initial password by an Administrator MUST automatically set `requiresPasswordChange = true` for that account. User deletion is prohibited; account removal MUST use deactivation (`isActive = false`).

### Comments, Notes & Input Validation Rules
- **BR-11**: Empty or whitespace-only content for Public Comments and Internal Notes MUST be rejected with `400 Bad Request`. Content length MUST be bounded (1 to 2000 characters). All comment and note content MUST be sanitized against XSS (HTML entity escaping) before safe rendering.

### Login Attempts, Inactivity & Regression Rules
- **BR-12**: Invalid login attempts MUST return generic error `401 Unauthorized` without exposing whether the email or password was incorrect. Inactive accounts (`isActive = false`) MUST also return `401 Unauthorized` without exposing account existence.
- **BR-13**: `GET /api/auth/me` returns the current authenticated user's state. Auth middleware verifies `isActive` and `role` against the database on every protected request (rather than solely relying on static JWT payload claims), ensuring account deactivation or role modification by an Administrator takes effect immediately on the target user's next API request verification per BR-13.
- **BR-14**: Invalid query parameters (e.g. invalid status enum or sort field) MUST be handled gracefully by defaulting to standard defaults (`createdAt desc`, page 1) or returning `400 Bad Request` with safe validation message.
- **BR-15**: All Lab 2 Ticket and Attachment API contracts MUST continue to function seamlessly using the authenticated session identity, completely eliminating reliance on client-supplied `X-Requester-Id` headers.
- **BR-16**: Concurrent operations targeting the same ticket resource (such as two IT Staff members attempting `POST /api/tickets/:id/claim` simultaneously, or simultaneous status transition attempts) MUST be evaluated atomically. The first request to process succeeds (`200 OK`) and mutates resource state; subsequent conflicting requests MUST be rejected with `409 Conflict` without data corruption or partial state updates.

### Operation-level Authorization Matrix

| Operation / Feature | Requester | IT Staff | Administrator |
|---|---|---|---|
| Authenticate (Login / Logout / Current User) | Allow | Allow | Allow |
| Change Initial Password | Allow | Allow | Allow |
| Create Own Ticket | Allow | Deny | Deny |
| View / Manage Owned Tickets & Attachments | Allow (Ownership) | Deny | Deny |
| Open Own Ticket Detail (`/tickets/:id`) | Allow (Ownership) | Allow | Allow (Read-Only) |
| View IT Staff Ticket Queue (`/staff/queue`) | Deny | Allow | Deny (Explicit) |
| Open IT Staff Ticket Detail View (`/staff/tickets/:id`) | Deny | Allow | Allow (Read-Only + Notes/Comments) |
| Claim / Reassign Ticket Ownership | Deny | Allow | Allow (Per Handout §4.5) |
| Update IT Priority | Deny | Allow | Deny (Explicit) |
| Execute Permitted Status Transitions | Deny | Allow | Deny (Explicit) |
| Post Public Comment | Allow (Ownership) | Allow | Allow |
| View Public Comments | Allow (Ownership) | Allow | Allow |
| Post Internal Note | Deny | Allow | Allow (Per Handout BR-04) |
| View Internal Notes | Deny | Allow | Allow (Per Handout BR-04) |
| Indicate "Problem Appears Resolved" | Allow (Ownership) | Deny | Deny |
| Request Ticket Reopen (after `RESOLVED` / `CLOSED`) | Allow (Ownership) | Deny | Deny |
| Admin User Management (List/Search/Create/Edit/Reset Password) | Deny | Deny | Allow |

> [!IMPORTANT]
> Administrator and IT Staff responsibilities remain conceptually separate. Administrators manage User accounts; IT Staff manage Ticket workflows. Per Handout Section 4.5 and BR-04, Administrators may open Ticket Detail in a read-only capacity, view and post Internal Notes and Public Comments, and be assigned Ticket Ownership, but DO NOT perform operational status transitions or IT Priority changes.

### Status Transition Matrix

| Current Status | Permitted Next Statuses | Permitted Action by IT Staff | Permitted Action by Requester |
|---|---|---|---|
| `NEW` | `OPEN`, `CANCELLED` | Transition to `OPEN` or `CANCELLED` | None |
| `OPEN` | `IN_PROGRESS`, `CANCELLED` | Transition to `IN_PROGRESS` or `CANCELLED` | None |
| `IN_PROGRESS` | `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED` | Transition to `WAITING_FOR_REQUESTER`, `RESOLVED`, or `CANCELLED` | Send "Problem Appears Resolved" indicator (does NOT change status) |
| `WAITING_FOR_REQUESTER` | `IN_PROGRESS`, `RESOLVED`, `CANCELLED` | Transition to `IN_PROGRESS`, `RESOLVED`, or `CANCELLED` | Post Public Comment; send "Problem Appears Resolved" indicator (does NOT change status) |
| `RESOLVED` | `CLOSED`, `REOPENED` | Transition to `CLOSED` or `REOPENED` | Send Reopen request via `POST /api/tickets/:id/reopen-request` (does NOT change status) |
| `CLOSED` | `REOPENED` | Transition to `REOPENED` | Send Reopen request via `POST /api/tickets/:id/reopen-request` (does NOT change status) |
| `REOPENED` | `IN_PROGRESS`, `CANCELLED` | Transition to `IN_PROGRESS` or `CANCELLED` | None |
| `CANCELLED` | *(Terminal State — no further transitions)* | None | None |

---

## 6. UI Specification Summary

- **Design Language**: Zen Green Theme (reusing tokens, cards, badges, buttons, typography from Lab 2).
- **Application Shell**: Header bar displaying Authenticated User Name, Role Badge, Logout button, and role-permitted navigation links (`My Tickets`, `IT Queue`, `User Management`). The development selector is completely removed.
- **Login & Password Change**: Centered card layout with clean validation, busy states, and password strength indicators matching UI mockup.
- **IT Queue**: Zen Green table layout on desktop, switching to responsive card layout on mobile, with search input, requested/IT priority filter dropdowns, status filter dropdown, ownership filter tabs, and pagination.
- **IT Detail**: Form layout with editable controls for IT Staff (Owner dropdown, IT Priority dropdown, Status transition buttons) and visually distinct comment sections (Green border for Public Comments, Amber alert box with lock icon for Internal Notes). Read-only view for Admin.
- **Admin User Management**: Clean user table with search box, role filter, active toggle, and modal dialogs for account creation, editing, and initial password resets.

---

## 7. Data Changes & Migration Decisions

### 7.1 Database Schema Additions
- **`User` Model**: Replaces `RequesterUser`. Contains `id`, `name`, `email` (unique), `passwordHash`, `role` (`Role` enum), `isActive` (Boolean), `requiresPasswordChange` (Boolean, default `true` for seeded accounts), timestamps.
- **`Priority` Enum & `Ticket` Model Updates**: Defines a unified `Priority` enum (`LOW`, `MEDIUM`, `HIGH`, `URGENT`). Updates `Ticket` model so both `requestedPriority` and `itPriority` (nullable) use the `Priority` enum type. Adds `ownerId` (nullable FK to `User`), `requesterResolvedIndicatedAt` (DateTime, nullable), `requesterReopenRequestedAt` (DateTime, nullable), and expands `currentStatus` enum to 8 statuses (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`). Ticket numbers use format `TKT-2026-XXXXXX` matching Lab 2.
- **`PublicComment` Model**: `id` (UUID), `ticketId` (FK), `authorId` (FK), `content` (Text), `createdAt`.
- **`InternalNote` Model**: `id` (UUID), `ticketId` (FK), `authorId` (FK), `content` (Text), `createdAt`.

---

## 8. REST API Contract Summary

The system exposes RESTful JSON endpoints under `/api`:
- **Auth**: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`
- **Requester Tickets & Attachments**: `GET /api/tickets/my-tickets`, `POST /api/tickets`, `GET /api/tickets/:id`, `POST /api/tickets/:id/attachments`, `GET /api/attachments/:id/download`
- **IT Staff Queue & Operations**: `GET /api/tickets` (Queue query with `q`, `status`, `requestedPriority`, `itPriority`, `owner`, `sortBy`, `sortDir`, `page`, `limit`), `GET /api/tickets/:id`, `POST /api/tickets/:id/claim`, `PUT /api/tickets/:id/assign`, `PUT /api/tickets/:id/priority`, `PUT /api/tickets/:id/status`, `POST /api/tickets/:id/resolve-indicator`, `POST /api/tickets/:id/reopen-request`
- **Comments & Notes**: `GET /api/tickets/:id/comments`, `POST /api/tickets/:id/comments`, `GET /api/tickets/:id/notes`, `POST /api/tickets/:id/notes`
- **Admin User Management**: `GET /api/admin/users`, `POST /api/admin/users`, `PUT /api/admin/users/:id`, `POST /api/admin/users/:id/password`

---

## 9. Acceptance Criteria (AC)

- **AC-01**: Given an active user with valid credentials, when the user logs in, then the backend establishes authenticated access and returns user identity and role.
- **AC-02**: Given a user with `requiresPasswordChange = true`, when login succeeds, then normal application routes remain blocked until a valid new password is saved.
- **AC-03**: Given an authenticated Requester, when requesting ticket endpoints, then backend enforces resource ownership based on authenticated session identity.
- **AC-04**: Given a Requester account, when requesting Internal Notes endpoints, then the operation is rejected with 403 Forbidden without leaking note content.
- **AC-05**: Given an IT Staff user, when querying the Ticket Queue, then the API returns paginated, filtered, and sorted ticket records with accurate ownership and status badges.
- **AC-06**: Given an IT Staff user, when claiming or reassigning a ticket, then `ownerId` is updated in the database and reflected on the UI.
- **AC-07**: Given an IT Staff user, when performing a status transition, then the backend enforces the Status Transition Matrix and rejects invalid transitions.
- **AC-08**: Given an IT Staff or Admin user, when posting an Internal Note, then it is saved as append-only and rendered with amber warning styling.
- **AC-09**: Given an Administrator user, when creating a user with a duplicate email, then the backend returns 409 Conflict.
- **AC-10**: Given an Administrator user, when attempting to deactivate their own account or remove the last active Admin, then the operation is rejected with safe error feedback.
- **AC-11**: Given a non-Admin user, when attempting to access `/api/admin/users`, then the backend returns 403 Forbidden.
- **AC-12**: Given the completed Lab 3 increment, when executing the full regression and E2E test suites, then 100% of tests pass cleanly.
- **AC-13**: Given an authenticated user with a valid token, when the user calls `POST /api/auth/logout` and then reuses the same token on any protected endpoint, then the backend rejects the request with `401 Unauthorized` because the token is on the server-side blocklist.
- **AC-14**: Given an authenticated Requester who owns a ticket in `IN_PROGRESS`, when the Requester calls `POST /api/tickets/:id/resolve-indicator`, then `requesterResolvedIndicatedAt` is recorded and `currentStatus` remains unchanged; and when the same Requester attempts `PUT /api/tickets/:id/status` with `RESOLVED` or `CLOSED`, then the backend rejects it with `403 Forbidden` (BR-05).
- **AC-15**: Given an authenticated user permitted to post, when Public Comment or Internal Note content is empty, whitespace-only, or exceeds 2000 characters, then the backend rejects it with `400 Bad Request` and no record is created (BR-11).
- **AC-16**: Given an IT Staff user, when the Ticket Queue is requested with an invalid `sortBy`, `status`, or out-of-range `page` value, then the backend responds safely according to BR-14 (documented default or `400 Bad Request`) without a server error or stack trace leak.
- **AC-17**: Given an authenticated Administrator, when opening Ticket Detail, then ticket data and Internal Notes are returned in read-only form; and when the Administrator attempts `PUT /api/tickets/:id/status` or `PUT /api/tickets/:id/priority`, then the backend rejects it with `403 Forbidden`.

---

## 10. Definition of Done (DoD)

- [ ] All 17 Acceptance Criteria (AC-01 to AC-17) implemented and verified.
- [ ] Prisma database schema updated, migrated, and idempotent seed script tested.
- [ ] Server API unit/integration tests (`server/tests/lab-03/`) passing 100%.
- [ ] Client component tests (`client/tests/lab-03/`) passing 100%.
- [ ] Playwright E2E tests (`e2e/lab-03/`) passing 100% across Desktop and Mobile viewports.
- [ ] All 6 documentation files created in `docs/lab-03/` (`specification.md`, `tests.md`, `ui-spec.md`, `api-spec.md`, `reviewer.md`, `ai-use.md`).
- [ ] Peer review completed and logged in `docs/lab-03/reviewer.md` with approvals.
- [ ] All 12 GitHub Issues in Done on GitHub Project Board.
- [ ] Feature branches merged into `lab3-staging`, and final release PR merged into `main`.

---

## 11. Technical Assumptions & Architectural Decisions

1. **Authentication Technology & Immediate Verification**: Short-lived JSON Web Token (JWT) with 15-minute expiration stored in HTTP-Only secure cookie (`SameSite=Strict`), paired with a server-side token revocation blocklist for immediate logout session invalidation. Auth middleware verifies `isActive` and `role` against the database (or cached active user record) on every protected request rather than relying solely on static JWT payload claims, ensuring account deactivation and role modifications take effect immediately on the target user's next API request verification per BR-13.
2. **Priority Enum Unification**: The database schema uses a single unified `Priority` enum (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) shared by both `requestedPriority` and `itPriority` fields on the `Ticket` model.
3. **Password Security**: Passwords hashed using `bcrypt` with a salt round factor of 10. Passwords are never stored or logged in plaintext.
4. **Error Sanitization**: Server error messages for authentication failures and permission denials are sanitized to prevent user enumeration and information leakage.
