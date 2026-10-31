# Sprint 4 REST API Specification: TokTickIT Actions Taken, Dashboards, and Ticket Workflow

- **System Name**: TokTickIT
- **Sprint / Lab**: Lab 4 (Sprint 4)
- **Document Status**: Approved REST API Specification
- **Repository Branch at Specification Time**: `feature/lab4-spec-dd`
- **Final Verification Branch**: `main`

---

## 1. Overview & General Standards

The REST API extends the existing TokTickIT backend endpoints. All request and response bodies use JSON (`Content-Type: application/json`).

### Authentication & Authorization
All protected endpoints defined in this Lab 4 specification authenticate using the existing JWT authentication mechanism from Lab 3.

The primary browser/session mechanism is the HTTP-only JWT session cookie. The server also accepts the `Authorization: Bearer <token>` form for API and integration-test compatibility. Both mechanisms are validated by the same authentication middleware, which populates `req.user` with `{ id, name, email, role, isActive }`.

Unauthenticated authentication endpoints such as login remain governed by the existing Lab 3 authentication contract.

### Common Error Response Format
```json
{
  "error": {
    "code": "BAD_REQUEST | FORBIDDEN | NOT_FOUND | CONFLICT | UNAUTHORIZED | INVALID_TRANSITION | TICKET_TERMINAL | STALE_UPDATE | MISSING_EXPECTED_UPDATED_AT | MISSING_IDEMPOTENCY_KEY | IDEMPOTENCY_KEY_REUSED | INTERNAL_ERROR",
    "message": "Human-readable safe error message"
  }
}
```
*Note on 500 Internal Server Error*: Any unhandled server exception MUST return `500 Internal Server Error` with `code: "INTERNAL_ERROR"` and message `"An unexpected error occurred. Please try again."` without exposing internal stack traces or database engine details. Serialization or transaction conflicts caused by concurrent Ticket or Action Taken updates MUST be retried when safe; if the operation cannot be safely retried, return `409 Conflict` (`STALE_UPDATE`) rather than exposing an unhandled `500 Internal Server Error`.

---

## 2. Actions Taken Endpoints

### 2.1 List Actions Taken for a Ticket
`GET /api/tickets/:id/actions`
- **Authorization**: Requesters (owned tickets only), IT Staff, Administrator. ActionTaken authorization MUST NOT bypass parent Ticket authorization.
- **Ordering**: Actions are returned in chronological order by `createdAt ASC`, with `id ASC` as a deterministic tie-breaker.
- **Success Response (`200 OK`)**:
```json
{
  "data": [
    {
      "id": "act-uuid-101",
      "ticketId": "tkt-uuid-001",
      "performedBy": {
        "id": "usr-staff-01",
        "name": "Sarah Staff",
        "role": "IT_STAFF"
      },
      "assignee": {
        "id": "usr-staff-02",
        "name": "John Staff",
        "role": "IT_STAFF"
      },
      "description": "Replaced faulty RAM module and ran diagnostic test.",
      "result": "Memory test passed with zero errors.",
      "status": "PENDING",
      "followUpRequired": true,
      "followUpNote": "Schedule follow-up check in 48 hours.",
      "attachmentNotes": "See diagnostic_log.png attached.",
      "createdAt": "2026-10-05T09:30:00.000Z",
      "updatedAt": "2026-10-05T09:35:00.000Z"
    }
  ]
}
```

### 2.2 Create Action Taken
`POST /api/tickets/:id/actions`
- **Authorization**: IT Staff, Administrator. Requesters return `403 Forbidden`. ActionTaken authorization MUST NOT bypass parent Ticket authorization.
- **Headers**: Mandatory client idempotency header `Idempotency-Key: <unique-request-key>`. If missing, return `400 Bad Request` (`MISSING_IDEMPOTENCY_KEY`).
- **Preconditions & Terminal Checks**:
  - If parent Ticket has `currentStatus = CANCELLED`, Action Taken creation MUST be rejected with `400 Bad Request` and error code `TICKET_TERMINAL`. Action Taken operations (`POST /api/tickets/:id/actions`, `PUT /api/actions/:id`, `PUT /api/actions/:id/status`) that depend on parent Ticket state MUST verify the parent Ticket's non-terminal state (`currentStatus != 'CANCELLED'`) atomically with the mutation or inside a database transaction. Parent Ticket terminal-state checks MUST use the same concurrency control protocol as Ticket status transitions. Concurrent Action mutation and transition to `CANCELLED` MUST be serialized (e.g. by locking the parent Ticket row or using `SERIALIZABLE` isolation), so no Action mutation can commit after the Ticket has committed to `CANCELLED`.
