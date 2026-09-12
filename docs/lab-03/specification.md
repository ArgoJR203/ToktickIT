# Lab 3 Sprint Engineering Specification

## 1. Sprint Goal
Deliver an authenticated, role-based IT Service Desk for **TokTickIT** supporting three primary user roles: **Requester**, **IT Staff**, and **Administrator**. By the end of Sprint 3, the temporary Development Requester selector is completely replaced with secure credential authentication, mandatory first-login password changes, and server-enforced role authorization. Requesters can manage owned tickets, participate in public ticket comments, and indicate issue resolution readiness. IT Staff can access a shared operational Ticket Queue with search, filtering, sorting, and pagination, claim or reassign ticket ownership, adjust IT Priority, advance tickets through permitted lifecycle statuses, provide resolution summaries, and manage public comments alongside role-restricted Internal Notes. Administrators can manage accounts through a minimalist User Management interface with safety constraints preventing self-deactivation or orphaned systems. All Lab 2 requester capabilities continue to function seamlessly under real authenticated identities within the Zen Green design system.

---

## 2. Stakeholder Request Interpretation
The IT Service Desk must transition from a development testing prototype into a secure, multi-role operational platform:
1. **Real Authentication & Credential Management**: Replace the simulated dropdown selector with secure login (email and password). Passwords must never be stored in plaintext. Users provided with an initial password must be forced to choose a new password before entering the application.
2. **Role-Based Access Control (RBAC)**: Enforce strict backend authorization for three distinct roles: Requester, IT Staff, and Administrator. Hiding UI controls is recognized as user guidance, not security; all APIs must validate roles and resource ownership.
3. **Requester Continuous Operation & Feedback**: Requesters must continue creating and tracking their own tickets without regression. Requesters can communicate via Public Comments and signal when a problem appears resolved, but formal ticket resolution and closure remain strictly reserved for IT Staff.
4. **Operational IT Staff Workflow**: IT Staff require a professional Ticket Queue to find and prioritize work, view Ticket Details, take ownership (claim or reassign), set IT Priority, update ticket statuses through defined transitions, provide resolution summaries, and communicate via Public Comments and private Internal Notes (strictly invisible to Requesters).
5. **Minimalist Administrator User Management**: Administrators require an administrative screen to list users, filter by role, search by name or email, create users with one assigned role and initial password, edit basic information, toggle active/inactive status, and set new initial passwords. Safety rules must prevent self-deactivation or removing the last active Administrator.
6. **Design Language & Consistency**: All new screens must strictly follow the established Zen Green visual language, reusable components, responsive rules, and accessibility standards.

---

## 3. Scope

### 3.1 Included Scope
- **Authentication & Password Management**:
  - Secure login with email and password via bcrypt hashing (salt rounds >= 10).
  - Session/token management with safe logout invalidation.
  - Mandatory password change screen on first login for users flagged with `mustChangePassword = true`.
  - Inactive account rejection with safe error responses without leaking account existence or password validity.
  - Current authenticated user retrieval endpoint (`/api/auth/me`).
- **Role-Based Authorization & Application Shell**:
  - 3 roles: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`.
  - Dynamic application navigation shell displaying permitted tabs, authenticated user name, role badge, and logout action.
  - Server-side middleware enforcing authentication and role authorization on every protected API endpoint.
- **Requester Experience & Regression**:
  - Full migration of Lab 2 Requester flows to the authenticated identity (removing client-side `x-requester-id` and simulated selector).
  - Requester Ticket Detail screen enhanced with Public Comments (append-only).
  - "Problem Appears Resolved" action allowing Requesters to signal resolution readiness without formally closing tickets.
  - Continued ownership protection on tickets and attachments.
- **IT Staff Ticket Queue & Workflow**:
  - Shared operational queue listing all system tickets.
  - Real-time search (by ticket number or summary), filtering (category, requested priority, IT priority, status, unassigned/assigned), multi-field sorting, and pagination.
  - IT Staff Ticket Detail: claim ownership (assign to self) or reassign to active staff/admin, set IT Priority, and update ticket status.
  - Permitted status transition matrix enforcement (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`).
  - Capturing `resolutionSummary` visible to the requester upon resolution.
  - Public Comments feed and private Internal Notes feed with clear visual distinction.
