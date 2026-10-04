# Lab 4 REST API Specification

## 1. Overview & Authentication Architecture

The TokTickIT Lab 4 REST API expands the authenticated services established in Lab 3 with endpoints for **Actions Taken**, authoritative **Ticket Workflow & Optimistic Concurrency**, and **Role-Appropriate Operational Dashboards**.

### 1.1 Authentication & Session Handling
- **Bearer Token**: Transmitted via HTTP header:
  `Authorization: Bearer <jwt-token>`
  or via secure session cookie `toktickit_session`.
- **JWT Claims Payload**:
  ```json
  {
    "userId": 2,
    "email": "sarah.chen@toktickit.com",
    "role": "IT_STAFF",
    "mustChangePassword": false,
    "exp": 1773289200
  }
  ```
- **Server-Side Token Revocation**:
  - Logout (`POST /api/auth/logout`) enters the token into the server-side Token Revocation Store with a TTL matching remaining token validity.
  - The `authenticate` middleware checks the token against the revocation blocklist on every protected request. Revoked tokens are immediately rejected with `401 Unauthorized` (`code: "TOKEN_REVOKED"`).

### 1.2 Middleware Authorization Pipeline
1. `authenticate`: Verifies JWT signature and claims, checks revocation blocklist, confirms user `isActive === true`. Returns `401 Unauthorized` if invalid.
2. `enforcePasswordChange`: Blocks functional access with `403 Forbidden` (`code: "PASSWORD_CHANGE_REQUIRED"`) if `user.mustChangePassword === true`.
3. `requireRole(Role...)`: Verifies that the authenticated user possesses an authorized role; otherwise returns `403 Forbidden` (`code: "FORBIDDEN_ROLE"`).
4. `requireTicketAccess`: For ticket-specific resources, ensures Requesters can only access their owned tickets (`ticket.requesterId === authUser.id`), while IT Staff and Administrators have access to all system tickets.

---

## 2. Standard Error & Response Schemas

### 2.1 Standard Error Envelope
All error responses adhere to the unified envelope:
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Validation failed for requested operation.",
    "details": [
      {
        "field": "followUpNote",
        "message": "Follow-up note is required when follow-up is requested."
      }
    ]
  }
}
```

### 2.2 Error Codes Reference
| HTTP Status | Error Code | Meaning & Scenario |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_INPUT` | Payload fields failed schema validation or boundary constraints. |
| `400 Bad Request` | `INVALID_TRANSITION` | Ticket status change violates the permitted transition matrix (`BR-10`). |
| `401 Unauthorized` | `UNAUTHENTICATED` | Missing, expired, or revoked authentication credentials. |
| `403 Forbidden` | `FORBIDDEN_ROLE` | Authenticated user lacks role permissions for the endpoint. |
| `403 Forbidden` | `OWNERSHIP_VIOLATION` | Requester attempted to access a ticket owned by another user. |
| `404 Not Found` | `NOT_FOUND` | Resource not found or hidden for security isolation. |
| `409 Conflict` | `STALE_UPDATE` | Optimistic locking conflict: ticket was concurrently updated by another user (`BR-13`). |
| `422 Unprocessable` | `UNPROCESSABLE_ENTITY` | Semantic business rule failed (e.g. missing resolution summary). |

---

## 3. Actions Taken Endpoints

### 3.1 List Actions Taken for Ticket
- **Endpoint**: `GET /api/tickets/:id/actions-taken`
- **Access**:
  - `REQUESTER`: Permitted **only** if `ticket.requesterId === authUser.id` (returns 403 otherwise).
  - `IT_STAFF`: Permitted for all accessible tickets.
  - `ADMINISTRATOR`: Permitted for all tickets.
