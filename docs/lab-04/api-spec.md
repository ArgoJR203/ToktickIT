# Lab 4 REST API Specification

## 1. Overview & Authentication Architecture

The TokTickIT Lab 4 REST API expands the authenticated services established in Lab 3 with endpoints for **Actions Taken**, authoritative **Ticket Workflow & Atomic Optimistic Concurrency Control (OCC)**, and **Role-Appropriate Operational Dashboards**.

### 1.1 Authentication & Session Handling
- **Bearer Token**: Transmitted via HTTP header:
  `Authorization: Bearer <jwt-token>`
- **JWT Claims Payload**:
  ```json
  {
    "userId": 7,
    "email": "alex.thompson@toktickit.com",
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
5. **ID Enumeration Protection (`BR-21`)**: If a Requester requests a ticket ID that does not exist OR belongs to another user, the server returns `404 Not Found` (`code: "NOT_FOUND"`), never `403 Forbidden`, preventing resource enumeration.

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
| `400 Bad Request` | `INVALID_INPUT` | Payload fields failed schema validation or boundary constraints (e.g. description > 2000 chars). |
| `400 Bad Request` | `INACTIVE_ASSIGNEE` | Assignee is an inactive account or not an IT Staff/Admin user (`BR-07`). |
| `400 Bad Request` | `INCOMPLETE_ACTIONS_TAKEN` | Ticket cannot transition to `RESOLVED` or `CLOSED` while Actions Taken are pending or incomplete (`BR-20`). |
| `400 Bad Request` | `MISSING_RESOLUTION_SUMMARY` | Ticket resolution or closure requires non-empty resolution summary of at least 5 chars (`BR-13`). |
| `400 Bad Request` | `INVALID_TRANSITION` | Ticket status change violates the permitted transition matrix (`BR-11`). |
| `401 Unauthorized` | `UNAUTHENTICATED` | Missing, expired, or revoked authentication credentials. |
| `403 Forbidden` | `FORBIDDEN_ROLE` | Authenticated user lacks role permissions for the endpoint. |
| `404 Not Found` | `NOT_FOUND` | Resource not found or hidden for security isolation (prevents ID guessing). |
| `409 Conflict` | `STALE_UPDATE` | Optimistic locking collision: ticket or action was concurrently updated by another user (`BR-14`). |

---

## 3. Actions Taken Endpoints

### 3.1 List Actions Taken for Ticket
- **Endpoint**: `GET /api/tickets/:id/actions-taken`
- **Access**:
  - `REQUESTER`: Permitted **only** if `ticket.requesterId === authUser.id`. If ticket belongs to another user or doesn't exist, returns `404 Not Found` (`code: "NOT_FOUND"`) to prevent ID enumeration.
  - `IT_STAFF` & `ADMINISTRATOR`: Permitted for all accessible tickets.
- **Ordering**: Strict `ORDER BY actionDateTime DESC, id DESC` (newest actions first).
- **Success Response (200 OK)**:
```json
{
  "ticketId": 1,
  "actionsTaken": [
    {
      "id": 101,
      "ticketId": 1,
      "performedById": 7,
      "performedBy": {
        "id": 7,
        "name": "Alex Thompson",
        "email": "alex.thompson@toktickit.com",
        "role": "IT_STAFF"
      },
      "assigneeId": 8,
      "assignee": {
        "id": 8,
        "name": "Lisa Martinez",
        "email": "lisa.martinez@toktickit.com",
        "role": "IT_STAFF"
      },
      "updatedById": null,
      "status": "COMPLETED",
      "version": 1,
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
      "ticketId": 1,
      "performedById": 7,
      "performedBy": {
        "id": 7,
        "name": "Alex Thompson",
        "email": "alex.thompson@toktickit.com",
        "role": "IT_STAFF"
      },
      "assigneeId": 7,
      "assignee": {
        "id": 7,
        "name": "Alex Thompson",
        "email": "alex.thompson@toktickit.com",
        "role": "IT_STAFF"
      },
      "updatedById": null,
      "status": "PENDING",
      "version": 1,
      "actionDateTime": "2026-05-14T09:00:00.000Z",
      "description": "Perform 48-hour follow-up battery telemetry benchmark.",
      "result": "Pending execution.",
      "followUpRequired": true,
      "followUpNote": "Verify charge cycles and heat dissipation curve.",
      "attachmentNotes": null,
      "createdAt": "2026-05-12T10:20:00.000Z",
      "updatedAt": "2026-05-12T10:20:00.000Z"
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
  "actionDateTime": "2026-05-14T09:00:00.000Z",
  "assigneeId": 8,
  "status": "PENDING",
  "description": "Perform 48-hour follow-up battery telemetry benchmark.",
  "result": "Pending execution.",
  "followUpRequired": true,
  "followUpNote": "Verify charge cycles and heat dissipation curve.",
  "attachmentNotes": "Reference diagnostics.pdf in Attachments tab."
}
```
- **Validation Rules**:
  - `actionDateTime`: Optional ISO 8601 string. Can be past, present, or future (for planning upcoming work). Defaults to current time if omitted.
  - `assigneeId`: Optional integer. If provided, must reference an active user with role `IT_STAFF` or `ADMINISTRATOR`. Inactive accounts return `400 Bad Request` (`INACTIVE_ASSIGNEE`).
  - `status`: Optional enum (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`). Defaults to `COMPLETED` for executed work, or `PENDING` for planned work.
  - `description`: String, required, 1 to 2000 characters after trimming whitespace.
  - `result`: String, required, 1 to 2000 characters after trimming whitespace.
  - `followUpRequired`: Boolean, optional (default `false`).
  - `followUpNote`: String (1 to 1000 characters). Strictly required if `followUpRequired === true`. Must be null/empty if `false`.
  - `attachmentNotes`: String, optional (0 to 500 characters).
  - `performedById`: Auto-populated from the authenticated JWT session (`req.user.id`). Any client-supplied `performedById` is ignored/overwritten.
- **Success Response (201 Created)**:
```json
{
  "id": 103,
  "ticketId": 1,
  "performedById": 7,
  "performedBy": {
    "id": 7,
    "name": "Alex Thompson",
    "email": "alex.thompson@toktickit.com",
    "role": "IT_STAFF"
  },
  "assigneeId": 8,
  "assignee": {
    "id": 8,
    "name": "Lisa Martinez",
    "email": "lisa.martinez@toktickit.com",
    "role": "IT_STAFF"
  },
  "updatedById": null,
  "status": "PENDING",
  "version": 1,
  "actionDateTime": "2026-05-14T09:00:00.000Z",
  "description": "Perform 48-hour follow-up battery telemetry benchmark.",
  "result": "Pending execution.",
  "followUpRequired": true,
  "followUpNote": "Verify charge cycles and heat dissipation curve.",
  "attachmentNotes": "Reference diagnostics.pdf in Attachments tab.",
  "createdAt": "2026-05-12T10:20:00.000Z",
  "updatedAt": "2026-05-12T10:20:00.000Z"
}
```

---

### 3.3 Update Action Taken
- **Endpoint**: `PATCH /api/tickets/:id/actions-taken/:actionId`
- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Request Body** (Supports partial updates with optional optimistic locking `version`):
```json
{
  "status": "COMPLETED",
  "result": "Telemetry confirmed normal power draw and stable discharge curve.",
  "followUpRequired": false,
  "followUpNote": null,
  "version": 1
}
```
- **Concurrency & Audit Behavior**:
  - If `version` is provided, executes atomic compare-and-swap:
    `prisma.actionTaken.updateMany({ where: { id: actionId, version }, data: { ... } })`.
    If `count === 0`, responds with `409 Conflict` (`STALE_UPDATE`).
  - Sets `updatedById = req.user.id` and updates `updatedAt = NOW()`.
  - Increments `version` by 1.
  - Preserves original `id`, `ticketId`, `performedById`, and `createdAt`.
- **Success Response (200 OK)**: Returns the updated Action Taken record.

---

## 4. Ticket Workflow & Atomic Concurrency Endpoints

### 4.1 Update Ticket Status
- **Endpoint**: `PATCH /api/staff/tickets/:id/status`
- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Request Body**:
```json
{
  "status": "RESOLVED",
  "version": 2,
  "resolutionSummary": "Replaced battery and verified telemetry stability. Issue resolved."
}
```
*Note: Accepts either `status` or `currentStatus` for seamless backward compatibility with Lab 3.*

- **Parameters & Validation**:
  - `status` / `currentStatus`: Required string. Must be a valid transition from the ticket's current status (`BR-11`).
  - `version`: Optional integer. When provided, enables atomic compare-and-swap concurrency checking.
  - `resolutionSummary`: Required (min 5 chars) if target status is `RESOLVED` or `CLOSED` (`BR-13`).
- **Action Completion Gate (`BR-20`)**:
  - If target status is `RESOLVED` or `CLOSED`, queries:
    `SELECT COUNT(*) FROM ActionTaken WHERE ticketId = $1 AND (status IN ('PENDING', 'IN_PROGRESS') OR followUpRequired = true)`
  - If incomplete actions exist, rejects with `400 Bad Request` (`code: "INCOMPLETE_ACTIONS_TAKEN"`, message: *"Cannot resolve or close ticket while actions taken remain pending or incomplete."*).
- **Atomic OCC Check (`BR-14`)**:
  ```ts
  const result = await prisma.ticket.updateMany({
    where: { id: ticketId, version: submittedVersion },
    data: {
      currentStatus: nextStatus,
      resolutionSummary,
      version: { increment: 1 },
    }
  });
  if (result.count === 0) {
    const currentTicket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    return res.status(409).json({
      error: {
        code: "STALE_UPDATE",
        message: "Ticket has been modified by another user. Please reload the latest ticket data.",
        details: { currentTicket }
      }
    });
  }
  ```
- **Success Response (200 OK)**:
```json
{
  "id": 1,
  "ticketNumber": "TKT-2026-000001",
  "currentStatus": "RESOLVED",
  "resolutionSummary": "Replaced battery and verified telemetry stability. Issue resolved.",
  "version": 3,
  "updatedAt": "2026-05-12T11:00:00.000Z"
}
```

---

### 4.2 Indicate Problem Appears Resolved (Advisory Gate)
- **Endpoint**: `POST /api/tickets/:id/resolve-indication`
- **Access**: `REQUESTER` (strictly owned tickets only)
- **Behavior**:
  - Validates ticket status is in `('OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER')`.
  - Sets `resolutionIndicated = true` and `resolutionIndicatedAt = NOW()`.
  - Does **not** change `currentStatus` (`BR-12`).
  - Appends an automated Public Comment: *"Requester indicated that the problem appears resolved. Awaiting IT Staff review."*
- **Success Response (200 OK)**:
```json
{
  "id": 1,
  "ticketNumber": "TKT-2026-000001",
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
    "totalOpen": 2,
    "waitingForRequester": 1,
    "recentlyUpdated": 5,
    "recentlyResolved": 3
  },
  "recentTickets": [
    {
      "id": 1,
      "ticketNumber": "TKT-2026-000001",
      "summary": "Email sync failing on mobile",
      "currentStatus": "IN_PROGRESS",
      "requestedPriority": "HIGH",
      "category": { "name": "Account and Access" },
      "updatedAt": "2026-05-12T10:15:00.000Z"
    },
    {
      "id": 4,
      "ticketNumber": "TKT-2026-000004",
      "summary": "VPN configuration assistance",
      "currentStatus": "WAITING_FOR_REQUESTER",
      "requestedPriority": "MEDIUM",
      "category": { "name": "Network" },
      "updatedAt": "2026-05-11T16:20:00.000Z"
    }
  ],
  "drillDownUrls": {
    "totalOpen": "/tickets?statusGroup=open",
    "waitingForRequester": "/tickets?currentStatus=WAITING_FOR_REQUESTER",
    "recentlyUpdated": "/tickets",
    "recentlyResolved": "/tickets?statusGroup=resolved"
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
    "unassignedCount": 3,
    "assignedToMeCount": 3,
    "countsByStatus": {
      "NEW": 2,
      "OPEN": 5,
      "IN_PROGRESS": 4,
      "WAITING_FOR_REQUESTER": 2,
      "RESOLVED": 4,
      "CLOSED": 6,
      "REOPENED": 1,
      "CANCELLED": 1
    },
    "countsByPriority": {
      "LOW": 4,
      "MEDIUM": 8,
      "HIGH": 7,
      "URGENT": 2
    }
  },
  "recentTickets": [
    {
      "id": 1,
      "ticketNumber": "TKT-2026-000001",
      "summary": "Email sync failing on mobile",
      "currentStatus": "IN_PROGRESS",
      "itPriority": "HIGH",
      "owner": { "id": 7, "name": "Alex Thompson" },
      "requester": { "name": "Jennifer Anderson" },
      "updatedAt": "2026-05-12T10:15:00.000Z"
    },
    {
      "id": 2,
      "ticketNumber": "TKT-2026-000002",
      "summary": "Campus Wi-Fi certificate issue",
      "currentStatus": "OPEN",
      "itPriority": "URGENT",
      "owner": null,
      "requester": { "name": "Sarah Johnson" },
      "updatedAt": "2026-05-10T14:30:00.000Z"
    }
  ],
  "adminStats": {
    "totalUsers": 11,
    "activeUsers": 9,
    "usersByRole": {
      "REQUESTER": 6,
      "IT_STAFF": 4,
      "ADMINISTRATOR": 1
    }
  },
  "drillDownUrls": {
    "unassigned": "/staff/tickets?owner=unassigned",
    "assignedToMe": "/staff/tickets?owner=me",
    "open": "/staff/tickets?currentStatus=OPEN",
    "inProgress": "/staff/tickets?currentStatus=IN_PROGRESS",
    "waitingForRequester": "/staff/tickets?currentStatus=WAITING_FOR_REQUESTER"
  }
}
```
*Note: `adminStats` is included if and only if `authUser.role === 'ADMINISTRATOR'`. For `IT_STAFF`, `adminStats` is `null`.*

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
| `/api/tickets` | `POST` | All active | Submits new ticket. Copies `requestedPriority` to `itPriority`. |
| `/api/tickets` | `GET` | Requester | Lists owned tickets with pagination and filtering. |
| `/api/tickets/:id` | `GET` | Requester | Gets owned ticket detail (404 for non-owners). |
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