- **Minimalist Administrator User Management**:
  - User table listing Name, Email, Role, Status, and Edit action.
  - Search by name or email, filter by role.
  - Create user modal/panel with single role assignment and initial password.
  - Edit user profile (name, email, role, activation state).
  - Set new initial password triggering `mustChangePassword` at user's next login.
  - Administrator safety rules: prevent self-deactivation and prevent deactivating the last active Administrator.
  - Duplicate email check and soft-deactivation only (no user deletion).
- **Data Architecture & Migration**:
  - Prisma schema evolution migrating `RequesterUser` into unified `User` model without data loss.
  - Ticket model enhancements: `ownerId` (FK to User), `itPriority` (initialized from `requestedPriority`), `resolutionSummary`, updated status enum, and operational indexes.
  - New models: `PublicComment` and `InternalNote` (append-only, foreign-keyed to Ticket and User).
  - Idempotent seed script with required user demographics, realistic tickets, comments, and notes.
- **Automated Testing & Documentation**:
  - Comprehensive unit, API integration, UI component, responsive visual, and E2E Playwright test suites.
  - Spec DD, Test DD, UI Spec, API Spec, Reviewer notes, and AI reflection documents.

### 3.2 Explicitly Excluded Scope (Deferred or Excluded by Handout §4.2)
- Email invitations, password-reset email, multi-factor authentication (MFA), social login, and single sign-on (SSO).
- Self-registration and Requester-created accounts.
- "Actions Taken by IT Staff" structured checklist (deferred to Lab 4).
- Formal SLA calculation, automated escalation rules, and notification services.
- Dashboards and KPI analytics beyond simple queue counts.
- Multi-tenant organizations, departments, customer administration, and profile photos.
- Production-grade deployment or cloud infrastructure changes.
- Multiple roles assigned to one user.
- User deletion, bulk user operations, user import or export, and account-history screens.
- Email delivery of initial passwords or reset links (passwords managed in-app for local lab).
- Account unlocking approval workflows and advanced identity-management functions.
- Advanced user-list features such as mandatory pagination, multi-column sorting, and multiple simultaneous filters.

---

## 4. Required Roles and Authorization Matrix

### 4.1 Required Roles (§4.3)
| Role | Permitted Responsibilities |
| :--- | :--- |
| **Requester** | Use authenticated identity; create Tickets; view and manage only owned Tickets and permitted Attachments; post Public Comments; indicate that a problem appears resolved. |
| **IT Staff** | View the IT Staff Ticket Queue; open Tickets; claim or reassign ownership; set IT Priority; perform permitted status changes; provide resolution summary; post Public Comments; create and view Internal Notes. |
| **Administrator** | Manage user accounts through the minimalist User Management screen. View users, create a user, edit basic account information, assign one permitted role, activate or deactivate an account, and set a new initial password. |

### 4.2 Authorization Matrix Table
Every protected operation is strictly enforced by backend middleware. UI control hiding is secondary feedback, not a security boundary.

