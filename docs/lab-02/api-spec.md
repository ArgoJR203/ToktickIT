# Lab 2 REST API Specification

## 1. Overview & Context Architecture

The TokTickIT REST API provides backend services for ticket creation, retrieval, search, filtering, pagination, and attachment lifecycle management.

### Simulated Authentication & Ownership Context
Because full authentication is introduced in Lab 3, Lab 2 APIs simulate the active end-user context using the HTTP request header:
`x-requester-id: <number>`

All ticket and attachment endpoints enforce strict backend ownership checks:
- **`GET /api/tickets`**: Automatically filters results to return ONLY tickets where `ticket.requesterId == x-requester-id`.
- **`GET /api/tickets/:id`**: Rejects requests with `403 Forbidden` (or `404 Not Found`) if the requested ticket does not belong to `x-requester-id`.
- **`POST /api/tickets/:id/attachments`**: Rejects attachment uploads to tickets owned by another requester.
- **`DELETE /api/attachments/:id`**: Rejects attachment soft-removal unless the attachment's ticket belongs to `x-requester-id`.

---

## 2. Standard Data Schemas & TypeScript Types

### 2.1 Standard Error Format
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Validation failed for ticket creation.",
    "details": [
      { "field": "summary", "message": "Summary must be at least 5 characters long." }
    ]
  }
}
```

### 2.2 Paginated Response Format
```json
{
  "data": [ /* Array of Items */ ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 42,
    "totalPages": 5
  }
}
```

---

## 3. API Endpoints Specification

### 3.1 Fetch Active Development Requesters
- **Endpoint**: `GET /api/requesters`
- **Description**: Returns all active development requesters for the testing login dropdown screen. Inactive requesters are excluded.
- **Headers**: None required.
- **Success Response (200 OK)**:
```json
[
  {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@example.com",
    "isActive": true
  },
  {
    "id": 2,
    "name": "Sarah Johnson",
    "email": "sarah.johnson@example.com",
    "isActive": true
  }
]
```

---

### 3.2 Fetch Ticket Categories
- **Endpoint**: `GET /api/categories`
- **Description**: Retrieves all available ticket categories.
- **Success Response (200 OK)**:
```json
[
  { "id": 1, "name": "Account and Access" },
  { "id": 2, "name": "Hardware" },
  { "id": 3, "name": "Software" },
  { "id": 4, "name": "Network" }
]
```

---

### 3.3 Fetch Active Related Systems
- **Endpoint**: `GET /api/related-systems`
- **Description**: Retrieves active related systems for classification selection. Optionally filter by category query parameter (`?categoryId=1`).
- **Query Parameters**: `categoryId` (optional integer).
- **Success Response (200 OK)**:
```json
[
  { "id": 1, "name": "Email", "categoryId": 1, "isActive": true },
  { "id": 2, "name": "Campus Wi-Fi", "categoryId": 4, "isActive": true },
  { "id": 7, "name": "Corporate Laptop", "categoryId": 2, "isActive": true }
]
```

---

### 3.4 Fetch Owned Paginated Tickets (My Tickets)
- **Endpoint**: `GET /api/tickets`
- **Description**: Retrieves a paginated list of tickets owned by the current requester (`x-requester-id`).
- **Headers**: `x-requester-id: <number>` (Required).
- **Query Parameters**:
  - `search` (string, optional): Partial match against `ticketNumber` or `summary`.
  - `categoryId` (integer, optional): Filter by category.
  - `requestedPriority` (enum string, optional): `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
  - `currentStatus` (enum string, optional): `NEW`, `IN_PROGRESS`, `PENDING`, `RESOLVED`, `CLOSED`.
  - `sortBy` (string, optional, default: `createdAt`): `createdAt`, `ticketNumber`, `requestedPriority`, `currentStatus`.
  - `sortOrder` (string, optional, default: `desc`): `asc` or `desc`.
  - `page` (integer, optional, default: `1`): Page number (min 1).
  - `pageSize` (integer, optional, default: `10`): Items per page (1 to 50).
- **Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": 101,
      "ticketNumber": "TKT-2026-001234",
      "requesterId": 1,
      "summary": "Laptop battery drains quickly",
      "requestedPriority": "MEDIUM",
      "currentStatus": "NEW",
      "category": { "id": 2, "name": "Hardware" },
      "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
      "createdAt": "2026-05-12T09:14:00.000Z",
      "updatedAt": "2026-05-12T09:14:00.000Z",
      "_count": { "attachments": 2 }
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
- **Error Responses**:
  - `400 Bad Request`: Invalid query parameters.
  - `401 Unauthorized`: Missing `x-requester-id` header.

---

### 3.5 Create Ticket
- **Endpoint**: `POST /api/tickets`
- **Description**: Creates a new ticket for the active requester. Auto-generates official `ticketNumber` and sets `currentStatus = NEW`.
- **Headers**: `x-requester-id: <number>` (Required), `Content-Type: application/json`.
- **Request Body**:
```json
{
  "categoryId": 2,
  "relatedSystemId": 7,
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idling.",
  "requestedPriority": "MEDIUM"
}
```
- **Success Response (201 Created)**:
```json
{
  "id": 101,
  "ticketNumber": "TKT-2026-001234",
  "requesterId": 1,
  "categoryId": 2,
  "relatedSystemId": 7,
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idling.",
  "requestedPriority": "MEDIUM",
  "currentStatus": "NEW",
  "createdAt": "2026-05-12T09:14:00.000Z",
  "updatedAt": "2026-05-12T09:14:00.000Z"
}
```
- **Validation Rules & Errors (400 Bad Request)**:
  - Missing `categoryId` or `relatedSystemId` -> `INVALID_INPUT`.
  - `summary` length < 5 or > 100 -> `INVALID_INPUT`.
  - `description` length < 10 or > 2000 -> `INVALID_INPUT`.
  - Invalid `requestedPriority` -> `INVALID_INPUT`.

