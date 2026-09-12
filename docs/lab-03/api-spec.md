# Lab 3 REST API Specification

## 1. Overview & Context Architecture

The TokTickIT Lab 3 REST API provides secure, authenticated services with server-enforced Role-Based Access Control (RBAC) across three roles: **Requester**, **IT Staff**, and **Administrator**.

### 1.1 Authentication & Session Architecture
- **Mechanism**: JSON Web Token (JWT) transmitted via HTTP header:
  `Authorization: Bearer <jwt-token>`
  or via secure HTTP-only session cookie `toktickit_session`.
- **JWT Payload**:
  ```json
  {
    "userId": 12,
    "email": "staff@toktickit.com",
    "role": "IT_STAFF",
    "mustChangePassword": false,
    "exp": 1773289200
  }
  ```
- **Session Expiration & Server-Side Token Invalidation**:
  - Tokens expire after 8 hours of inactivity (`exp: Math.floor(Date.now() / 1000) + 8 * 3600`).
  - To satisfy Handout §6.1, BR-09, and AC-06 regarding logout token invalidation while preserving stateless JWT verification, the backend maintains a **Server-Side Token Revocation Store (Blocklist)**.
  - Calling `POST /api/auth/logout` extracts the current token from the `Authorization` header and records it in the revocation store with a TTL matching the token's remaining validity.
  - The `authenticate` middleware checks the token against the revocation store on every protected request. If the token is revoked, access is denied immediately with `401 Unauthorized` (`TOKEN_REVOKED`).
  - Client-side, `localStorage.removeItem("toktickit_token")` is called and application state is reset to unauthenticated.

### 1.2 Server-Side Authorization & Middleware Enforcement
Every protected route is gated by dedicated Express middleware:
1. `authenticate`: Verifies JWT validity, extracts user ID and role, verifies user is active (`isActive = true`). If token is invalid/missing, returns `401 Unauthorized`.
2. `enforcePasswordChange`: If `user.mustChangePassword === true` and the requested route is NOT `/api/auth/change-password`, `/api/auth/logout`, or `/api/auth/me`, immediately blocks access with `403 Forbidden` (`PASSWORD_CHANGE_REQUIRED`).
3. `requireRole(Role...)`: Enforces that the authenticated user possesses one of the permitted roles; otherwise returns `403 Forbidden` (`FORBIDDEN_ROLE`).
4. `requireTicketOwnerOrStaff`: For ticket-specific operations, checks that the ticket is either owned by the authenticated Requester (`ticket.requesterId == user.id`) OR the caller is `IT_STAFF` or `ADMINISTRATOR`. Requesters querying other users' tickets receive `403 Forbidden` or `404 Not Found` to prevent data leakage.

---

## 2. Standard Error & Response Schemas

### 2.1 Standard Error Format
```json
{
  "error": {
    "code": "INVALID_INPUT",
    "message": "Validation failed for requested operation.",
    "details": [
      { "field": "password", "message": "Password must be at least 8 characters with upper, lower, and number/symbol." }
    ]
  }
}
```

### 2.2 Error Codes Reference
| HTTP Status | Error Code | Meaning |
| :--- | :--- | :--- |
| `400 Bad Request` | `INVALID_INPUT` | Input fields failed validation or business constraints. |
| `400 Bad Request` | `INVALID_TRANSITION` | Ticket status change violates the lifecycle state machine. |
| `400 Bad Request` | `ADMIN_SAFETY_VIOLATION` | Attempt to deactivate self or remove last active admin. |
| `401 Unauthorized` | `UNAUTHENTICATED` | Missing, expired, or invalid credentials. |
| `403 Forbidden` | `FORBIDDEN` | Authenticated user lacks permission for this resource. |
| `403 Forbidden` | `PASSWORD_CHANGE_REQUIRED` | User must change initial password before proceeding. |
| `404 Not Found` | `NOT_FOUND` | Resource not found or hidden for security isolation. |
| `409 Conflict` | `DUPLICATE_EMAIL` | User email already registered in the system. |
| `410 Gone` | `ATTACHMENT_REMOVED` | Attachment has been soft-deleted and cannot be downloaded. |

