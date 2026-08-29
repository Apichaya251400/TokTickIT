# TokTickIT REST API Specification: Lab 2 Requester MVP

## 1. Overview & Base Path

- **Base Path**: `/api`
- **Content-Type**: `application/json` (except multipart file upload endpoints)
- **Protocol**: HTTP / HTTPS
- **Public Ticket Identifier**: `ticketNumber`
- **Resource Identifier Format**: `Ticket.id` and `Attachment.id` are String UUIDs (e.g. `c3b8a1e2-5f6d-4e2b-9f1c-8d7e6a5b4c3d`). Path parameters `:id` for Ticket and Attachment resources are String UUIDs (never integers). `X-Requester-Id`, `categoryId`, and `relatedSystemId` are positive integers.

---

## 2. Requester Context Header

Requester context is a development and testing mechanism for Lab 2 (not authentication). Active Development Requesters are retrieved via `GET /api/requesters/active`.

All protected endpoints require the following request header:

```text
X-Requester-Id: <positive_integer>
```

### Context Header Rules

- **Missing, Empty, Non-numeric, or `<= 0`**: Returns `400 Bad Request`.
  ```json
  {
    "error": {
      "code": "INVALID_REQUESTER_HEADER",
      "message": "Header X-Requester-Id must be a positive integer."
    }
  }
  ```
- **Unknown or Inactive Requester ID**: Returns `403 Forbidden`.
  ```json
  {
    "error": {
      "code": "FORBIDDEN_REQUESTER",
      "message": "Specified requester is unknown or inactive."
    }
  }
  ```

Do not use query parameters (e.g. `?requesterId=`) for requester context transport.

---

## 3. Standard Error Response Envelope

All non-2xx responses use a consistent error envelope where `"details"` is **OPTIONAL**:

```json
{
  "error": {
    "code": "STRING_CODE",
    "message": "Human readable error message.",
    "details": []
  }
}
```

A response without `"details"` (e.g. resource not found) is completely valid:

```json
{
  "error": {
    "code": "TICKET_NOT_FOUND",
    "message": "Ticket not found."
  }
}
```

