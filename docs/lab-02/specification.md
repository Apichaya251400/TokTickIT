# Lab 2 Sprint Engineering Specification: TokTickIT Requester MVP

## 1. Sprint Goal
Deliver the TokTickIT MVP system for Requesters to create, inspect, and manage IT support tickets along with supporting attachments under a Spec-Driven Development architecture and Zen Green UI theme, utilizing a Development Requester Selector to simulate user context (`X-Requester-Id` HTTP header) prior to authentication integration in Lab 3.

## 2. Stakeholder Request Interpretation
The IT department requires an accessible and responsive ticketing experience across all devices. Requesters must be able to select a Development Requester context, specify Category, Related System, Requested Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), Summary, Description, and attach supporting evidence. Upon successful creation, the system automatically generates an official Ticket Number (`TKT-YYYY-XXXXXX`). Requesters can search, filter, sort, view details of their own tickets, and manage attachments (Upload/Soft Remove) with strict backend ownership checks preventing cross-user ticket disclosure by returning `404 Not Found`.

## 3. Scope
### Included
- **Development Requester Selection Screen**: Simulates user selection for testing context without password/login authentication; loads active Development Requesters via reference data endpoint `GET /api/requesters/active`.
- **Create Ticket Workflow**: IT ticket creation form capturing Category, Related System, Requested Priority, Summary, and Description with client/server validation.
- **My Tickets Workflow**: Personal ticket list with Search, Filter (Category, Related System, Requested Priority, Current Status), Sort (`createdAt`, `updatedAt`, `ticketNumber`, `requestedPriority`), and Pagination capabilities.
- **Ticket Detail View**: Read-only ticket details view and attachment management for owned tickets.
- **Attachment Lifecycle**: File upload, download, and soft removal with mandatory removal reason recording. Soft-removed attachments do not count toward the 5-active-attachment limit.
- **Ownership Protection**: Backend enforcement restricting ticket and attachment access exclusively to the owning Requester, returning `404 Not Found` for non-owned resources.
- **Zen Green UI Foundation**: Reusable form, list, badge, validation, loading, empty, no-results, failure, retry, application shell navigation, and responsive-layout conventions.

### Excluded
- Real Authentication/Authorization mechanisms (passwords, JWT, sessions, tokens).
- IT Staff Workflows (claiming/reassigning tickets, status changes, adjusting IT Priority).
- Public Comments, Internal Notes, and Actions Taken.
- Ticket status transitions beyond the initial `NEW` status.
- Administration functions for managing users, Requesters, roles, or reference data.
- Advanced features: rate limiting, CSRF protection, virus scanning, signed download URLs, encryption at rest.

## 4. Functional Requirements
- **FR-01**: The system shall allow users to select an active Development Requester from active reference data fetched via `GET /api/requesters/active` to set the `X-Requester-Id` header testing context.
- **FR-02**: The system shall support creating IT support tickets by capturing Category, Related System, Ticket Summary (10–120 chars), Requested Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), and Description (20–2,000 chars).
- **FR-03**: The system shall generate a unique Ticket Number (`ticketNumber`) from the backend in format `TKT-YYYY-XXXXXX` upon successful creation.
- **FR-04**: The system shall display only tickets belonging to the current Requester context on My Tickets.
- **FR-05**: The system shall support Search (`ticketNumber`, Summary, Description), Filters (Category, Related System, Requested Priority, Current Status), Sorting (`createdAt`, `updatedAt`, `ticketNumber`, `requestedPriority`), and Pagination on My Tickets.
- **FR-06**: The system shall display read-only ticket details and attached active/removed files on Ticket Detail for owned tickets, returning HTTP 404 for non-owned tickets.
- **FR-07**: The system shall allow adding permitted attachments (JPG, JPEG, PNG, WEBP, PDF up to 5,000,000 bytes) to an existing ticket, up to a limit of 5 active attachments per ticket.
- **FR-08**: The system shall support soft removal of attachments with a mandatory removal reason (5–200 chars) by retaining metadata while disabling download and preview access. Soft-removed attachments do not count against the 5 active attachments limit.
- **FR-09**: The system shall provide reference data endpoints to load active Categories (`GET /api/categories`), active Related Systems (`GET /api/related-systems`), and active Development Requesters (`GET /api/requesters/active`).
- **FR-10**: The system shall reload requester-specific data whenever the selected Development Requester changes.
- **FR-11**: The backend shall enforce requester-scoped database queries and return HTTP 404 for any attempt to access non-owned tickets or attachments.
- **FR-12**: The system shall provide clear loading, validation, success, empty, no-results, application shell navigation, and failure states across all workflows.