- **Success Response (200 OK)**:
```json
{
  "ticketId": 42,
  "actionsTaken": [
    {
      "id": 101,
      "ticketId": 42,
      "performedById": 2,
      "performedBy": {
        "id": 2,
        "name": "Sarah Chen",
        "email": "sarah.chen@toktickit.com",
        "role": "IT_STAFF"
      },
      "actionDateTime": "2026-05-12T10:15:00.000Z",
      "description": "Replaced degraded battery unit with genuine spare part.",
      "result": "Passed all hardware diagnostics tests; battery health 100%.",
      "followUpRequired": false,
      "followUpNote": null,
      "attachmentNotes": "See battery_diagnostic_report.pdf in Attachments tab.",
      "createdAt": "2026-05-12T10:16:00.000Z",
      "updatedAt": "2026-05-12T10:16:00.000Z"
    },
    {
      "id": 102,
      "ticketId": 42,
      "performedById": 3,
      "performedBy": {
        "id": 3,
        "name": "Michael Adams",
        "email": "michael.adams@toktickit.com",
        "role": "IT_STAFF"
      },
      "actionDateTime": "2026-05-11T14:30:00.000Z",
      "description": "Performed thermal inspection and power cycle benchmark.",
      "result": "Battery discharge rate exceeds threshold by 45%.",
      "followUpRequired": true,
      "followUpNote": "Order replacement battery from central hardware inventory.",
      "attachmentNotes": null,
      "createdAt": "2026-05-11T14:32:00.000Z",
      "updatedAt": "2026-05-11T14:32:00.000Z"
    }
  ]
}
```

---

### 3.2 Create Action Taken
- **Endpoint**: `POST /api/tickets/:id/actions-taken`
- **Access**: `IT_STAFF`, `ADMINISTRATOR` (Requesters receive `403 Forbidden`).
- **Request Body**:
```json
{
  "actionDateTime": "2026-05-12T10:15:00.000Z",
  "description": "Replaced degraded battery unit with genuine spare part.",
  "result": "Passed all hardware diagnostics tests; battery health 100%.",
  "followUpRequired": true,
  "followUpNote": "Verify battery status with requester after 48 hours of normal usage.",
  "attachmentNotes": "Refer to battery_diagnostic_report.pdf in Attachments."
}
```
- **Validation Rules**:
  - `actionDateTime`: Optional ISO 8601 string. If omitted, server assigns `now()`. Cannot be in the future (`<= now()`).
  - `description`: String, required, 1 to 2000 characters after trimming whitespace.
  - `result`: String, required, 1 to 2000 characters after trimming whitespace.
  - `followUpRequired`: Boolean, optional (default `false`).
  - `followUpNote`: String (1 to 1000 characters). Strictly required if `followUpRequired === true`. Must be null/empty if `false`.
  - `attachmentNotes`: String, optional (0 to 500 characters).
  - `performedById`: Auto-populated from the authenticated JWT session (`req.user.id`). Any client-supplied `performedById` is ignored.
- **Success Response (201 Created)**:
```json
{
  "id": 103,
  "ticketId": 42,
  "performedById": 2,
  "performedBy": {
    "id": 2,
    "name": "Sarah Chen",
    "email": "sarah.chen@toktickit.com",
    "role": "IT_STAFF"
  },
  "actionDateTime": "2026-05-12T10:15:00.000Z",
  "description": "Replaced degraded battery unit with genuine spare part.",
  "result": "Passed all hardware diagnostics tests; battery health 100%.",
  "followUpRequired": true,
  "followUpNote": "Verify battery status with requester after 48 hours of normal usage.",
  "attachmentNotes": "Refer to battery_diagnostic_report.pdf in Attachments.",
  "createdAt": "2026-05-12T10:16:00.000Z",
  "updatedAt": "2026-05-12T10:16:00.000Z"
}
```

---

### 3.3 Update Action Taken
- **Endpoint**: `PATCH /api/tickets/:id/actions-taken/:actionId`
- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Request Body** (Partial updates supported):
```json
{
  "description": "Updated action description with revised calibration data.",
  "result": "Output calibrated to standard operating parameters.",
  "followUpRequired": false,
  "followUpNote": null,
  "attachmentNotes": "Added calibration log to Attachments."
}
```
- **Behavior**:
  - Updates the specified fields.
  - Preserves original `id`, `ticketId`, `performedById`, and `createdAt`.
  - Updates `updatedAt` timestamp.
- **Success Response (200 OK)**: Returns the updated Action Taken object.

---

## 4. Ticket Workflow & Optimistic Concurrency Endpoints

### 4.1 Update Ticket Status (with Concurrency Protection)
- **Endpoint**: `PATCH /api/staff/tickets/:id/status`
- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Request Body**:
```json
{
  "currentStatus": "RESOLVED",
  "version": 3,
  "resolutionSummary": "Replaced failing network adapter and updated driver package. Connectivity verified."
}
```
- **Parameters & Validation**:
  - `currentStatus`: String (Enum), required. Must be one of permitted transitions from the ticket's current status (`BR-10`).
  - `version`: Integer, required. Represents the current version observed by the client.
  - `resolutionSummary`: String (5 to 2000 characters). Strictly required when transitioning to `RESOLVED` or `CLOSED` (`BR-12`).