| Operation / Endpoint | Requester | IT Staff | Administrator | Unauthenticated |
| :--- | :---: | :---: | :---: | :---: |
| Authenticate / Login (`POST /api/auth/login`) | Yes | Yes | Yes | Yes |
| Change Password (`POST /api/auth/change-password`) | Self | Self | Self | No (401) |
| Get Current User (`GET /api/auth/me`) | Self | Self | Self | No (401) |
| Logout (`POST /api/auth/logout`) | Yes | Yes | Yes | No (401) |
| Create Ticket (`POST /api/tickets`) | Yes (owned) | No (403) | No (403) | No (401) |
| View Owned Tickets List (`GET /api/tickets`) | Yes (owned only) | No (403)* | No (403)* | No (401) |
| View Owned Ticket Detail (`GET /api/tickets/:id`) | Yes (owned only) | No (403)* | No (403)* | No (401) |
| Indicate Problem Appears Resolved (`POST /api/tickets/:id/resolve-indication`) | Yes (owned only) | No (403) | No (403) | No (401) |
| Upload / Download / Soft-remove Attachments | Yes (owned only) | View/Download | View/Download | No (401) |
| View IT Staff Ticket Queue (`GET /api/staff/tickets`) | No (403) | Yes (all) | Yes (all) | No (401) |
| View Staff Ticket Detail (`GET /api/staff/tickets/:id`) | No (403) | Yes (all) | Yes (all) | No (401) |
| Claim / Reassign Ticket Owner (`PATCH /api/staff/tickets/:id/owner`) | No (403) | Yes | Yes | No (401) |
| Update IT Priority (`PATCH /api/staff/tickets/:id/priority`) | No (403) | Yes | Yes | No (401) |
| Update Ticket Status & Resolution Summary (`PATCH /api/staff/tickets/:id/status`) | No (403) | Yes | Yes | No (401) |
| View Public Comments (`GET /api/tickets/:id/comments`) | Yes (owned only) | Yes (all) | Yes (all) | No (401) |
| Post Public Comment (`POST /api/tickets/:id/comments`) | Yes (owned only) | Yes (all) | Yes (all) | No (401) |
| View Internal Notes (`GET /api/tickets/:id/notes`) | **No (403)** | Yes (all) | Yes (all) | No (401) |
| Post Internal Note (`POST /api/tickets/:id/notes`) | **No (403)** | Yes (all) | Yes (all) | No (401) |
| List Users with Search & Role Filter (`GET /api/admin/users`) | No (403) | No (403) | Yes | No (401) |
| Create User with 1 Role & Initial Password (`POST /api/admin/users`) | No (403) | No (403) | Yes | No (401) |
| Edit User Profile & Activation (`PATCH /api/admin/users/:id`) | No (403) | No (403) | Yes (subject to safety rules) | No (401) |
| Set New Initial Password (`POST /api/admin/users/:id/reset-password`) | No (403) | No (403) | Yes | No (401) |

*\*Note: IT Staff and Administrators manage and inspect tickets through `/api/staff/tickets`, keeping requester ownership separate.*

---

## 5. Functional Requirements

| ID | Functionality | Description |
| :--- | :--- | :--- |
| **FR-01** | User Authentication | System shall authenticate users via email and password, establishing an authenticated session and returning user identity and role. |
| **FR-02** | Inactive Account Rejection | System shall reject authentication attempts from deactivated accounts (`isActive = false`) with safe error messages without exposing account details. |
| **FR-03** | Mandatory Password Change | System shall enforce that users flagged with `mustChangePassword = true` must change their password before accessing normal application screens. |
| **FR-04** | User Logout | System shall invalidate the authenticated session upon user logout and redirect the user to the login screen. |
| **FR-05** | Current User Profile Retrieval | System shall return the authenticated user's profile, role, and password-change state via `/api/auth/me`. |
| **FR-06** | Role-Based Navigation | System shall dynamically render only navigation tabs and actions permitted for the authenticated user's role. |
| **FR-07** | Server-Side RBAC Enforcement | System shall enforce role and ownership checks on all backend endpoints; unauthorized access shall be rejected with 401 Unauthorized or 403 Forbidden. |
| **FR-08** | Requester Ticket Continuity | System shall allow authenticated Requesters to create tickets, view owned tickets, view owned ticket details, and manage attachments using their authenticated identity. |
| **FR-09** | Public Comments Management | System shall allow Requesters (for owned tickets), IT Staff, and Administrators to view and post append-only Public Comments on tickets. |
| **FR-10** | Requester Resolution Indication | System shall allow Requesters to indicate that their ticket problem appears resolved without formally closing or resolving the ticket. |
| **FR-11** | IT Staff Shared Ticket Queue | System shall provide IT Staff with a centralized queue displaying all tickets with ticket number, summary, requester, category, requested priority, IT priority, status, owner, created date, and updated date. |
| **FR-12** | Queue Search, Filter & Pagination | System shall support keyword search (ticket number/summary), filters (category, priorities, status, assignment), sorting, and pagination on the IT Staff Ticket Queue. |
| **FR-13** | Ticket Ownership Management | System shall allow IT Staff and Administrators to claim ticket ownership (assign to self) or reassign tickets to any active IT Staff or Administrator. |
| **FR-14** | IT Priority Management | System shall allow IT Staff and Administrators to modify the IT Priority of a ticket independently of the Requester's requested priority. |
| **FR-15** | Permitted Status Transitions | System shall allow IT Staff and Administrators to advance ticket status strictly adhering to the permitted lifecycle transition matrix and record an optional resolution summary. |
| **FR-16** | Internal Notes Management | System shall allow IT Staff and Administrators to view and post private, append-only Internal Notes on tickets. Requesters shall be strictly forbidden from accessing Internal Notes. |
| **FR-17** | Administrator User Listing | System shall allow Administrators to view all user accounts with Name, Email, Role, Status, and Edit action, with search and role filter capabilities. |
| **FR-18** | Administrator User Creation | System shall allow Administrators to create new user accounts specifying Name, Email, one Role, Active status, and an Initial Password (flagged for mandatory change). |
| **FR-19** | Administrator User Editing | System shall allow Administrators to update an existing user's Name, Email, Role, and Active status. |
| **FR-20** | Administrator Password Reset | System shall allow Administrators to assign a new initial password to any user, resetting `mustChangePassword` to true. |
| **FR-21** | Administrator Safety Protection | System shall prevent an Administrator from deactivating their own account and prevent deactivation or demotion of the last active Administrator. |