- **Backend Idempotency Handling**:
  - Backend checks for matching `(req.user.id, ticketId, endpoint, Idempotency-Key)` record in `IdempotencyRecord` table (where unique constraint is `(userId, ticketId, endpoint, idempotencyKey)`).
  - **Concurrent Idempotency Handling**: Concurrent requests using the same idempotency-key scope are protected by the database unique constraint on `(userId, ticketId, endpoint, idempotencyKey)`. If a concurrent request loses the uniqueness race while creating the `IdempotencyRecord`, the backend MUST re-read the committed record and return the cached successful response instead of returning an unhandled server error.
  - If a matching request exists with identical payload, return the cached successful `201 Created` response.
  - If `Idempotency-Key` is reused with a different payload, return `409 Conflict` with error code `IDEMPOTENCY_KEY_REUSED`.
  - **Transaction Atomicity & Cache Boundary**: ActionTaken creation and the corresponding `IdempotencyRecord` persistence MUST be committed atomically in the same database transaction. The cached response MUST be stored only as part of a successfully committed ActionTaken creation. A failed ActionTaken transaction MUST NOT leave a reusable successful idempotency record.
- **Request Body**:
```json
{
  "description": "Inspected power supply unit and checked cabling.",
  "result": "PSU voltage stable; cable replaced.",
  "assigneeId": 2,
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "Photo of replaced cable."
}
```
- **Validation Rules**:
  - `Idempotency-Key`: Mandatory HTTP Header. Missing header returns `400 Bad Request` (`MISSING_IDEMPOTENCY_KEY`).
  - `description`: String, 1 to 2000 characters (validated after trimming whitespace), mandatory.
  - `result`: String, 1 to 2000 characters (validated after trimming whitespace), mandatory.
  - `status`: Server-controlled. The backend strictly assigns `status = PENDING` upon creation.
  - `assigneeId`: Integer user ID, optional. Must correspond to an active IT Staff or Administrator user account (`isActive = true AND role IN ('IT_STAFF', 'ADMINISTRATOR')`). If user is inactive, invalid, or has `REQUESTER` role, return `400 Bad Request`.
  - `followUpRequired`: Boolean, mandatory.
  - `followUpNote`: String (1 to 1000 chars, validated after trimming whitespace). MANDATORY if `followUpRequired = true`. If missing/empty when `followUpRequired = true`, return `400 Bad Request`.
  - `performedById`: Auto-derived from authenticated actor identity (`req.user.id`). If client payload contains `performedById` or `performedBy`, return `400 Bad Request` (BR-03). `createdAt` is the authoritative Action Date/Time for an `ActionTaken` record and MUST be generated by the server when the record is created.
  - **Textual Field Whitespace Validation**: All required textual fields (`description`, `result`, `followUpNote`, `resolutionNote`) MUST be validated after trimming leading and trailing whitespace; whitespace-only strings are considered empty and return `400 Bad Request`.
- **Success Response (`201 Created`)**: Returns created `ActionTaken` object.

### 2.3 Update Action Taken
`PUT /api/actions/:id`
- **Authorization**: IT Staff, Administrator. ActionTaken authorization MUST NOT bypass parent Ticket authorization.
- **Request Body**: Partial update allowed for `description`, `result`, `assigneeId`, `followUpRequired`, `followUpNote`, `attachmentNotes`. Mandatory parameter: `expectedUpdatedAt`. `performedById` CANNOT be modified.
```json
{
  "description": "Updated PSU voltage reading after second check.",
  "expectedUpdatedAt": "2026-10-05T09:35:00.000Z"
}
```
- **Validation & Preconditions**:
  - `expectedUpdatedAt`: String (ISO 8601 timestamp), MANDATORY. If omitted, return `400 Bad Request` (`MISSING_EXPECTED_UPDATED_AT`).
  - If parent Ticket is `CANCELLED`, action editing MUST be rejected with `400 Bad Request` (`TICKET_TERMINAL`).
  - **Terminal Action Editing Rule**: `COMPLETED` and `CANCELLED` ActionTaken records cannot undergo status transitions, but may still have their editable content fields updated using optimistic concurrency (`expectedUpdatedAt`), unless the parent Ticket is `CANCELLED`.
  - **Atomic Optimistic Concurrency Check**: The update MUST be performed atomically using a conditional database update `WHERE id = :id AND updatedAt = :expectedUpdatedAt` (e.g. Prisma `updateMany` checking `count === 0`). If the conditional update affects 0 rows (indicating a stale timestamp mismatch), return `409 Conflict` with error code `STALE_UPDATE` and message `"Action content was updated concurrently by another user. Please refresh and try again."`.
  - Partial updates MUST re-apply all applicable field constraints and business rules.
  - If `followUpRequired` is set to `true` (or remains `true`), `followUpNote` MUST be non-empty (1 to 1000 chars); otherwise return `400 Bad Request`.
  - If `assigneeId` is provided, assignee MUST be active IT Staff or Administrator (`isActive = true AND role IN ('IT_STAFF', 'ADMINISTRATOR')`); otherwise return `400 Bad Request`.