## 5. Business Rules
- **BR-01**: Official Ticket Number (`ticketNumber`) is generated by backend in format `TKT-YYYY-XXXXXX` and must be unique.
- **BR-02**: A newly created ticket always begins with initial Current Status `NEW`.
- **BR-03**: Requester selection via `X-Requester-Id` header is strictly a testing context and does not represent authentication. Active Development Requesters are fetched from `GET /api/requesters/active`.
- **BR-04**: Requesters can only access tickets and attachments they own. Queries must be scoped to `requesterId`.
- **BR-05**: Ownership checks must be enforced by the backend before evaluating resource status. Accessing another Requester's Ticket or Attachment must return HTTP `404 Not Found` to avoid disclosing resource existence.
- **BR-06**: Allowed attachment file types are strictly `JPG`, `JPEG`, `PNG`, `WEBP`, and `PDF`. Maximum file size is strictly `5,000,000 bytes` (`MAX_FILE_SIZE_BYTES = 5_000_000`). Files of size `5,000,001 bytes` or greater must be rejected with HTTP `413 Payload Too Large`.
- **BR-07**: A single ticket can contain a maximum of 5 ACTIVE attachments. Soft-removed attachments do not count toward the 5-active limit. Attempting to add a 6th active attachment must return HTTP `409 Conflict`.
- **BR-08**: Attachment deletion must use soft removal by setting `removedAt` timestamp and `removalReason` (5–200 characters). For download and removal requests, ownership is checked first (returning 404 if non-owned); after ownership is established, if the file is soft-removed, download returns HTTP `409 Conflict`.
- **BR-09**: Inactive Requesters must not appear in the Development Requester Selector. If `X-Requester-Id` specifies an unknown or inactive requester ID, the API returns HTTP `403 Forbidden`. Missing, empty, non-numeric, or `<= 0` header returns HTTP `400 Bad Request`.
- **BR-10**: Ticket Summary is required and must contain 10–120 characters after trimming leading/trailing whitespace. Whitespace-only input is invalid.
- **BR-11**: Description is required and must contain 20–2,000 characters after trimming leading/trailing whitespace. Whitespace-only input is invalid.
- **BR-12**: Requested Priority must be one of: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- **BR-13**: Validation rules must be enforced on both frontend and backend. Backend validation is authoritative.
- **BR-14**: Duplicate submission means repeated submission of the same ticket creation request while the previous submission is still being processed. Repeated submission during processing returns HTTP 409 Conflict and preserves form values.
- **BR-15**: In case of submission or attachment upload failure, form inputs and requester context must be retained.
- **BR-16**: Uploaded filenames must be sanitized before storage to prevent path traversal (e.g. `../secret.txt`).
- **BR-17**: Attachment metadata includes original filename, size in bytes, MIME type, storage path, upload timestamp, and removal information.
- **BR-18**: If attachment upload fails after ticket creation, the ticket remains saved, the failure is reported, and form/attachment selections are preserved for retry without creating corrupt attachment records.
- **BR-19**: Search is case-insensitive, matches substrings in Ticket Number (`ticketNumber`), Summary, or Description, and trims search input.
- **BR-20**: Filters combine with `AND` logic across Category, Related System, Requested Priority, and Status.
- **BR-21**: Sorting supports `createdAt`, `updatedAt`, `ticketNumber`, and `requestedPriority`. Default sort is `createdAt DESC`. Secondary sort is `id DESC`. `requestedPriority` sorts by severity (`URGENT` > `HIGH` > `MEDIUM` > `LOW`).
- **BR-22**: Pagination starts at page 1. Default pageSize is 10. Allowed pageSizes are 10, 20, 50. Changing search, filter, sort, or pageSize resets page to 1. Requesting a page beyond total pages returns 200 OK with an empty array.
- **BR-23**: Client stores `selectedRequesterId` in LocalStorage and attaches `X-Requester-Id` header to API requests.
- **BR-24**: Switching Development Requester reloads requester-specific ticket data.
- **BR-25**: If no Requester is selected, protected UI routes redirect to the Requester Selection screen.
- **BR-26**: Empty states are displayed when a requester has no tickets; no-results states are displayed when search/filters match zero tickets.

## 6. UI Specification Summary
The application shall use the Zen Green Theme:
- **Primary Color**: `#006B3C`
- **Active Accent**: `#0B7A46`
- **Pale Emphasis**: `#EAF6EF`
- **Page Background**: `#F5F7F6`

