# Sprint 3 REST API Specification: TokTickIT Users, Roles, IT Staff Ticketing, and Admin Screens

- **System Name**: TokTickIT
- **Sprint / Lab**: Lab 3 (Sprint 3)
- **Document Status**: Approved REST API Specification
- **Base URL**: `/api`

---

## 1. Authentication & Security Architecture

### 1.1 Authentication Mechanism & Expiration
- **Mechanism**: JSON Web Token (JWT) transmitted via HTTP-Only secure cookie (`token`) or `Authorization: Bearer <token>` header.
- **Token Payload**: Contains `userId`, `email`, `role`, and `requiresPasswordChange`.
- **Token Expiration**: Access token expires after **15 minutes**.
- **Real-Time DB Verification (BR-13 Enforcement)**: Auth middleware verifies `isActive` and `role` against the database on every authenticated request (not solely relying on static JWT claims claims), ensuring account deactivation or role changes take effect immediately on the user's next API request verification per BR-13.
- **Password Hashing**: Passwords are hashed using `bcrypt` (salt rounds = 10). Plaintext passwords are NEVER logged or stored.
- **Mandatory Password Change Enforcement**: If `requiresPasswordChange = true`, the auth middleware blocks access to all protected endpoints except `POST /api/auth/change-password`, `GET /api/auth/me`, and `POST /api/auth/logout`, returning `403 Forbidden` with error code `MUST_CHANGE_PASSWORD`.

### 1.2 Logout & Token Invalidation
- **Session Invalidation**: Calling `POST /api/auth/logout` adds the current token's signature/ID to a server-side memory/database token blocklist until token expiration, ensuring stateless tokens cannot be reused after logout.

### 1.3 CSRF & Security Protection
- **CSRF Mitigation**: Cookies use `SameSite=Strict` and `HttpOnly; Secure` attributes. Requests from SPA client include custom `X-Requested-With` header.
- **XSS & Input Sanitization**: All incoming string fields (especially comment/note content) are trimmed, validated for length (1-2000 chars), and HTML entity escaped before storage/rendering.

### 1.4 HTTP Status Code Standards
- **`200 OK`**: Successful request returning data.
- **`201 Created`**: Resource created successfully.
- **`400 Bad Request`**: Validation error, empty/whitespace content, malformed JSON, or invalid status transition.
- **`401 Unauthorized`**: Unauthenticated access, missing/invalid/expired token, or invalid login credentials (generic message).
- **`403 Forbidden`**: Authenticated but lacks required role / resource ownership, or account is inactive (`isActive=false`), or mandatory password change required.
- **`404 Not Found`**: Resource does not exist (or masked for security).
- **`409 Conflict`**: Duplicate email address or resource state conflict.
- **`500 Internal Server Error`**: Unexpected server error (sanitized message returned).

---

## 2. Authentication API Endpoints