- **Success Response (`200 OK`)**: Returns updated `ActionTaken` object.

### 2.4 Action Status Transition
`PUT /api/actions/:id/status`
- **Authorization**: IT Staff, Administrator. ActionTaken authorization MUST NOT bypass parent Ticket authorization.
- **Request Body**: `{ "status": "IN_PROGRESS", "expectedUpdatedAt": "2026-10-05T09:35:00.000Z" }`
- **Transition & Concurrency Rules**:
  - `expectedUpdatedAt`: String (ISO 8601 timestamp), MANDATORY. If omitted, return `400 Bad Request` (`MISSING_EXPECTED_UPDATED_AT`).
  - If parent Ticket is `CANCELLED`, return `400 Bad Request` (`TICKET_TERMINAL`).
  - **Terminal Action Status Rule**: Status transitions originating from terminal states (`COMPLETED` or `CANCELLED`) MUST be rejected with `400 Bad Request`.
  - **Atomic Optimistic Concurrency Check**: The update MUST be performed atomically using a conditional database update `WHERE id = :id AND updatedAt = :expectedUpdatedAt` (e.g. Prisma `updateMany` checking `count === 0`). If the conditional update affects 0 rows (indicating a stale timestamp mismatch), return `409 Conflict` with error code `STALE_UPDATE` and message `"Action status was updated concurrently by another user. Please refresh and try again."`.
  - Enforces Action Status Transition Matrix (Section 8.2 of Specification):
    - `PENDING` → `IN_PROGRESS`, `COMPLETED`, `CANCELLED`
    - `IN_PROGRESS` → `COMPLETED`, `CANCELLED`
    - `COMPLETED` → Terminal state; transition attempts return `400 Bad Request`.
    - `CANCELLED` → Terminal state; transition attempts return `400 Bad Request`.
- **Success Response (`200 OK`)**: Returns updated `ActionTaken` object.

---

## 3. Role Dashboards Endpoints

### 3.1 IT Staff & Administrator Dashboard
`GET /api/dashboards/staff`
- **Authorization**: IT Staff, Administrator. Requesters return `403 Forbidden`.
- **Query Parameters**: None. The backend strictly evaluates time-sensitive metrics (`todayActionsCount` filtering `ActionTaken.createdAt >= startOfDay AND createdAt < startOfNextDay`) against fixed Asia/Bangkok (UTC+7) timezone rules.
- **Recent Workload & Actions Specifications**:
  - `myRecentTickets`: Array of max 5 tickets assigned to current user (`ownerId = req.user.id`), ordered by `updatedAt DESC, id ASC`. If no tickets, returns `[]`.
- **Staff Queue Drill-Down Contract**: Metric card drill-downs navigate to `/staff/queue` with active workload views:
  - `Unassigned Tickets` → `view=unassigned_active&owner=unassigned`
  - `My Assigned Tickets` → `view=my_queue_active&owner=my_queue`
  - `Today's Actions` → `view=today_actions`
  - `Urgent Workload` → `view=urgent_workload&itPriority=URGENT`
  See Section 4.4 for the complete `GET /api/tickets` queue drill-down and authorization specification.