### 2.3 Standard Paginated Response Format
```json
{
  "data": [ /* Array of Records */ ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 45,
    "totalPages": 5
  }
}
```

---

## 3. Authentication Endpoints

### 3.1 User Login
- **Endpoint**: `POST /api/auth/login`
- **Access**: Public
- **Request Body**:
```json
{
  "email": "jennifer.anderson@example.com",
  "password": "Password123!"
}
```
- **Success Response (200 OK)**:
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@example.com",
    "role": "REQUESTER",
    "mustChangePassword": false,
    "isActive": true
  }
}
```
- **Error Response (401 Unauthorized)**:
*(Returned for invalid email, wrong password, or inactive account)*
```json
{
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password. Please try again."
  }
}
```

### 3.2 User Logout & Token Invalidation
- **Endpoint**: `POST /api/auth/logout`
- **Access**: Authenticated
- **Behavior**:
  - Extracts the bearer token from the `Authorization` header.
  - Adds the token identifier to the backend Token Revocation Store with automatic TTL cleanup.
  - Any subsequent request presenting this revoked token will fail with `401 Unauthorized` (`TOKEN_REVOKED`).
- **Success Response (200 OK)**:
```json
{
  "message": "Successfully logged out. Token has been revoked."
}
```
- **Subsequent Request with Revoked Token (401 Unauthorized)**:
```json
{
  "error": {
    "code": "TOKEN_REVOKED",
    "message": "Token has been revoked. Please log in again."
  }
}
```

### 3.3 Get Current Authenticated User
- **Endpoint**: `GET /api/auth/me`
- **Access**: Authenticated
- **Success Response (200 OK)**:
```json
{
  "user": {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@example.com",
    "role": "REQUESTER",
    "mustChangePassword": false,
    "isActive": true
  }
}
```

### 3.4 Change Initial / Current Password
- **Endpoint**: `POST /api/auth/change-password`
- **Access**: Authenticated (Permitted even when `mustChangePassword = true`)
- **Request Body**:
```json
{
  "currentPassword": "Password123!",
  "newPassword": "NewSecurePassword456!",
  "confirmPassword": "NewSecurePassword456!"
}
```
- **Success Response (200 OK)**:
```json
{
  "message": "Password changed successfully.",
  "user": {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@example.com",
    "role": "REQUESTER",
    "mustChangePassword": false
  }
}
```

---

## 4. IT Staff Ticket Queue & Operations

### 4.1 Retrieve IT Staff Ticket Queue
- **Endpoint**: `GET /api/staff/tickets`
- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Query Parameters**:
  - `search` (optional string): Matches `ticketNumber` or `summary` (case-insensitive).
  - `categoryId` (optional integer).
  - `status` (optional `TicketStatus` enum).
  - `requestedPriority` (optional `RequestedPriority` enum).
  - `itPriority` (optional `ITPriority` enum).
  - `ownerId` (optional integer or string: `unassigned` / `me`).
  - `page` (default `1`).
  - `pageSize` (default `10`, max `50`).
  - `sortBy` (default `createdAt`, allowed: `ticketNumber`, `createdAt`, `updatedAt`, `itPriority`, `currentStatus`).
  - `sortOrder` (default `desc`, allowed: `asc`, `desc`).
- **Success Response (200 OK)**:
```json
{
  "data": [
    {
      "id": 14,
      "ticketNumber": "TKT-2026-000234",
      "summary": "Cannot connect to campus VPN from home",
      "category": { "id": 4, "name": "Network" },
      "relatedSystem": { "id": 3, "name": "VPN" },
      "requester": { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.anderson@example.com" },
      "requestedPriority": "HIGH",
      "itPriority": "HIGH",
      "currentStatus": "OPEN",
      "owner": { "id": 5, "name": "Alex Thompson", "email": "alex.thompson@toktickit.com" },
      "resolutionIndicated": false,
      "resolutionSummary": null,
      "createdAt": "2026-05-12T08:00:00.000Z",
      "updatedAt": "2026-05-12T08:30:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "pageSize": 10,
    "totalItems": 42,
    "totalPages": 5
  }
}
```

### 4.2 Retrieve Ticket Detail (IT Staff View)
- **Endpoint**: `GET /api/staff/tickets/:id`
- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Success Response (200 OK)**:
```json
{
  "id": 14,
  "ticketNumber": "TKT-2026-000234",
  "summary": "Cannot connect to campus VPN from home",
  "description": "Getting error 809 when connecting to OpenVPN server since yesterday evening.",
  "category": { "id": 4, "name": "Network" },
  "relatedSystem": { "id": 3, "name": "VPN" },
  "requester": { "id": 1, "name": "Jennifer Anderson", "email": "jennifer.anderson@example.com" },
  "requestedPriority": "HIGH",
  "itPriority": "HIGH",
  "currentStatus": "OPEN",
  "owner": { "id": 5, "name": "Alex Thompson", "email": "alex.thompson@toktickit.com" },
  "resolutionIndicated": false,
  "resolutionIndicatedAt": null,
  "resolutionSummary": null,
  "permittedNextStatuses": ["IN_PROGRESS", "WAITING_FOR_REQUESTER", "CANCELLED"],
  "attachments": [],
  "createdAt": "2026-05-12T08:00:00.000Z",
  "updatedAt": "2026-05-12T08:30:00.000Z"
}
```

### 4.3 Claim or Reassign Ticket Ownership
- **Endpoint**: `PATCH /api/staff/tickets/:id/owner`
- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Request Body**:
```json
{
  "ownerId": 5
}
```
*(Pass `null` to unassign ownership, or a valid active IT Staff / Admin user ID).*
- **Success Response (200 OK)**:
```json
{
  "id": 14,
  "owner": { "id": 5, "name": "Alex Thompson", "email": "alex.thompson@toktickit.com" }
}
```

### 4.4 Update IT Priority
- **Endpoint**: `PATCH /api/staff/tickets/:id/priority`
- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Request Body**:
```json
{
  "itPriority": "URGENT"
}
```
- **Success Response (200 OK)**:
```json
{
  "id": 14,
  "itPriority": "URGENT",
  "updatedAt": "2026-05-12T09:00:00.000Z"
}
```

### 4.5 Update Ticket Status & Resolution Summary (State Machine Enforced)
- **Endpoint**: `PATCH /api/staff/tickets/:id/status`
- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Request Body**:
```json
{
  "status": "RESOLVED",
  "resolutionSummary": "Replaced user's routing cert and verified handshake with gateway daemon."
}
```
- **Success Response (200 OK)**:
```json
{
  "id": 14,
  "currentStatus": "RESOLVED",
  "resolutionSummary": "Replaced user's routing cert and verified handshake with gateway daemon.",
  "permittedNextStatuses": ["CLOSED", "REOPENED"],
  "updatedAt": "2026-05-12T09:15:00.000Z"
}
```
- **Invalid Transition Error (400 Bad Request)**:
```json
{
  "error": {
    "code": "INVALID_TRANSITION",
    "message": "Status transition from 'NEW' to 'RESOLVED' is not permitted."
  }
}
```

---

## 5. Comments & Notes Endpoints

### 5.1 Retrieve Public Comments
- **Endpoint**: `GET /api/tickets/:id/comments`
- **Access**: Requester (Owner only), `IT_STAFF`, `ADMINISTRATOR`
- **Success Response (200 OK)**:
```json
[
  {
    "id": 101,
    "ticketId": 14,
    "content": "We have checked the VPN gateway and restarted your routing daemon.",
    "author": {
      "id": 5,
      "name": "Alex Thompson",
      "role": "IT_STAFF"
    },
    "createdAt": "2026-05-12T09:30:00.000Z"
  }
]
```

### 5.2 Post Public Comment
- **Endpoint**: `POST /api/tickets/:id/comments`
- **Access**: Requester (Owner only), `IT_STAFF`, `ADMINISTRATOR`
- **Request Body**:
```json
{
  "content": "Thank you! The VPN connects successfully now."
}
```
- **Success Response (201 Created)**:
```json
{
  "id": 102,
  "ticketId": 14,
  "content": "Thank you! The VPN connects successfully now.",
  "author": {
    "id": 1,
    "name": "Jennifer Anderson",
    "role": "REQUESTER"
  },
  "createdAt": "2026-05-12T10:00:00.000Z"
}
```

### 5.3 Retrieve Internal Notes (Restricted)
- **Endpoint**: `GET /api/tickets/:id/notes`
- **Access**: `IT_STAFF`, `ADMINISTRATOR` (Requesters receive `403 Forbidden`)
- **Success Response (200 OK)**:
```json
[
  {
    "id": 201,
    "ticketId": 14,
    "content": "Customer had misconfigured subnet in client ovpn config. Replaced cert token.",
    "author": {
      "id": 5,
      "name": "Alex Thompson",
      "role": "IT_STAFF"
    },
    "createdAt": "2026-05-12T09:25:00.000Z"
  }
]
```
- **Requester Attempt (403 Forbidden)**:
```json
{
  "error": {
    "code": "FORBIDDEN",
    "message": "Access denied. Internal notes are restricted to IT Staff and Administrators."
  }
}
```

### 5.4 Post Internal Note
- **Endpoint**: `POST /api/tickets/:id/notes`
- **Access**: `IT_STAFF`, `ADMINISTRATOR`
- **Request Body**:
```json
{
  "content": "Confirmed routing table fix with network team."
}
```
- **Success Response (201 Created)**:
```json
{
  "id": 202,
  "ticketId": 14,
  "content": "Confirmed routing table fix with network team.",
  "author": {
    "id": 5,
    "name": "Alex Thompson",
    "role": "IT_STAFF"
  },
  "createdAt": "2026-05-12T09:28:00.000Z"
}
```

---

## 6. Requester Operations (Continuity & Resolution Indication)

### 6.1 Create Ticket (with IT Priority Initialization)
- **Endpoint**: `POST /api/tickets`
- **Access**: `REQUESTER` (uses authenticated `currentUser.id`)
- **Request Body**:
```json
{
  "categoryId": 4,
  "relatedSystemId": 3,
  "summary": "Cannot connect to campus VPN",
  "description": "Getting error 809 when trying to authenticate to VPN from home network.",
  "requestedPriority": "HIGH"
}
```
- **Behavior**: Backend automatically copies `requestedPriority` into `itPriority` (`itPriority = requestedPriority`) and initializes `currentStatus = NEW`.
- **Success Response (201 Created)**:
```json
{
  "id": 14,
  "ticketNumber": "TKT-2026-000234",
  "summary": "Cannot connect to campus VPN",
  "requestedPriority": "HIGH",
  "itPriority": "HIGH",
  "currentStatus": "NEW",
  "createdAt": "2026-05-12T08:00:00.000Z"
}
```

### 6.2 Indicate Problem Appears Resolved
- **Endpoint**: `POST /api/tickets/:id/resolve-indication`
- **Access**: Requester (Owner of ticket only)
- **Request Body**: Empty or optional note
- **Success Response (200 OK)**:
```json
{
  "message": "Problem resolution indicated. IT Staff have been notified to review and finalize.",
  "ticketId": 14,
  "resolutionIndicated": true,
  "resolutionIndicatedAt": "2026-05-12T10:05:00.000Z"
}
```

### 6.3 Continued Lab 2 Requester Endpoints
All existing Lab 2 Requester endpoints continue functioning identically, deriving the Requester identity automatically from the authenticated session:
- `GET /api/tickets`: Returns tickets owned by `currentUser.id` with keyword search, category/priority/status filters, and pagination.
- `GET /api/tickets/:id`: Returns owned ticket details (including `resolutionSummary` if present); returns `403 Forbidden` if ticket belongs to another Requester.
- `POST /api/tickets/:id/attachments`: Uploads attachment up to 5MB, max 5 active attachments.
- `GET /api/attachments/:id/download`: Downloads active attachment binary stream (`410 Gone` if soft-removed).
- `DELETE /api/attachments/:id`: Soft-removes attachment with audit reason.

---

## 7. Administrator User Management Endpoints

### 7.1 List All Users
- **Endpoint**: `GET /api/admin/users`
- **Access**: `ADMINISTRATOR`
- **Query Parameters**:
  - `search` (optional string): Filters by name or email.
  - `role` (optional `Role` enum).
- **Success Response (200 OK)**:
```json
[
  {
    "id": 1,
    "name": "Jennifer Anderson",
    "email": "jennifer.anderson@example.com",
    "role": "REQUESTER",
    "isActive": true,
    "mustChangePassword": false,
    "createdAt": "2026-01-01T00:00:00.000Z"
  },
  {
    "id": 5,
    "name": "Alex Thompson",
    "email": "alex.thompson@toktickit.com",
    "role": "IT_STAFF",
    "isActive": true,
    "mustChangePassword": false,
    "createdAt": "2026-01-02T00:00:00.000Z"
  },
  {
    "id": 10,
    "name": "John Smith",
    "email": "john.smith@toktickit.com",
    "role": "ADMINISTRATOR",
    "isActive": true,
    "mustChangePassword": false,
    "createdAt": "2026-01-03T00:00:00.000Z"
  }
]
```

### 7.2 Create User
- **Endpoint**: `POST /api/admin/users`
- **Access**: `ADMINISTRATOR`
- **Request Body**:
```json
{
  "name": "Emily Davis",
  "email": "emily.davis@toktickit.com",
  "role": "IT_STAFF",
  "isActive": true,
  "initialPassword": "InitialPassword123!"
}
```
- **Success Response (201 Created)**:
```json
{
  "id": 11,
  "name": "Emily Davis",
  "email": "emily.davis@toktickit.com",
  "role": "IT_STAFF",
  "isActive": true,
  "mustChangePassword": true,
  "createdAt": "2026-05-12T11:00:00.000Z"
}
```
- **Duplicate Email Error (409 Conflict)**:
```json
{
  "error": {
    "code": "DUPLICATE_EMAIL",
    "message": "A user account with email 'emily.davis@toktickit.com' already exists."
  }
}
```

### 7.3 Edit User Account
- **Endpoint**: `PATCH /api/admin/users/:id`
- **Access**: `ADMINISTRATOR`
- **Request Body**:
```json
{
  "name": "Emily Davis-Miller",
  "email": "emily.davismiller@toktickit.com",
  "role": "IT_STAFF",
  "isActive": true
}
```
- **Success Response (200 OK)**:
```json
{
  "id": 11,
  "name": "Emily Davis-Miller",
  "email": "emily.davismiller@toktickit.com",
  "role": "IT_STAFF",
  "isActive": true,
  "mustChangePassword": true,
  "updatedAt": "2026-05-12T11:15:00.000Z"
}
```
- **Safety Violation - Self Deactivation (400 Bad Request)**:
```json
{
  "error": {
    "code": "ADMIN_SAFETY_VIOLATION",
    "message": "Administrators cannot deactivate their own account."
  }
}
```
- **Safety Violation - Last Admin Deactivation (400 Bad Request)**:
```json
{
  "error": {
    "code": "ADMIN_SAFETY_VIOLATION",
    "message": "Cannot deactivate or demote the system's last active Administrator."
  }
}
```

### 7.4 Reset User Initial Password
- **Endpoint**: `POST /api/admin/users/:id/reset-password`
- **Access**: `ADMINISTRATOR`
- **Request Body**:
```json
{
  "newInitialPassword": "TemporaryPassword456!"
}
```
- **Success Response (200 OK)**:
```json
{
  "message": "New initial password set. User will be required to change it at their next login.",
  "userId": 11,
  "mustChangePassword": true
}
```