### 2.1 Login
- **Method / Path**: `POST /api/auth/login`
- **Authentication**: Public
- **Request Body**:
```json
{
  "email": "user@example.com",
  "password": "Password123!"
}
```
- **Response `200 OK`**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "email": "user@example.com",
    "role": "REQUESTER",
    "isActive": true,
    "requiresPasswordChange": false
  }
}
```

> [!NOTE]
> The authoritative credential is the HTTP-Only `token` cookie (`SameSite=Strict; Secure`). The `token` value is additionally returned in the response body ONLY to support automated API tests and non-browser clients, which cannot read HTTP-Only cookies. The SPA client MUST rely on the cookie and MUST NOT persist the body token in `localStorage` or `sessionStorage`.

- **Response `401 Unauthorized`** (Safe Error for invalid credentials or inactive account):
```json
{
  "error": "UNAUTHORIZED",
  "message": "Invalid email address or password"
}
```

---

### 2.2 Logout
- **Method / Path**: `POST /api/auth/logout`
- **Authentication**: Authenticated
- **Response `200 OK`**:
```json
{
  "message": "Logged out successfully"
}
```

---

### 2.3 Current Authenticated User (`/auth/me`)
- **Method / Path**: `GET /api/auth/me`
- **Authentication**: Authenticated
- **Response `200 OK`**:
```json
{
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "email": "user@example.com",
    "role": "REQUESTER",
    "isActive": true,
    "requiresPasswordChange": false
  }
}
```

---

### 2.4 Mandatory Password Change
- **Method / Path**: `POST /api/auth/change-password`
- **Authentication**: Authenticated (including users flagged with `requiresPasswordChange = true`)
- **Request Body**:
```json
{
  "currentPassword": "InitialPassword123!",
  "newPassword": "MyNewSecurePassword456!",
  "confirmPassword": "MyNewSecurePassword456!"
}
```
- **Response `200 OK`**:
```json
{
  "message": "Password changed successfully",
  "user": {
    "id": 1,
    "name": "Jane Doe",
    "email": "user@example.com",
    "role": "REQUESTER",
    "isActive": true,
    "requiresPasswordChange": false
  }
}
```
- **Response `400 Bad Request`**:
```json
{
  "error": "VALIDATION_ERROR",
  "message": "New password must be at least 8 characters and match confirm password"
}
```

---

## 3. IT Staff Ticket Queue & Operations APIs

### 3.1 IT Staff Ticket Queue Retrieval
- **Method / Path**: `GET /api/tickets`
- **Authentication**: IT Staff Only (`requireRole('IT_STAFF')`)
- **Query Parameters**:
  - `q` (string, optional): Search keyword matching `ticketNumber`, `summary`, or `description`.
  - `status` (string, optional): Filter by status (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
  - `requestedPriority` (string, optional): Filter by `requestedPriority` (`Priority` enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - `itPriority` (string, optional): Filter by `itPriority` (`Priority` enum: `LOW`, `MEDIUM`, `HIGH`, `URGENT`).
  - `owner` (string, optional): Ownership filter (`all`, `my_queue`, `unassigned`).
  - `sortBy` (string, optional, default `createdAt`): Sort field (`createdAt`, `itPriority`, `updatedAt`, `ticketNumber`).
  - `sortDir` (string, optional, default `desc`): `asc` or `desc`.
  - `page` (integer, optional, default `1`): Page number (1-indexed).
  - `limit` (integer, optional, default `10`): Items per page (max 50).
- **Response `200 OK`**:
```json
{
  "data": [
    {
      "id": "c1f7a240-...",
      "ticketNumber": "TKT-2026-000001",
      "summary": "Laptop battery drains quickly",
      "category": { "id": 1, "name": "Hardware" },
      "relatedSystem": { "id": 2, "name": "Corporate Laptop" },
      "requestedPriority": "MEDIUM",
      "itPriority": "HIGH",
      "currentStatus": "IN_PROGRESS",
      "requester": { "id": 4, "name": "Jennifer Anderson", "email": "jennifer@example.com" },
      "owner": { "id": 2, "name": "Michael Brown", "email": "michael@example.com" },
      "createdAt": "2026-09-10T08:00:00.000Z",
      "updatedAt": "2026-09-12T10:30:00.000Z"
    }
  ],
  "pagination": {
    "total": 67,
    "page": 1,
    "limit": 10,
    "totalPages": 7
  }
}
```

---

### 3.2 Retrieve Single Ticket Detail
- **Method / Path**: `GET /api/tickets/:id`
- **Authentication**: Authenticated (Requester if ticket owner, IT Staff, Administrator)
- **Response `200 OK`**:
```json
{
  "id": "c1f7a240-...",
  "ticketNumber": "TKT-2026-000001",
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual.",
  "requestedPriority": "MEDIUM",
  "itPriority": "HIGH",
  "currentStatus": "IN_PROGRESS",
  "requester": { "id": 4, "name": "Jennifer Anderson", "email": "jennifer@example.com" },
  "owner": { "id": 2, "name": "Michael Brown", "email": "michael@example.com" },
  "category": { "id": 1, "name": "Hardware" },
  "relatedSystem": { "id": 2, "name": "Corporate Laptop" },
  "attachments": [],
  "createdAt": "2026-09-10T08:00:00.000Z",
  "updatedAt": "2026-09-12T10:30:00.000Z"
}
```

---

### 3.3 Claim Ticket Ownership
- **Method / Path**: `POST /api/tickets/:id/claim`
- **Authentication**: IT Staff & Administrator (`requireRole('IT_STAFF', 'ADMINISTRATOR')`)
- **Response `200 OK`**:
```json
{
  "message": "Ticket claimed successfully",
  "ticket": {
    "id": "c1f7a240-...",
    "ticketNumber": "TKT-2026-000001",
    "ownerId": 2,
    "owner": { "id": 2, "name": "Michael Brown" }
  }
}
```

---

### 3.4 Reassign Ticket Ownership
- **Method / Path**: `PUT /api/tickets/:id/assign`
- **Authentication**: IT Staff & Administrator (`requireRole('IT_STAFF', 'ADMINISTRATOR')`)
- **Request Body**:
```json
{
  "ownerId": 3
}
```
- **Response `200 OK`**:
```json
{
  "message": "Ticket owner updated successfully",
  "ticket": {
    "id": "c1f7a240-...",
    "ownerId": 3,
    "owner": { "id": 3, "name": "Sarah Johnson" }
  }
}
```

---

### 3.5 Update IT Priority
- **Method / Path**: `PUT /api/tickets/:id/priority`
- **Authentication**: IT Staff Only (`requireRole('IT_STAFF')`)
- **Request Body**:
```json
{
  "itPriority": "HIGH"
}
```
- **Response `200 OK`**:
```json
{
  "message": "IT priority updated successfully",
  "ticket": {
    "id": "c1f7a240-...",
    "itPriority": "HIGH"
  }
}
```

---

### 3.6 Perform Ticket Status Transition
- **Method / Path**: `PUT /api/tickets/:id/status`
- **Authentication**: IT Staff Only (`requireRole('IT_STAFF')`)
- **Request Body**:
```json
{
  "status": "IN_PROGRESS"
}
```
- **Response `200 OK`**:
```json
{
  "message": "Ticket status updated successfully",
  "ticket": {
    "id": "c1f7a240-...",
    "currentStatus": "IN_PROGRESS"
  }
}
```
- **Response `400 Bad Request`** (Invalid Status Transition):
```json
{
  "error": "INVALID_TRANSITION",
  "message": "Transition from NEW to RESOLVED is not allowed by the Status Transition Matrix"
}
```

---

### 3.7 Requester "Problem Appears Resolved" Indicator
- **Method / Path**: `POST /api/tickets/:id/resolve-indicator`
- **Authentication**: Requester Only, ticket owner (`requireRole('REQUESTER')` + ownership check)
- **Permitted Ticket Statuses**: `IN_PROGRESS`, `WAITING_FOR_REQUESTER`
- **Effect**: Sets `requesterResolvedIndicatedAt` and creates a system-authored Public Comment. `currentStatus` is NOT modified (BR-05).
- **Response `200 OK`**:
```json
{
  "message": "Requester indicated that the problem appears resolved. IT Staff will review for formal resolution.",
  "ticket": {
    "id": "c1f7a240-...",
    "currentStatus": "IN_PROGRESS",
    "requesterResolvedIndicatedAt": "2026-09-15T09:20:00.000Z"
  }
}
```
- **Response `400 Bad Request`** (ticket not in a permitted status):
```json
{
  "error": "INVALID_STATE",
  "message": "This action is not available for the current ticket status"
}
```
- **Response `403 Forbidden`** (non-owner Requester, IT Staff, or Administrator):
```json
{
  "error": "FORBIDDEN",
  "message": "Access denied"
}
```

---

### 3.8 Requester Reopen Request
- **Method / Path**: `POST /api/tickets/:id/reopen-request`
- **Authentication**: Requester Only, ticket owner (`requireRole('REQUESTER')` + ownership check)
- **Permitted Ticket Statuses**: `RESOLVED`, `CLOSED`
- **Effect**: Sets `requesterReopenRequestedAt` and creates a system-authored Public Comment. `currentStatus` is NOT modified; only IT Staff may transition the ticket to `REOPENED` (BR-05).
- **Response `200 OK`**:
```json
{
  "message": "Reopen request recorded. IT Staff will review the ticket.",
  "ticket": {
    "id": "c1f7a240-...",
    "currentStatus": "RESOLVED",
    "requesterReopenRequestedAt": "2026-09-15T09:25:00.000Z"
  }
}
```
- **Response `400 Bad Request`** (ticket not in `RESOLVED` or `CLOSED`):
```json
{
  "error": "INVALID_STATE",
  "message": "This action is not available for the current ticket status"
}
```

---

## 4. Comments & Notes APIs

### 4.1 Retrieve Public Comments
- **Method / Path**: `GET /api/tickets/:id/comments`
- **Authentication**: Requester (ticket owner), IT Staff, Administrator
- **Response `200 OK`**:
```json
{
  "comments": [
    {
      "id": "a9b8c7-...",
      "ticketId": "c1f7a240-...",
      "authorId": 1,
      "author": { "id": 1, "name": "Jane Doe", "role": "REQUESTER" },
      "content": "Thank you for the update. Please check the RAM module.",
      "createdAt": "2026-09-14T11:45:00.000Z"
    }
  ]
}
```

---

### 4.2 Post Public Comment
- **Method / Path**: `POST /api/tickets/:id/comments`
- **Authentication**: Requester (ticket owner), IT Staff, Administrator
- **Request Body**:
```json
{
  "content": "Thank you for the update. The issue is fixed now."
}
```
- **Response `201 Created`**:
```json
{
  "id": "a9b8c7-...",
  "ticketId": "c1f7a240-...",
  "authorId": 1,
  "author": { "id": 1, "name": "Jane Doe", "role": "REQUESTER" },
  "content": "Thank you for the update. The issue is fixed now.",
  "createdAt": "2026-09-14T11:45:00.000Z"
}
```
- **Response `400 Bad Request`** (Empty or whitespace-only content):
```json
{
  "error": "VALIDATION_ERROR",
  "message": "Comment content cannot be empty or whitespace-only"
}
```

---

### 4.3 Retrieve Internal Notes (Role Restricted)
- **Method / Path**: `GET /api/tickets/:id/notes`
- **Authentication**: IT Staff & Administrator ONLY (`requireRole('IT_STAFF', 'ADMINISTRATOR')`)
- **Response `200 OK`**:
```json
{
  "notes": [
    {
      "id": "d4e5f6-...",
      "ticketId": "c1f7a240-...",
      "authorId": 2,
      "author": { "id": 2, "name": "Michael Brown", "role": "IT_STAFF" },
      "content": "Replaced RAM module on device. User testing required before formal resolution.",
      "createdAt": "2026-09-14T12:00:00.000Z"
    }
  ]
}
```
- **Response `403 Forbidden`** (When requested by Requester role - content masked):
```json
{
  "error": "FORBIDDEN",
  "message": "Access denied"
}
```

---

### 4.4 Post Internal Note (Role Restricted)
- **Method / Path**: `POST /api/tickets/:id/notes`
- **Authentication**: IT Staff & Administrator ONLY (`requireRole('IT_STAFF', 'ADMINISTRATOR')`)
- **Request Body**:
```json
{
  "content": "Replaced RAM module on device. User testing required before formal resolution."
}
```
- **Response `201 Created`**:
```json
{
  "id": "d4e5f6-...",
  "ticketId": "c1f7a240-...",
  "authorId": 2,
  "author": { "id": 2, "name": "Michael Brown", "role": "IT_STAFF" },
  "content": "Replaced RAM module on device. User testing required before formal resolution.",
  "createdAt": "2026-09-14T12:00:00.000Z"
}
```

---

## 5. Administrator User Management APIs

### 5.1 List Users
- **Method / Path**: `GET /api/admin/users`
- **Authentication**: Administrator Only (`requireRole('ADMINISTRATOR')`)
- **Query Parameters**:
  - `q` (string, optional): Search keyword matching `name` or `email`.
  - `role` (string, optional): Filter by role (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`).