---

## 6. Business Rules

### 6.1 Mandatory Handout Rules (BR-01 through BR-05 exact definitions from §4.4)
- **BR-01**: **Only an active user with valid credentials may authenticate.** Inactive users (`isActive = false`) or incorrect passwords receive a safe, generic failure response ("Invalid email or password") to avoid leaking account status or password validity.
- **BR-02**: **A user marked as requiring a password change cannot enter the normal application until a new valid password is saved.** Access to functional screens and endpoints is gated by `mustChangePassword = true` until completed.
- **BR-03**: **The authenticated user identity, not a requesterId supplied by the client, determines ownership of Requester operations.** Client-side `x-requester-id` headers and simulated selectors are decommissioned.
- **BR-04**: **Public Comments are visible to the Requester, IT Staff, and Administrator. Internal Notes are visible only to IT Staff and Administrator.**
- **BR-05**: **A Requester may indicate that the problem appears resolved, but cannot formally set the Ticket to Resolved or Closed.** Only IT Staff or Administrator may set `Resolved` or `Closed`.

### 6.2 Extended Business Rules (BR-06 onward)
- **BR-06**: **Password Storage & Security**: Passwords must never be stored in plaintext. All passwords must be hashed using bcrypt with a salt cost factor >= 10 before persisting in PostgreSQL.
- **BR-07**: **Password Complexity**: Passwords must meet minimum complexity: at least 8 characters, containing at least one uppercase letter, at least one lowercase letter, and at least one number or special character.
- **BR-08**: **Initial Password Flagging**: When an Administrator creates a new user or sets a new initial password, `mustChangePassword` must automatically be set to `true`.
- **BR-09**: **Session Termination & Token Invalidation**: Logging out (`POST /api/auth/logout`) immediately revokes the authenticated JWT on the backend by recording it in the server-side Token Revocation Store and clearing client storage. Any subsequent request presenting a revoked token must be rejected with `401 Unauthorized` (`code: "TOKEN_REVOKED"`).
- **BR-10**: **Single Role Assignment**: Every user is assigned exactly one permitted role: `REQUESTER`, `IT_STAFF`, or `ADMINISTRATOR`. Multi-role assignments are prohibited.
- **BR-11**: **Ticket Ownership**: Each Ticket may have one primary Ticket Owner who is an active IT Staff or Administrator user (`ownerId`). A Ticket may initially be unassigned (`ownerId = null`). Requesters cannot own tickets as staff.
- **BR-12**: **IT Priority Initialization & Modification**: Requested Priority remains the value submitted by the Requester (`LOW`, `MEDIUM`, `HIGH`, `URGENT`). IT Priority initially copies Requested Priority upon ticket creation and may later be changed only by IT Staff or Administrator.
- **BR-13**: **Permitted Ticket Statuses**: The required Ticket statuses are `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`.
- **BR-14**: **Permitted Status Transitions Matrix**:
  - `NEW` -> `OPEN`, `IN_PROGRESS`, `CANCELLED`
  - `OPEN` -> `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED`
  - `IN_PROGRESS` -> `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
  - `WAITING_FOR_REQUESTER` -> `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
  - `RESOLVED` -> `CLOSED`, `REOPENED`
  - `CLOSED` -> `REOPENED`
  - `REOPENED` -> `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED`
  - `CANCELLED` is a terminal status; no transitions allowed from `CANCELLED`.
  - Any transition not explicitly listed in this matrix must be rejected by backend validation with `400 Bad Request` (`INVALID_TRANSITION`).