- **Optimistic Concurrency Detection**:
  - The server reads the existing ticket within a transaction.
  - If `ticket.version !== body.version`:
    - Aborts update.
    - Responds with `409 Conflict` (`code: "STALE_UPDATE"`):
    ```json
    {
      "error": {
        "code": "STALE_UPDATE",
        "message": "Ticket has been modified by another user. Please reload the latest ticket data.",
        "details": {
          "submittedVersion": 3,
          "currentVersion": 4,
          "currentTicket": {
            "id": 42,
            "ticketNumber": "TKT-2026-000042",
            "currentStatus": "IN_PROGRESS",
            "version": 4,
            "updatedAt": "2026-05-12T10:45:00.000Z"
          }
        }
      }
    }
    ```
- **Success Response (200 OK)**:
```json
{
  "id": 42,
  "ticketNumber": "TKT-2026-000042",
  "currentStatus": "RESOLVED",
  "resolutionSummary": "Replaced failing network adapter and updated driver package. Connectivity verified.",
  "version": 4,
  "updatedAt": "2026-05-12T10:50:00.000Z"
}
```

---

### 4.2 Indicate Problem Appears Resolved (Advisory Gate)
- **Endpoint**: `POST /api/tickets/:id/resolve-indication`
- **Access**: `REQUESTER` (strictly owned tickets only)
- **Request Body**: Optional note
```json
{
  "note": "Software patch installed and error no longer occurs."
}
```
- **Behavior**:
  - Validates ticket status is in `('OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER')`.
  - Sets `resolutionIndicated = true` and `resolutionIndicatedAt = NOW()`.
  - Does **not** change `currentStatus` (`BR-11`).
  - Appends an automated Public Comment: *"Requester indicated that the problem appears resolved. Awaiting IT Staff review."*
- **Success Response (200 OK)**:
```json
{
  "id": 42,
  "ticketNumber": "TKT-2026-000042",
  "currentStatus": "IN_PROGRESS",
  "resolutionIndicated": true,
  "resolutionIndicatedAt": "2026-05-12T11:00:00.000Z",
  "message": "Resolution indication recorded. IT Staff will review and formally close the ticket."
}
```

---

## 5. Role-Appropriate Operational Dashboard Endpoints

### 5.1 Requester Dashboard
- **Endpoint**: `GET /api/requester/dashboard`
- **Access**: `REQUESTER` (Staff and Admins receive `403 Forbidden`).
- **Query Scoping**: Strictly scoped to `ticket.requesterId === authUser.id`.
- **Success Response (200 OK)**:
```json
{
  "metrics": {
    "totalOpen": 3,
    "inProgress": 2,
    "resolved": 5,
    "closed": 12
  },
  "recentTickets": [
    {
      "id": 42,
      "ticketNumber": "TKT-2026-000042",
      "summary": "Laptop battery drains quickly",
      "currentStatus": "IN_PROGRESS",
      "requestedPriority": "HIGH",
      "category": { "name": "Hardware" },
      "updatedAt": "2026-05-12T10:15:00.000Z"
    },
    {
      "id": 38,
      "ticketNumber": "TKT-2026-000038",
      "summary": "Need VPN software configuration",
      "currentStatus": "RESOLVED",
      "requestedPriority": "MEDIUM",
      "category": { "name": "Network" },
      "updatedAt": "2026-05-11T16:20:00.000Z"
    }
  ],
  "drillDownUrls": {
    "totalOpen": "/tickets?statusGroup=open",
    "inProgress": "/tickets?status=IN_PROGRESS",
    "resolved": "/tickets?status=RESOLVED",
    "closed": "/tickets?status=CLOSED"
  }
}
```

---