When field-level validation fails, `"details"` contains field error objects:

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "One or more validation constraints failed.",
    "details": [
      { "field": "summary", "message": "Summary must be between 10 and 120 characters." }
    ]
  }
}
```

### Standard HTTP Status Codes

- `200 OK`: Successful retrieval or soft removal.
- `201 Created`: Resource (Ticket or Attachment) created successfully.
- `400 Bad Request`: Validation failure, invalid body, missing/invalid header or query/path param.
- `403 Forbidden`: Unknown or inactive requester ID specified in `X-Requester-Id`.
- `404 Not Found`: Resource does not exist OR belongs to another Requester.
- `409 Conflict`: Duplicate submission, active attachment limit reached, or soft-removed file access.
- `413 Payload Too Large`: Attachment exceeds 5,000,000 bytes (`MAX_FILE_SIZE_BYTES = 5_000_000`).
- `415 Unsupported Media Type`: File type not in `[JPG, JPEG, PNG, WEBP, PDF]`.
- `500 Internal Server Error`: Unexpected server-side failure.

---

## 4. Endpoints Specification

### 4.1 Reference Data (Public)

#### `GET /api/requesters/active`
- **Description**: Returns active Development Requesters for selector dropdown. Inactive requesters are excluded.
- **Header**: Optional.
- **Response `200 OK`**:
  ```json
  [
    { "id": 1, "name": "Alice Smith", "email": "alice@example.com" },
    { "id": 2, "name": "Bob Jones", "email": "bob@example.com" }
  ]
  ```

#### `GET /api/categories`
- **Description**: Returns active Ticket Categories.
- **Header**: Optional.
- **Response `200 OK`**:
  ```json
  [
    { "id": 1, "name": "Account and Access" },
    { "id": 2, "name": "Hardware" },
    { "id": 3, "name": "Software" },
    { "id": 4, "name": "Network" }
  ]
  ```

#### `GET /api/related-systems`
- **Description**: Returns active Related Systems.
- **Header**: Optional.
- **Response `200 OK`**:
  ```json
  [
    { "id": 1, "name": "Email" },
    { "id": 2, "name": "Campus Wi-Fi" },
    { "id": 3, "name": "VPN" },
    { "id": 4, "name": "LEB2 App" },
    { "id": 5, "name": "Grade Submission App" },
    { "id": 6, "name": "Printer" },
    { "id": 7, "name": "Corporate Laptop" }
  ]
  ```

---

### 4.2 Ticket Management (Protected)

#### `POST /api/tickets`
- **Description**: Creates a new IT Support Ticket.
- **Header**: `X-Requester-Id: <id>` (Required positive integer)
- **Request Body**:
  ```json
  {
    "categoryId": 1,
    "relatedSystemId": 1,
    "requestedPriority": "HIGH",
    "summary": "Cannot access email account",
    "description": "I have been unable to log into my corporate email account since morning."
  }
  ```
- **Validations**:
  - `categoryId`: required positive integer, must reference active Category (`400 Bad Request`).
  - `relatedSystemId`: required positive integer, must reference active Related System (`400 Bad Request`).
  - `requestedPriority`: required enum `["LOW", "MEDIUM", "HIGH", "URGENT"]` (`400 Bad Request`).
  - `summary`: required string, 10–120 characters after trimming (`400 Bad Request`). Whitespace-only invalid.
  - `description`: required string, 20–2,000 characters after trimming (`400 Bad Request`). Whitespace-only invalid.
- **Duplicate Protection**:
  - Duplicate submission means repeated submission of the same ticket creation request while the previous submission is still being processed. Repeated submission during processing returns HTTP 409 Conflict.
- **Response `201 Created`**:
  ```json
  {
    "id": "c3b8a1e2-5f6d-4e2b-9f1c-8d7e6a5b4c3d",
    "ticketNumber": "TKT-2026-000001",
    "requesterId": 1,
    "categoryId": 1,
    "relatedSystemId": 1,
    "requestedPriority": "HIGH",
    "currentStatus": "NEW",
    "summary": "Cannot access email account",
    "description": "I have been unable to log into my corporate email account since morning.",
    "createdAt": "2026-08-25T09:00:00.000Z",
    "updatedAt": "2026-08-25T09:00:00.000Z"
  }
  ```

#### `GET /api/tickets`
- **Description**: Returns paginated list of tickets owned by the requesting user.
- **Header**: `X-Requester-Id: <id>` (Required positive integer)
- **Query Parameters**:
  - `search` (optional string): Substring match against `ticketNumber`, `summary`, `description` (case-insensitive, trimmed).
  - `categoryId` (optional int): Filter by Category ID.
  - `relatedSystemId` (optional int): Filter by Related System ID.
  - `requestedPriority` (optional enum): `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
  - `currentStatus` (optional enum): `NEW`.
  - `sortBy` (optional string): `createdAt` (default), `updatedAt`, `ticketNumber`, `requestedPriority`.
  - `sortOrder` (optional string): `asc`, `desc` (default `desc`).
  - `page` (optional int): Page number starting at 1 (default 1).
  - `pageSize` (optional int): 10 (default), 20, 50.
- **Sorting Logic**:
  - `requestedPriority` sorts by severity: `URGENT` > `HIGH` > `MEDIUM` > `LOW`.
  - Secondary sort is strictly `id DESC`.