- **BR-15**: **Formal Resolution & Resolution Summary**: Only IT Staff and Administrators can transition a ticket to `RESOLVED` or `CLOSED`. Transitioning to `RESOLVED` allows specifying a `resolutionSummary` (visible to the Requester).
- **BR-16**: **Requester Problem Appears Resolved Indication**: A Requester may indicate that the problem appears resolved when their ticket is in `IN_PROGRESS` or `WAITING_FOR_REQUESTER`. This sets `resolutionIndicated = true`, timestamps `resolutionIndicatedAt = NOW()`, and appends an automated public comment, but does NOT formally change status to `RESOLVED` or `CLOSED`.
- **BR-17**: **Comments & Notes Immutability**: Both Public Comments and Internal Notes are strictly append-only. Updating or deleting existing comments or notes is prohibited.
- **BR-18**: **Content Validation & Backend Authorship**: Empty or whitespace-only comments or notes must be rejected (`400 Bad Request`). Minimum length is 1 character; maximum length is 2000 characters. Author identity (`authorId`) and creation timestamp (`createdAt`) are set by the server from the authenticated session.
- **BR-19**: **Internal Notes Confidentiality**: Requesters attempting to read or post Internal Notes must receive a `403 Forbidden` response without leaking note content or count.
- **BR-20**: **User Email Uniqueness**: User emails must be unique across all accounts (case-insensitive). Duplicate email creation or update attempts must be rejected with `409 Conflict`.
- **BR-21**: **Self-Deactivation Protection**: An Administrator cannot deactivate their own user account (`400 Bad Request`).
- **BR-22**: **Last Active Administrator Protection**: The system must prevent deactivating or changing the role of the last active Administrator in the system (`400 Bad Request`).
- **BR-23**: **User Deletion Prohibition**: User deletion is prohibited. User deactivation (`isActive = false`) must be used exclusively to preserve audit trails, ticket ownership, comments, and notes.
- **BR-24**: **Data Model & Relational Continuity**: Existing Lab 2 Categories, Related Systems, Tickets, and Attachments remain intact and valid after migration.

---