- **Success Response (`200 OK`)**:
```json
{
  "metrics": {
    "unassignedCount": 14,
    "myAssignedCount": 16,
    "todayActionsCount": 7,
    "urgentWorkloadCount": 5
  },
  "myRecentTickets": [
    {
      "id": "tkt-001234",
      "ticketNumber": "TKT-2026-001234",
      "summary": "Laptop battery drains quickly",
      "currentStatus": "IN_PROGRESS",
      "requestedPriority": "MEDIUM",
      "itPriority": "HIGH",
      "updatedAt": "2026-10-05T09:14:00.000Z"
    }
  ],
  "currentStaffActions": [
    {
      "id": "act-101",
      "ticketId": "tkt-001234",
      "ticketNumber": "TKT-2026-001234",
      "description": "Replaced battery cell",
      "result": "Battery holding 100% charge",
      "createdAt": "2026-10-05T08:30:00.000Z"
    }
  ]
}
```

### 3.2 Requester Dashboard
`GET /api/dashboards/requester`
- **Authorization**: Requester (returns metrics scoped strictly to `req.user.id`).
- **Recent & Attention-Required Lists Specification**:
  - `recentTickets`: Array of max 5 tickets owned by requester (`requesterId = req.user.id`), ordered by `updatedAt DESC, id ASC`. If no tickets, returns `[]`.
  - `attentionRequiredTickets`: Array of max 5 tickets owned by requester needing user response (`requesterId = req.user.id AND currentStatus = 'WAITING_FOR_REQUESTER'`), ordered by `updatedAt DESC, id ASC`. If no tickets, returns `[]`.
- **Success Response (`200 OK`)**:
```json
{
  "metrics": {
    "openTicketsCount": 3,
    "waitingForRequesterCount": 1,
    "inProgressCount": 2,
    "recentlyResolvedCount": 5
  },
  "recentTickets": [
    {
      "id": "tkt-001234",
      "ticketNumber": "TKT-2026-001234",
      "summary": "Laptop battery drains quickly",
      "currentStatus": "IN_PROGRESS",
      "requestedPriority": "MEDIUM",
      "updatedAt": "2026-10-05T09:14:00.000Z"
    }
  ],
  "attentionRequiredTickets": [
    {
      "id": "tkt-005678",
      "ticketNumber": "TKT-2026-005678",
      "summary": "VPN connection drops on Wi-Fi",
      "currentStatus": "WAITING_FOR_REQUESTER",
      "requestedPriority": "HIGH",
      "updatedAt": "2026-10-05T09:20:00.000Z"
    }
  ]
}
```

### 3.3 List Requester Tickets (My Tickets & Dashboard Drill-Down)

`GET /api/tickets/my-tickets`

- **Authorization**:
  - `REQUESTER`: permitted to list owned tickets (scoped strictly to `requesterId = req.user.id`).
  - Unauthenticated requests: `401 Unauthorized`.
- **Scope**: Returns paginated tickets belonging to the authenticated requester, supporting Requester Dashboard metric card drill-downs.
- **Dashboard Drill-Down Query Contract**:
  - `currentStatus=open`: Represents active, non-terminal workload tickets owned by the requester:
    ```sql
    currentStatus NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')
    ```
    This parameter directly powers the **My Open Tickets** metric card drill-down navigation from the Requester Dashboard (`/tickets/my-tickets?currentStatus=open`).
  - `currentStatus=WAITING_FOR_REQUESTER`: Powers the **Waiting for My Response** card drill-down (`/tickets/my-tickets?currentStatus=WAITING_FOR_REQUESTER`).
  - `currentStatus=IN_PROGRESS`: Powers the **In Progress** card drill-down (`/tickets/my-tickets?currentStatus=IN_PROGRESS`).
  - `currentStatus=RESOLVED&resolvedWithinDays=30`: Powers the **Recently Resolved** card drill-down (`/tickets/my-tickets?currentStatus=RESOLVED&resolvedWithinDays=30`). Filters tickets resolved within the current day plus the past 29 calendar days in Asia/Bangkok UTC+7 (`updatedAt >= startOfDay AND updatedAt < startOfNextDay`). Strict parameter validation enforces that `resolvedWithinDays` must be an integer equal to `30`, and requires `currentStatus=RESOLVED`; any deviation returns `400 INVALID_QUERY_PARAMETER`.
  - `currentStatus=RESOLVED`: Standard status filter returning all resolved tickets without the 30-day time restriction.
  - Other supported status filters: `NEW`, `OPEN`, `CLOSED`, `REOPENED`, `CANCELLED`.