### 5.2 IT Staff & Administrator Dashboard
- **Endpoint**: `GET /api/staff/dashboard`
- **Access**: `IT_STAFF`, `ADMINISTRATOR` (Requesters receive `403 Forbidden`).
- **Success Response (200 OK)**:
```json
{
  "metrics": {
    "unassignedCount": 14,
    "assignedToMeCount": 16,
    "countsByStatus": {
      "NEW": 14,
      "OPEN": 23,
      "IN_PROGRESS": 18,
      "WAITING_FOR_REQUESTER": 7,
      "RESOLVED": 25,
      "CLOSED": 80,
      "REOPENED": 2,
      "CANCELLED": 5
    },
    "countsByPriority": {
      "LOW": 10,
      "MEDIUM": 25,
      "HIGH": 20,
      "URGENT": 7
    }
  },
  "recentTickets": [
    {
      "id": 55,
      "ticketNumber": "TKT-2026-000055",
      "summary": "Core router intermittent packet loss",
      "currentStatus": "NEW",
      "itPriority": "URGENT",
      "owner": null,
      "requester": { "name": "Bob Smith" },
      "updatedAt": "2026-05-12T11:20:00.000Z"
    },
    {
      "id": 42,
      "ticketNumber": "TKT-2026-000042",
      "summary": "Laptop battery drains quickly",
      "currentStatus": "IN_PROGRESS",
      "itPriority": "HIGH",
      "owner": { "id": 2, "name": "Sarah Chen" },
      "requester": { "name": "Jennifer Anderson" },
      "updatedAt": "2026-05-12T10:15:00.000Z"
    }
  ],
  "adminStats": {
    "totalUsers": 11,
    "activeUsers": 9,
    "usersByRole": {
      "REQUESTER": 5,
      "IT_STAFF": 4,
      "ADMINISTRATOR": 2
    }
  },
  "drillDownUrls": {
    "unassigned": "/staff/tickets?owner=unassigned",
    "assignedToMe": "/staff/tickets?owner=me",
    "new": "/staff/tickets?status=NEW",
    "open": "/staff/tickets?status=OPEN",
    "inProgress": "/staff/tickets?status=IN_PROGRESS",
    "waitingForRequester": "/staff/tickets?status=WAITING_FOR_REQUESTER"
  }
}
```
*Note*: `adminStats` is included in the payload if and only if `authUser.role === 'ADMINISTRATOR'`. For `IT_STAFF`, `adminStats` is `null` or omitted.

---

## 6. Continued Labs 1–3 REST APIs Reference

All prior APIs continue operating without breaking changes:

| Endpoint | Method | Roles | Purpose |
| :--- | :--- | :--- | :--- |
| `/api/auth/login` | `POST` | Public | Authenticates credentials and issues JWT token. |
| `/api/auth/logout` | `POST` | All | Revokes session token in server-side blocklist. |
| `/api/auth/me` | `GET` | All | Retrieves authenticated user profile and permissions. |
| `/api/auth/change-password` | `POST` | All | Updates user password, enforcing complexity. |
| `/api/categories` | `GET` | All | Retrieves active ticket categories. |
| `/api/related-systems` | `GET` | All | Retrieves related systems (supports `?categoryId`). |
| `/api/tickets` | `POST` | Requester | Submits new ticket. Copies `requestedPriority` to `itPriority`. |
| `/api/tickets` | `GET` | Requester | Lists owned tickets with pagination and filtering. |
| `/api/tickets/:id` | `GET` | Requester | Gets owned ticket detail, attachments, and comments. |
| `/api/tickets/:id/attachments` | `POST` | Requester | Uploads file attachment (max 5MB, JPG/PNG/WEBP/PDF). |
| `/api/attachments/:id/download`| `GET` | All (authorized)| Binary stream download (returns `410 Gone` if removed). |
| `/api/attachments/:id` | `DELETE` | Requester | Soft-removes attachment with audit reason. |
| `/api/tickets/:id/comments` | `GET`/`POST` | Requester, Staff, Admin | Public comments feed and submission. |
| `/api/tickets/:id/notes` | `GET`/`POST` | Staff, Admin (403 for Requester)| Internal Notes feed and submission. |
| `/api/staff/tickets` | `GET` | Staff, Admin | Staff queue with search, filter, sort, and pagination. |
| `/api/staff/tickets/:id` | `GET` | Staff, Admin | Full staff ticket detail with notes and audit trail. |
| `/api/staff/tickets/:id/owner` | `PATCH` | Staff, Admin | Claims or reassigns ticket ownership. |
| `/api/staff/tickets/:id/priority`| `PATCH` | Staff, Admin | Adjusts IT Priority independently. |
| `/api/admin/users` | `GET`/`POST` | Admin | Lists and creates user accounts with initial passwords. |
| `/api/admin/users/:id` | `PATCH` | Admin | Edits user profile, role, and active status. |
| `/api/admin/users/:id/reset-password` | `POST` | Admin | Sets new initial password forcing first-login change. |