- **Response `200 OK`**:
  ```json
  {
    "data": [
      {
        "id": "c3b8a1e2-5f6d-4e2b-9f1c-8d7e6a5b4c3d",
        "ticketNumber": "TKT-2026-000001",
        "summary": "Cannot access email account",
        "categoryName": "Account and Access",
        "relatedSystemName": "Email",
        "requestedPriority": "HIGH",
        "currentStatus": "NEW",
        "createdAt": "2026-08-25T09:00:00.000Z",
        "updatedAt": "2026-08-25T09:00:00.000Z"
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
  - Note: Requesting a page beyond `totalPages` returns `200 OK` with `"data": []`.

#### `GET /api/tickets/:id`
- **Description**: Returns complete ticket detail including attachments metadata for an owned ticket.
- **Header**: `X-Requester-Id: <id>` (Required positive integer)
- **Path Parameter**: `:id` is a String UUID. If `:id` is invalid UUID format -> `400 Bad Request`.
- **Ownership Verification**:
  - If ticket does not exist OR belongs to another requester: returns `404 Not Found`.
  ```json
  {
    "error": {
      "code": "TICKET_NOT_FOUND",
      "message": "Ticket not found."
    }
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "id": "c3b8a1e2-5f6d-4e2b-9f1c-8d7e6a5b4c3d",
    "ticketNumber": "TKT-2026-000001",
    "requester": { "id": 1, "name": "Alice Smith", "email": "alice@example.com" },
    "category": { "id": 1, "name": "Account and Access" },
    "relatedSystem": { "id": 1, "name": "Email" },
    "requestedPriority": "HIGH",
    "currentStatus": "NEW",
    "summary": "Cannot access email account",
    "description": "I have been unable to log into my corporate email account since morning.",
    "createdAt": "2026-08-25T09:00:00.000Z",
    "updatedAt": "2026-08-25T09:00:00.000Z",
    "attachments": [
      {
        "id": "f47ac10b-58cc-4372-a567-0e02b2c3d4e5",
        "fileName": "error-screenshot.png",
        "fileSize": 245760,
        "mimeType": "image/png",
        "uploadedAt": "2026-08-25T09:05:00.000Z",
        "removedAt": null,
        "removalReason": null,
        "isRemoved": false
      }
    ]
  }
  ```

---

### 4.3 Attachment Management (Protected)

#### `POST /api/tickets/:id/attachments`
- **Description**: Uploads a single attachment to an existing ticket.
- **Header**: `X-Requester-Id: <id>` (Required positive integer)
- **Path Parameter**: `:id` is a String UUID.
- **Content-Type**: `multipart/form-data` (form field: `file`)
- **Evaluation Order**:
  1. Validate `X-Requester-Id` header context (`400` if missing/invalid, `403` if unknown/inactive).
  2. Resolve ticket within requester's ownership scope (`404 Not Found` if ticket not found or owned by another requester).
  3. Validate file boundaries and limits.
- **Rules & Boundaries**:
  - `MAX_FILE_SIZE_BYTES = 5_000_000` (5 MB).
    - `4,999,999` bytes -> Accepted (`201`).
    - `5,000,000` bytes -> Accepted (`201`).
    - `5,000,001` bytes -> Rejected (`413 Payload Too Large`).
  - Allowed types: `JPG`, `JPEG`, `PNG`, `WEBP`, `PDF` (`415 Unsupported Media Type`).
  - Filename Sanitization (BR-16): Unsafe path elements (e.g. `../secret.txt`, `..\secret.txt`) must be sanitized to basename before storage.
  - Maximum 5 ACTIVE attachments per ticket. Soft-removed attachments do NOT count toward the active limit. If a ticket has 5 active attachments, uploading a 6th fails with `409 Conflict`. If 1 of 5 active attachments is soft-removed (resulting in 4 active attachments and 1 soft-removed attachment), uploading a new attachment succeeds with `201 Created` (tested by `API-32`).
- **Response `201 Created`**:
  ```json
  {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d4e5",
    "ticketId": "c3b8a1e2-5f6d-4e2b-9f1c-8d7e6a5b4c3d",
    "fileName": "error-screenshot.png",
    "fileSize": 245760,
    "mimeType": "image/png",
    "uploadedAt": "2026-08-25T09:05:00.000Z",
    "isRemoved": false
  }
  ```

#### `GET /api/attachments/:id/download`
- **Description**: Downloads an active attachment file stream.
- **Header**: `X-Requester-Id: <id>` (Required positive integer)
- **Path Parameter**: `:id` is a String UUID.
- **Evaluation Order**:
  1. Validate `X-Requester-Id` header context (`400` / `403`).
  2. Resolve attachment within requester's ownership scope. If attachment does not exist OR belongs to another requester -> `404 Not Found`.
  3. Evaluate soft-removed state. If attachment `removedAt` is not null -> `409 Conflict`:
  ```json
  {
    "error": {
      "code": "ATTACHMENT_REMOVED",
      "message": "This attachment has been removed and is no longer available for download."
    }
  }
  ```
- **Response `200 OK`**:
  - Header: `Content-Type: <mimeType>`
  - Header: `Content-Disposition: attachment; filename="error-screenshot.png"`
  - Body: Binary stream

#### `DELETE /api/attachments/:id`
- **Description**: Soft-removes an attachment by setting `removedAt` and `removalReason`.
- **Header**: `X-Requester-Id: <id>` (Required positive integer)
- **Path Parameter**: `:id` is a String UUID.
- **Evaluation Order**:
  1. Validate `X-Requester-Id` header context (`400` / `403`).
  2. Resolve attachment within requester's ownership scope. If attachment does not exist OR belongs to another requester -> `404 Not Found`.
  3. Evaluate soft-removed state. If already soft-removed -> `409 Conflict`.
  4. Validate `removalReason` body parameter (required string, 5–200 chars after trimming).
- **Response `200 OK`**:
  ```json
  {
    "id": "f47ac10b-58cc-4372-a567-0e02b2c3d4e5",
    "fileName": "error-screenshot.png",
    "removedAt": "2026-08-25T09:10:00.000Z",
    "removalReason": "Uploaded wrong screenshot file.",
    "isRemoved": true
  }
  ```