- **Success Response (`200 OK`)**: Standard paginated ticket list:
```json
{
  "data": [
    {
      "id": "tkt-001234",
      "ticketNumber": "TKT-2026-001234",
      "summary": "Laptop battery drains quickly",
      "currentStatus": "IN_PROGRESS",
      "requestedPriority": "MEDIUM",
      "createdAt": "2026-10-01T04:00:00.000Z",
      "updatedAt": "2026-10-05T09:14:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 1,
    "totalPages": 1
  }
}
```

---

## 4. Final Ticket Workflow & Resolution Gate Endpoints

### 4.1 Update Ticket Status
`PUT /api/tickets/:id/status`
- **Authorization**: IT Staff and Administrator, subject to the existing Lab 3 Ticket authorization rules. Lab 4 MUST NOT broaden Ticket authorization scope.
- **Request Body**: `{ "status": "RESOLVED", "resolutionNote": "Replaced battery cell and verified charging.", "expectedUpdatedAt": "2026-10-05T09:14:00.000Z" }`
- **Ticket Status Transition Rules**:
  - The endpoint MUST enforce the Ticket Status Transition Matrix defined in `specification.md`:
    - `NEW` → `OPEN`, `CANCELLED`
    - `OPEN` → `IN_PROGRESS`, `CANCELLED`
    - `IN_PROGRESS` → `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
    - `WAITING_FOR_REQUESTER` → `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
    - `RESOLVED` → `CLOSED`, `REOPENED`
    - `CLOSED` → `REOPENED`
    - `REOPENED` → `IN_PROGRESS`, `CANCELLED`
    - `CANCELLED` → *(Terminal State)* No transitions allowed.
  - Invalid transitions MUST be rejected with `400 Bad Request` and error code `INVALID_TRANSITION`.
- **Validation & Preconditions**:
  - `expectedUpdatedAt`: String (ISO 8601 timestamp), MANDATORY. If omitted, return `400 Bad Request` (`MISSING_EXPECTED_UPDATED_AT`).
  - `resolutionNote`: Optional string, maximum 2000 characters, validated after trimming leading and trailing whitespace. When target status = `RESOLVED` and there are 0 completed `ActionTaken` records linked to the ticket, `resolutionNote` MUST be non-empty. Whitespace-only values are treated as empty and rejected with `400 Bad Request`.
- **Resolution Gate Preconditions**:
  - When target `status` is `RESOLVED`, backend checks:
    1. Ticket MUST have at least 1 completed `ActionTaken` record linked (status `COMPLETED`) OR a non-empty staff `resolutionNote`.
    2. If preconditions are NOT met, return `400 Bad Request`: `{ "error": { "code": "BAD_REQUEST", "message": "Cannot resolve ticket without at least one completed Action Taken or formal resolution note." } }`.
  - **Atomic Resolution Gate Evaluation**: When transitioning a Ticket to `RESOLVED`, the Resolution Gate transaction MUST use an isolation/locking strategy that prevents a concurrent ActionTaken state change from invalidating the Gate between evaluation and Ticket status commit (e.g. `SERIALIZABLE` isolation level or an equivalent row-locking strategy). The committed transaction MUST NOT allow a Ticket to reach `RESOLVED` unless the Resolution Gate is satisfied by the same committed state.
- **Atomic Concurrency Handling**:
  - The status update MUST be executed as an atomic conditional database update `WHERE id = :id AND updatedAt = :expectedUpdatedAt` (e.g. Prisma `updateMany` checking `count === 0`).
  - If `expectedUpdatedAt` is omitted, return `400 Bad Request` (`MISSING_EXPECTED_UPDATED_AT`).
  - If the conditional update affects 0 rows (indicating ticket status/content was modified concurrently by another user), return `409 Conflict`: `{ "error": { "code": "STALE_UPDATE", "message": "Ticket status was updated concurrently by another user. Please refresh and try again." } }`.
  - Serialization or transaction conflicts caused by concurrent Ticket status transitions or Action Taken mutations MUST be retried when safe; if the operation cannot be safely retried, return `409 Conflict` (`STALE_UPDATE`) rather than exposing an unhandled `500 Internal Server Error`.
- **Success Response (`200 OK`)**: Returns updated Ticket object.

### 4.2 Preserved Lab 3 Ticket Assignment APIs

The following Ticket assignment endpoints are preserved from Lab 3 without behavioral changes in Lab 4:
- `POST /api/tickets/:id/claim`
- `PUT /api/tickets/:id/assign`