## 7. UI Specification Summary
The UI adheres strictly to the **Zen Green Design System** detailed in [ui-spec.md](file:///d:/AllStudyProject/CPE334/TokTickIT/docs/lab-03/ui-spec.md).
- **Application Shell & Header**: Displays TokTickIT brand logo, role-tailored navigation tabs, authenticated user name, role badge (`Requester`, `IT Staff`, `Admin`), and a clear Logout action.
- **Login Screen**: Centered card with email and password inputs, show/hide password toggle, inline validation, and safe error alerts.
- **Change Password Screen**: Forced view for users requiring password change with password complexity checklist, confirmation input, and progress feedback.
- **IT Staff Ticket Queue**: Responsive view (Desktop table ≥992px, Mobile cards <768px) with search bar, Category/Priority/Status/Owner filters, sortable column headers, pagination controls, and status/priority badges.
- **IT Staff Ticket Detail**: Monospace ticket header with status badge, 4-column metadata grid, claim/reassign dropdown, IT Priority selector, status update controls, optional resolution summary input, attachments section, and visually distinct Public Comments vs Internal Notes tabs/sections.
- **Requester Ticket Detail**: Requester view with ticket details, attachments, Public Comments timeline, and a prominent "Problem Appears Resolved" button.
- **Administrator User Management**: Clean user data table with search and role filter, "+ Create User" modal, user editing modal, activation toggle, and "Set New Initial Password" modal with safety alerts.

---

## 8. Data Changes & Migration Strategy

### 8.1 Entity Relationship Diagram (Conceptual)
```
┌─────────────────┐           1..* ┌──────────────────────┐
│      User       ├────────────────┤        Ticket        │
│ (id, name,      │  (requesterId) └──────────┬───────────┘
│  email, role,   │                           │ 0..1 (ownerId)
│  passwordHash,  ├───────────────────────────┤
│  isActive,      │           1..* ┌──────────┴───────────┐
│  mustChangePwd) ├────────────────┤    PublicComment     │
│                 │   (authorId)   └──────────────────────┘
│                 │           1..* ┌──────────────────────┐
│                 ├────────────────┤     InternalNote     │
└─────────────────┘   (authorId)   └──────────────────────┘
```

### 8.2 Prisma Schema Updates
- **`Role` Enum**: `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`
- **`TicketStatus` Enum**: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`
- **`RequestedPriority` Enum**: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- **`ITPriority` Enum**: `LOW`, `MEDIUM`, `HIGH`, `URGENT`
- **`User` Model** (evolved from `RequesterUser`):
  - `id` (Int, PK, autoincrement)
  - `name` (String)
  - `email` (String, unique)
  - `passwordHash` (String)
  - `role` (Role enum, default `REQUESTER`)
  - `isActive` (Boolean, default `true`)
  - `mustChangePassword` (Boolean, default `false`)
  - `createdAt`, `updatedAt` (DateTime)
  - Relations: `tickets` (as requester), `assignedTickets` (as owner), `publicComments`, `internalNotes`
- **`Ticket` Model Enhancements**:
  - `ownerId` (Int?, FK to User, nullable for unassigned tickets)
  - `itPriority` (ITPriority enum — **no default**, initialized by ticket creation copying `requestedPriority`)
  - `currentStatus` (TicketStatus enum, default `NEW`)
  - `resolutionIndicated` (Boolean, default `false`)
  - `resolutionIndicatedAt` (DateTime?)
  - `resolutionSummary` (String?, nullable)
  - Relations: `publicComments`, `internalNotes`
  - Operational Indexes: `@@index([requesterId])`, `@@index([ownerId])`, `@@index([categoryId])`, `@@index([relatedSystemId])`, `@@index([currentStatus])`, `@@index([itPriority])`, `@@index([createdAt])`
- **`PublicComment` Model**:
  - `id` (Int, PK, autoincrement)
  - `ticketId` (Int, FK to Ticket, cascade delete)
  - `authorId` (Int, FK to User)
  - `content` (String, max 2000 chars)
  - `createdAt` (DateTime, default now)
  - Indexes: `@@index([ticketId])`, `@@index([authorId])`
- **`InternalNote` Model**:
  - `id` (Int, PK, autoincrement)
  - `ticketId` (Int, FK to Ticket, cascade delete)
  - `authorId` (Int, FK to User)
  - `content` (String, max 2000 chars)
  - `createdAt` (DateTime, default now)
  - Indexes: `@@index([ticketId])`, `@@index([authorId])`

### 8.3 Required Migration from Lab 2 (§5.2)
To evolve the Lab 2 PostgreSQL and Prisma design without discarding existing Ticket or Attachment data:
1. **Model Evolution**: Migrate table `RequesterUser` into table `User` (or create `User` and migrate rows). Existing `requesterId` foreign keys on `Ticket` remain intact and reference `User.id`.
2. **Initial Password Seeding**: Existing Requesters receive a securely hashed initial password (`Password123!`). For testing purposes, Jennifer Anderson and Sarah Johnson are seeded with `mustChangePassword = false`, while David Lee is seeded with `mustChangePassword = true` to test the first-login password change flow.
3. **Ticket Field Migration**: Existing Lab 2 tickets have their `itPriority` populated copying `requestedPriority`, and their `ownerId` set to `null` (unassigned).
4. **Removal of Development Selector State**: Client-side `RequesterContext.tsx` and `localStorage.removeItem("toktickit_requester")` are retired in favor of `AuthContext` using `toktickit_token` and `/api/auth/me`.

### 8.4 Seed Data Demographics & Credentials Reference Table (§5.3)
All passwords are for local development only and hashed with bcrypt (salt rounds = 10).

| Full Name | Email Address | Role | Status | Initial Password | mustChangePassword | Notes / Test Role |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **Jennifer Anderson** | `jennifer.anderson@example.com` | `REQUESTER` | Active | `Password123!` | No | Primary active requester (owns Lab 2 tickets) |
| **Sarah Johnson** | `sarah.johnson@example.com` | `REQUESTER` | Active | `Password123!` | No | Secondary active requester (cross-user isolation) |
| **Michael Brown** | `michael.brown@example.com` | `REQUESTER` | Active | `Password123!` | No | Requester with multiple tickets across categories |
| **Amanda Clark** | `amanda.clark@example.com` | `REQUESTER` | Active | `Password123!` | No | Requester for resolution testing |
| **David Lee** | `david.lee@example.com` | `REQUESTER` | Active | `Password123!` | **Yes** | **Testing first-login password change flow** |
| **Robert Taylor** | `robert.taylor@example.com` | `REQUESTER` | **Inactive** | `Password123!` | No | **Testing inactive requester login rejection** |
| **Alex Thompson** | `alex.thompson@toktickit.com` | `IT_STAFF` | Active | `Password123!` | No | Primary active IT Staff |
| **Lisa Martinez** | `lisa.martinez@toktickit.com` | `IT_STAFF` | Active | `Password123!` | No | Secondary active IT Staff (ticket assignment) |
| **Kevin Patel** | `kevin.patel@toktickit.com` | `IT_STAFF` | Active | `Password123!` | No | IT Staff for queue query testing |
| **Robert Wilson** | `robert.wilson@toktickit.com` | `IT_STAFF` | **Inactive** | `Password123!` | No | **Testing inactive staff assignment rejection** |
| **John Smith** | `john.smith@toktickit.com` | `ADMINISTRATOR` | Active | `Password123!` | No | **Primary active Administrator (safety tests)** |

---

## 9. API Contract Summary
Refer to [api-spec.md](file:///d:/AllStudyProject/CPE334/TokTickIT/docs/lab-03/api-spec.md) for full endpoint specifications.
- **Auth**: `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`, `POST /api/auth/change-password`
- **IT Staff Queue**: `GET /api/staff/tickets` (query: `search`, `category`, `status`, `requestedPriority`, `itPriority`, `ownerId`, `page`, `pageSize`, `sortBy`, `sortOrder`)
- **IT Staff Ticket Ops**: `GET /api/staff/tickets/:id`, `PATCH /api/staff/tickets/:id/owner`, `PATCH /api/staff/tickets/:id/priority`, `PATCH /api/staff/tickets/:id/status` (supports `resolutionSummary`)
- **Comments & Notes**: `GET /api/tickets/:id/comments`, `POST /api/tickets/:id/comments`, `GET /api/tickets/:id/notes` (staff/admin only), `POST /api/tickets/:id/notes` (staff/admin only)
- **Requester Ops**: Continued `POST /api/tickets`, `GET /api/tickets`, `GET /api/tickets/:id`, `POST /api/tickets/:id/attachments`, `GET /api/attachments/:id/download`, `DELETE /api/attachments/:id`, plus `POST /api/tickets/:id/resolve-indication`
- **User Management**: `GET /api/admin/users`, `POST /api/admin/users`, `PATCH /api/admin/users/:id`, `POST /api/admin/users/:id/reset-password`

---

## 10. Acceptance Criteria

- **AC-01**: Given an active user with valid credentials, when the user logs in, then the backend establishes authenticated access and returns the permitted user identity and role.
- **AC-02**: Given a user who must change the initial password (`mustChangePassword = true`), when login succeeds, then normal application screens remain unavailable until a valid new password is saved.
- **AC-03**: Given an authenticated Requester, when the client supplies another requesterId or requests ticket endpoints, then the backend applies the authenticated identity and does not return another Requester's data (`403 Forbidden` / `404 Not Found`).
- **AC-04**: Given a Requester account, when an Internal Note endpoint is requested, then the operation is rejected (`403 Forbidden`) without exposing note content.
- **AC-05**: Given an inactive user account (`isActive = false`), when login is attempted, then access is denied with a safe error message.
- **AC-06**: Given an authenticated user, when logout is triggered, then authenticated access is terminated and subsequent protected requests return `401 Unauthorized`.
- **AC-07**: Given an active IT Staff user, when accessing the IT Staff Ticket Queue, then all system tickets are viewable with functional search, filtering, sorting, and pagination.
- **AC-08**: Given an active IT Staff user, when opening Ticket Detail, then the user can claim ownership or reassign the ticket to any active staff/admin user.
- **AC-09**: Given an active IT Staff user, when updating IT Priority, then the updated IT Priority persists while the Requester's requestedPriority remains unchanged.
- **AC-10**: Given an active IT Staff user, when advancing ticket status according to the transition matrix, then the status updates successfully; invalid transitions are rejected (`400 Bad Request`).
- **AC-11**: Given a ticket, when a Requester, IT Staff, or Admin posts a valid Public Comment, then the comment appears in the public comment feed with author and timestamp.
- **AC-12**: Given an owned ticket in progress, when the Requester clicks "Problem Appears Resolved", then the system records the resolution indication without prematurely setting formal status to `RESOLVED` or `CLOSED`.
- **AC-13**: Given an Administrator, when creating a new user with valid details and initial password, then the user is created with `mustChangePassword = true` and appears in the user list.
- **AC-14**: Given an Administrator, when attempting to deactivate their own account, then the request is rejected with `400 Bad Request`.
- **AC-15**: Given an Administrator, when attempting to deactivate or demote the sole active Administrator in the system, then the request is rejected with `400 Bad Request`.
- **AC-16**: Given an Administrator, when setting a new initial password for a user, then that user is flagged with `mustChangePassword = true` and must change password on their next login.

---

## 11. Definition of Done

### 11.1 Part 1: Product Completion
- [ ] Real authentication, logout, and mandatory first-login password change fully implemented.
- [ ] Role-based application shell and server-side RBAC enforced for Requester, IT Staff, and Administrator.
- [ ] Requester regression complete: Lab 2 features work under authenticated identity, with Public Comments and "Problem Appears Resolved" actions.
- [ ] IT Staff Ticket Queue with search, filters, sorting, pagination, and responsive cards/table implemented.
- [ ] IT Staff Ticket Detail with claim/reassign ownership, IT Priority, status progression, resolution summary, public comments, and internal notes implemented.
- [ ] Administrator User Management screen with user list, search/filter, create, edit, activate/deactivate, and initial password reset implemented.
- [ ] Backend safety constraints (no self-deactivation, prevent last admin deactivation, duplicate email rejection) fully enforced.
- [ ] Database migration and idempotent seed data implemented without data loss.
- [ ] All automated tests (unit, API, UI, E2E) passing with 100% success rate.
- [ ] Zen Green responsive styling verified across desktop, tablet, and mobile with zero horizontal overflow.

### 11.2 Part 2: Course Delivery Requirements
- [ ] Sprint 3 decomposed into GitHub Issues on Kanban board with feature branches merged into `lab3-staging` and then `main`.
- [ ] PR reviews, comments, and approvals documented in `reviewer.md`.
- [ ] AI prompts and reflection documented in `ai-use.md`.
- [ ] Responsive screenshot artifacts captured in `artifacts/lab-03/screenshots/`.
- [ ] Complete single PDF submission compiled answering Parts 1 through 9.

---

## 12. Assumptions and Decisions
1. **Authentication & Token Invalidation Strategy**: JSON Web Tokens (JWT) containing `{ id, email, role, mustChangePassword }` signed by `JWT_SECRET`, transmitted via HTTP `Authorization: Bearer <token>`. To satisfy Handout §6.1 regarding logout invalidation while using JWTs, the backend maintains a lightweight **Token Revocation Store (Blocklist)**. When a user logs out (`POST /api/auth/logout`), the token is registered in the revocation store (with automatic TTL cleanup upon token expiry). The `authenticate` middleware verifies both signature/expiration and checks against the revocation store, guaranteeing that revoked tokens return `401 Unauthorized` (`TOKEN_REVOKED`).
2. **Password Security**: Passwords hashed using bcrypt with salt rounds = 10. Passwords are never returned in user API responses.
3. **IT Priority Initialization**: During ticket creation (`POST /api/tickets`), backend initializes `itPriority` to the exact value of `requestedPriority`.
4. **Resolution Summary**: When transitioning a ticket to `RESOLVED` or `CLOSED`, IT Staff can optionally provide a `resolutionSummary` string which is stored on the ticket and made visible to the Requester.
5. **Admin User List Simplicity**: User list loads all active and inactive users in a responsive table with client-side/server-side search and role filtering. Full pagination on the user list is excluded per §4.2 of the handout.