UI Rules:
- Application Shell includes `TokTickIT` title, `My Tickets` and `Create Ticket` nav tabs, clear active-page indicator (`#0B7A46` highlight + `aria-current="page"`), current Requester identity display, `Change Requester` button, and responsive mobile nav (<768px) with zero horizontal overflow.
- Distinct visual shading for Read-only fields (`#F0F4F2`).
- Field errors displayed directly below inputs in dark red (`#B42318`).
- Required fields marked with red asterisk `*`.
- Summary character counter `0 / 120`, Description character counter `0 / 2000`.
- Priority badge options: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- Active filters include Category, Related System, Requested Priority, and Status.
- Desktop (>=992px) multi-column/table layout; Mobile (<768px) stacked card layout.
- Soft removal modal requiring a removal reason (5–200 characters).
- Full visual specification and state rules in `docs/lab-02/ui-spec.md`.

## 7. Data Changes
### Prisma Data Model (PostgreSQL)
- `RequesterUser`: `id` (Int PK), `name` (String), `email` (String Unique), `isActive` (Boolean default true), `createdAt`
- `Category`: `id` (Int PK), `name` (String Unique), `isActive` (Boolean)
- `RelatedSystem`: `id` (Int PK), `name` (String Unique), `isActive` (Boolean)
- `Ticket`: `id` (UUID PK), `ticketNumber` (String Unique), `requesterId` (FK -> RequesterUser), `categoryId` (FK -> Category), `relatedSystemId` (FK -> RelatedSystem), `summary` (String), `description` (Text), `requestedPriority` (Enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`), `itPriority` (Enum Nullable), `currentStatus` (Enum: `NEW`, `IN_PROGRESS`, `RESOLVED`, `CLOSED`, default `NEW`), `createdAt`, `updatedAt`
- `Attachment`: `id` (UUID PK), `ticketId` (FK -> Ticket), `fileName` (String), `fileSize` (Int), `mimeType` (String), `filePath` (String), `uploadedAt`, `removedAt` (DateTime Nullable), `removalReason` (String Nullable)

### Indexing & Schema Justification
- Composite index on `Ticket(requesterId, createdAt DESC, id DESC)` for fast My Tickets query execution.
- Composite index on `Ticket(requesterId, currentStatus)` for status filtering.
- PostgreSQL UUID for Ticket and Attachment identifiers.
- Soft removal represented using nullable `removedAt` and `removalReason`.

## 8. API Contract Summary
- **Base Path**: `/api`
- **Context Header**: `X-Requester-Id: <positive integer>`
- **Identifiers**: `Ticket.id` and `Attachment.id` are String UUIDs.
- **Public Field**: `ticketNumber`
- **Endpoints**:
  - `GET /api/requesters/active`: Retrieve active Requesters for selector dropdown.
  - `GET /api/categories`: Retrieve active Ticket Categories.
  - `GET /api/related-systems`: Retrieve active Related Systems.
  - `POST /api/tickets`: Create ticket (requires `X-Requester-Id`).
  - `GET /api/tickets`: Retrieve owned ticket list with query params `search`, `categoryId`, `relatedSystemId`, `requestedPriority`, `currentStatus`, `sortBy`, `sortOrder`, `page`, `pageSize` (requires `X-Requester-Id`).
  - `GET /api/tickets/:id`: Retrieve owned ticket detail (requires `X-Requester-Id`). Returns 404 for non-owned. Path param `:id` is a UUID string.
  - `POST /api/tickets/:id/attachments`: Upload attachment file (requires `X-Requester-Id`). Returns 404 for non-owned. Path param `:id` is a UUID string.
  - `GET /api/attachments/:id/download`: Download active attachment file (requires `X-Requester-Id`). Evaluates ownership first (404 if non-owned), then soft-removed state (409 if removed). Path param `:id` is a UUID string.
  - `DELETE /api/attachments/:id`: Soft remove attachment (requires `X-Requester-Id`). Evaluates ownership first (404 if non-owned). Path param `:id` is a UUID string.

### HTTP Status Code Mapping
- `200 OK`: Successful retrieval or soft removal.
- `201 Created`: Successful ticket or attachment creation.
- `400 Bad Request`: Validation failure, missing/malformed `X-Requester-Id`, invalid query/path param.
- `403 Forbidden`: Unknown or inactive requester specified in `X-Requester-Id`.
- `404 Not Found`: Ticket/Attachment not found OR belongs to another Requester.
- `409 Conflict`: Duplicate submission, active attachment limit (5) reached, or downloading soft-removed attachment.
- `413 Payload Too Large`: Attachment exceeds 5,000,000 bytes.
- `415 Unsupported Media Type`: File type not in `[JPG, JPEG, PNG, WEBP, PDF]`.
- `500 Internal Server Error`: Unexpected server failure.

Full API specification in `docs/lab-02/api-spec.md`.

## 9. Acceptance Criteria
- **AC-01**: Given valid ticket data, when Requester submits form with `X-Requester-Id`, then ticket is saved, unique `ticketNumber` is returned, and success state is shown.
- **AC-02**: Given no Development Requester is selected, when user accesses protected screens, then system redirects to Requester Selection screen.
- **AC-03**: Given Requester B context, when requesting a ticket owned by Requester A, then backend rejects request with HTTP 404 Not Found.
- **AC-04**: Given an attachment exceeds 5,000,000 bytes or is of unpermitted type (e.g. EXE), when uploaded, then API returns HTTP 413 or 415 and UI shows field/dropzone validation error.
- **AC-05**: Given an attachment is soft-removed, when download is attempted, then API evaluates ownership first (404 if non-owned) and returns HTTP 409 Conflict if soft-removed.
- **AC-06**: Given user applies search, Category, Related System, Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), or Status filter, then only matching tickets owned by Requester are returned.
- **AC-07**: Given a ticket has 5 active attachments, when uploading a 6th, then API returns HTTP 409 Conflict and upload is blocked.
- **AC-08**: Given Requester selection changes, when accessing My Tickets, then application reloads and displays only the new Requester's tickets.
- **AC-09**: Given Summary < 10 chars, Description < 20 chars, or whitespace-only input, when submitted, field validation messages display and API is not called.
- **AC-10**: Given valid tickets span multiple pages, when changing page, API returns correct page and metadata. Requesting a page beyond total returns 200 with empty array.
- **AC-11**: Given user selects a sort option (`createdAt`, `updatedAt`, `ticketNumber`, `requestedPriority`), tickets are returned in requested order with deterministic secondary sort `id DESC`.
- **AC-12**: Given a Requester has no tickets, My Tickets displays a meaningful empty state.
- **AC-13**: Given search/filter returns zero tickets, My Tickets displays a clear no-results state.
- **AC-14**: Given API failure, UI displays a safe error message without internal server details.
- **AC-15**: Given ticket creation or upload fails, form inputs, selected files, and requester context are preserved.
- **AC-16**: Given Requester attempts to access another Requester's attachment directly, backend returns HTTP 404 Not Found.
- **AC-17**: Given user soft-removes an attachment, when removal reason is under 5 characters or omitted, removal is prevented and validation message displays.
- **AC-18**: Given desktop, tablet, and mobile viewports, controls remain usable without clipping, overlap, or unintended horizontal scrolling.
- **AC-19**: Given keyboard user, controls are reachable, focus ring is visible (`#0B7A46`), and contrast meets WCAG AA.
- **AC-20**: Given user submits a valid ticket, Submit button enters busy state and prevents duplicate submission during processing.

## 10. Definition of Done
### Product & Delivery Completion Checklist
- [ ] All approved Lab 2 scope implemented across frontend, backend, and database.
- [ ] All required tests pass from documented commands (`npm test`, `npx playwright test`).
- [ ] Every acceptance criterion (AC-01 through AC-20) is linked to passing test evidence.
- [ ] No required test is skipped, disabled, or commented out.
- [ ] Conformance of UI, API, database, validation, and responsive layouts to the approved engineering contract (`specification.md`, `api-spec.md`, `ui-spec.md`, `tests.md`).
- [ ] Visual inspection completed using the Visual Inspection Checklist in `ui-spec.md` with 0 clipping, overlap, or horizontal page scroll issues.
- [ ] Required screenshots and artifacts created under `artifacts/lab-02/screenshots/`.
- [ ] README setup, database migration, and test execution instructions are current.
- [ ] Peer review completed and all review comments addressed.
- [ ] Required Lab 2 demonstration flow is completed successfully, covering Development Requester selection, ticket creation, My Tickets, Ticket Detail, attachment management, requester ownership behavior, and responsive UI.
- [ ] Final implementation is merged and present in the final `main` branch.

## 11. Assumptions and Decisions
- LocalStorage stores `selectedRequesterId` and client attaches `X-Requester-Id` header to API requests.
- Development Requester Selector is a testing mechanism for Lab 2; active requesters loaded via `GET /api/requesters/active`.
- Ticket creation (`POST /api/tickets`) and attachment upload (`POST /api/tickets/:id/attachments`) are separate API operations.
- Backend ownership checks return HTTP 404 Not Found for non-owned resources to prevent disclosing existence.
- Attachment size limit is strictly 5,000,000 bytes (`MAX_FILE_SIZE_BYTES = 5_000_000`).
- Public domain field for official ticket identifier is `ticketNumber`.
- Ticket and Attachment primary keys are String UUIDs.
- Detailed API wire contract in `docs/lab-02/api-spec.md`.
- Detailed UI specification in `docs/lab-02/ui-spec.md`.
- Planned test suite and traceability matrix in `docs/lab-02/tests.md`.