Their existing Lab 3 authorization, validation, response format, and safe-error behavior remain unchanged.
Lab 4 does not modify the business rules of these endpoints.

### 4.3 Send Problem Appears Resolved Indicator (Requester Advisory)
`POST /api/tickets/:id/resolve-indicator`
- **Authorization**: Requester (owned tickets in `IN_PROGRESS` or `WAITING_FOR_REQUESTER` status).
- **Behavior**: Records timestamp `requesterResolvedIndicatedAt = now()`. Does NOT change ticket status.
- **Success Response (`200 OK`)**: Returns `{ "message": "Resolution indicator recorded", "requesterResolvedIndicatedAt": "2026-10-05T09:25:00.000Z" }`.

### 4.4 List IT Staff Ticket Queue

`GET /api/tickets`

- **Authorization**:
  - `IT_STAFF`: permitted to access the IT Staff Ticket Queue.
  - `ADMINISTRATOR`: permitted to access the IT Staff Ticket Queue and the same queue filtering/drill-down capabilities as IT Staff (aligned with Lab 4 §4.3 allowing Administrator to perform IT Staff behaviors).
  - `REQUESTER`: `403 Forbidden`.
  - Unauthenticated requests: `401 Unauthorized`.
  - Other unauthorized roles: `403 Forbidden`.
- **Scope**: This endpoint returns the Ticket Queue data used by the IT Staff Dashboard drill-down views.
- **Supported dashboard drill-down views**:
  - `view=unassigned_active`: Filters tickets where `ownerId IS NULL` and `currentStatus NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')`.
  - `view=my_queue_active`: Filters tickets where `ownerId = req.user.id` and `currentStatus NOT IN ('RESOLVED', 'CLOSED', 'CANCELLED')`.
  - `view=today_actions`: Filters tickets having at least one `ActionTaken` performed by the authenticated user today (`performedById = req.user.id` within Asia/Bangkok UTC+7 day boundaries).
  - `view=urgent_workload`: Filters tickets where `itPriority = 'URGENT'` and `currentStatus IN ('NEW', 'OPEN', 'IN_PROGRESS')`.
- **Authorization is enforced server-side**. Client-side navigation visibility MUST NOT be treated as an authorization control.
- **Active workload views** MUST apply the same status semantics as the corresponding Dashboard metrics so that drill-down results remain consistent with the displayed metric counts.
- **Success Response (`200 OK`)**: Returns the documented Ticket Queue response including pagination (`data`, `pagination: { total, page, limit, totalPages }`).
- **Forbidden Response (`403 Forbidden`)**:
```json
{
  "error": "FORBIDDEN",
  "message": "Access denied"
}
```
- **Unauthenticated Response (`401 Unauthorized`)**: Returned when no valid authenticated session is provided:
```json
{
  "error": "UNAUTHORIZED",
  "message": "Authentication required"
}
```

---

## 5. HTTP Status Code Summary

| Status Code | Meaning | Used For | Error Code Examples |
|---|---|---|---|
| `200 OK` | Request succeeded | Read operations, status updates, dashboard metrics | N/A |
| `201 Created` | Resource created | Action Taken creation | N/A |
| `400 Bad Request` | Validation failure / Resolution Gate failure / Terminal Ticket / Missing Header / Missing Timestamp | Missing follow-up note, invalid assignee, premature resolution, terminal ticket, missing idempotency header, missing expectedUpdatedAt timestamp | `BAD_REQUEST`, `INVALID_TRANSITION`, `TICKET_TERMINAL`, `MISSING_EXPECTED_UPDATED_AT`, `MISSING_IDEMPOTENCY_KEY` |
| `401 Unauthorized` | Unauthenticated / Invalid Token | Missing or revoked session token | `UNAUTHORIZED` |
| `403 Forbidden` | Access denied | Requester writing Action Taken, accessing staff dashboard, or accessing IT staff ticket queue | `FORBIDDEN` |
| `404 Not Found` | Resource does not exist | Invalid ticket or action ID | `NOT_FOUND` |
| `409 Conflict` | Stale update / Concurrency conflict / Idempotency key reused | Simultaneous ticket/action status updates or duplicate key payload mismatch | `STALE_UPDATE`, `IDEMPOTENCY_KEY_REUSED` |
| `500 Internal Server Error` | Unexpected server failure | Generic safe unhandled exception handling | `INTERNAL_ERROR` |