---

### 3.6 Fetch Owned Ticket Detail
- **Endpoint**: `GET /api/tickets/:id`
- **Description**: Retrieves full read-only ticket details including attachment metadata. Enforces ownership verification.
- **Headers**: `x-requester-id: <number>` (Required).
- **Success Response (200 OK)**:
```json
{
  "id": 101,
  "ticketNumber": "TKT-2026-001234",
  "requesterId": 1,
  "summary": "Laptop battery drains quickly",
  "description": "My laptop battery is draining much faster than usual even when idling.",
  "requestedPriority": "MEDIUM",
  "currentStatus": "NEW",
  "createdAt": "2026-05-12T09:14:00.000Z",
  "category": { "id": 2, "name": "Hardware" },
  "relatedSystem": { "id": 7, "name": "Corporate Laptop" },
  "requester": { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.anderson@example.com" },
  "attachments": [
    {
      "id": 501,
      "filename": "1715495640000-battery_report.pdf",
      "originalName": "battery_report.pdf",
      "mimeType": "application/pdf",
      "sizeBytes": 245120,
      "isRemoved": false,
      "createdAt": "2026-05-12T09:15:00.000Z"
    }
  ]
}
```
- **Error Responses**:
  - `403 Forbidden`: Requester does not own this ticket.
  - `404 Not Found`: Ticket ID does not exist.

---

### 3.7 Upload Attachment to Ticket
- **Endpoint**: `POST /api/tickets/:id/attachments`
- **Description**: Uploads a supporting file attachment to an owned ticket.
- **Headers**: `x-requester-id: <number>` (Required), `Content-Type: multipart/form-data`.
- **Form Data**: `file` (Binary File).
- **Success Response (201 Created)**:
```json
{
  "id": 502,
  "ticketId": 101,
  "originalName": "error_screenshot.png",
  "mimeType": "image/png",
  "sizeBytes": 1048576,
  "isRemoved": false,
  "createdAt": "2026-05-12T09:16:00.000Z"
}
```
- **Validation Rules & Errors**:
  - File size > 5 MB (5,242,880 bytes) -> `400 Bad Request` (`FILE_TOO_LARGE`).
  - Disallowed MIME type (not JPG, PNG, WEBP, PDF) -> `400 Bad Request` (`INVALID_FILE_TYPE`).
  - Active attachments count >= 5 -> `400 Bad Request` (`MAX_ATTACHMENTS_EXCEEDED`).
  - Ticket not owned by `x-requester-id` -> `403 Forbidden`.

---

### 3.8 Download Active Attachment File
- **Endpoint**: `GET /api/attachments/:id/download`
- **Description**: Binary stream download of an active attachment file.
- **Headers**: `x-requester-id: <number>` (Required).
- **Success Response (200 OK)**: Binary file stream with headers `Content-Type`, `Content-Disposition: attachment; filename="<originalName>"`.
- **Error Responses**:
  - `410 Gone`: Attachment was soft-removed (`isRemoved = true`). Message: *"This attachment was removed and cannot be downloaded."*
  - `403 Forbidden`: Requester does not own the associated ticket.
  - `404 Not Found`: Attachment ID does not exist.

---

### 3.9 Soft-Remove Attachment
- **Endpoint**: `DELETE /api/attachments/:id`
- **Description**: Soft-removes an attachment file. Sets `isRemoved = true`, stores `removalReason` and `removedAt`. Retains metadata record.
- **Headers**: `x-requester-id: <number>` (Required), `Content-Type: application/json`.
- **Request Body**:
```json
{
  "removalReason": "Uploaded duplicate file by mistake"
}
```
- **Success Response (200 OK)**:
```json
{
  "id": 501,
  "ticketId": 101,
  "originalName": "battery_report.pdf",
  "isRemoved": true,
  "removalReason": "Uploaded duplicate file by mistake",
  "removedAt": "2026-05-12T10:00:00.000Z"
}
```
- **Validation & Error Responses**:
  - Missing or `removalReason` < 3 chars -> `400 Bad Request` (`INVALID_REMOVAL_REASON`).
  - Attachment already removed -> `400 Bad Request` (`ALREADY_REMOVED`).
  - Ticket not owned by `x-requester-id` -> `403 Forbidden`.

---

## 4. Summary of Expected HTTP Status Codes

| Status Code | Meaning | Common Usage in TokTickIT |
| :--- | :--- | :--- |
| **200 OK** | Success | GET lists/details, DELETE soft removal. |
| **201 Created** | Resource Created | POST ticket creation, POST attachment upload. |
| **400 Bad Request** | Validation Failure | Invalid fields, file > 5MB, wrong file type, >5 active files. |
| **401 Unauthorized** | Missing Identity | Missing `x-requester-id` context header. |
| **403 Forbidden** | Ownership Violation | Attempting to access/modify another requester's ticket/attachment. |
| **404 Not Found** | Missing Resource | Non-existent ticket or attachment ID. |
| **410 Gone** | Soft-Removed File | Download attempt on a soft-removed attachment. |
| **500 Server Error** | Internal Failure | Unexpected database failure or disk I/O error. |