- **Response `200 OK`**:
```json
{
  "users": [
    {
      "id": 1,
      "name": "Jane Doe",
      "email": "jane@example.com",
      "role": "REQUESTER",
      "isActive": true,
      "requiresPasswordChange": false,
      "createdAt": "2026-09-01T00:00:00.000Z"
    }
  ]
}
```

---

### 5.2 Create User
- **Method / Path**: `POST /api/admin/users`
- **Authentication**: Administrator Only (`requireRole('ADMINISTRATOR')`)
- **Request Body**:
```json
{
  "name": "Alex Thompson",
  "email": "alex.thompson@example.com",
  "role": "IT_STAFF",
  "isActive": true,
  "initialPassword": "InitialPassword123!"
}
```
- **Response `201 Created`**:
```json
{
  "message": "User created successfully",
  "user": {
    "id": 10,
    "name": "Alex Thompson",
    "email": "alex.thompson@example.com",
    "role": "IT_STAFF",
    "isActive": true,
    "requiresPasswordChange": true,
    "createdAt": "2026-09-14T14:00:00.000Z"
  }
}
```
- **Response `409 Conflict`** (Duplicate Email):
```json
{
  "error": "DUPLICATE_EMAIL",
  "message": "A user with this email address already exists"
}
```

---

### 5.3 Edit User
- **Method / Path**: `PUT /api/admin/users/:id`
- **Authentication**: Administrator Only (`requireRole('ADMINISTRATOR')`)
- **Request Body**:
```json
{
  "name": "Alex Thompson",
  "email": "alex.thompson@example.com",
  "role": "IT_STAFF",
  "isActive": false
}
```
- **Response `200 OK`**:
```json
{
  "message": "User updated successfully",
  "user": {
    "id": 10,
    "name": "Alex Thompson",
    "email": "alex.thompson@example.com",
    "role": "IT_STAFF",
    "isActive": false,
    "requiresPasswordChange": true
  }
}
```
- **Response `400 Bad Request`** (Self-deactivation or Last Admin protection):
```json
{
  "error": "INVALID_ADMIN_ACTION",
  "message": "Administrators cannot deactivate their own account or deactivate the last active Administrator"
}
```

---

### 5.4 Reset Initial Password
- **Method / Path**: `POST /api/admin/users/:id/password`
- **Authentication**: Administrator Only (`requireRole('ADMINISTRATOR')`)
- **Request Body**:
```json
{
  "initialPassword": "NewInitialPass123!"
}
```
- **Response `200 OK`**:
```json
{
  "message": "New initial password set successfully. User will be required to change password at next login.",
  "user": {
    "id": 10,
    "requiresPasswordChange": true
  }
}
```
