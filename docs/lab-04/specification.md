# Lab 4 Sprint Engineering Specification

## 1. Sprint Goal
Deliver an enterprise-grade service-desk product increment for **TokTickIT** that completes the core ticket execution lifecycle through **Actions Taken by IT Staff**, enforces authoritative **Ticket Status Transitions** with **Optimistic Concurrency / Stale-Update Protection**, provides **Role-Appropriate Operational Dashboards** for Requesters, IT Staff, and Administrators, and executes comprehensive **Final Regression and Product Hardening** across all features established in Labs 1 through 3 within the Zen Green design system.

---

## 2. Stakeholder Request Interpretation
The TokTickIT service desk currently receives tickets, tracks ownership and IT priority, and supports public comments and internal notes. However, stakeholders identified critical operational gaps:
1. **Granular Work Execution Tracking (Actions Taken)**: IT Staff need a structured, auditable mechanism to plan and track operational actions taken under each ticket. Each action must record date/time, description, result, automatically populated performer, a follow-up requirement flag with mandatory follow-up notes, and attachment/reference notes.
2. **Coordinated Work Allocation**: While a single Ticket Owner coordinates the ticket overall, multiple distinct IT Staff members must be permitted to perform work and record Actions Taken on that ticket.
3. **Strict Resolution Gate Enforcement**: Requesters may signal when an issue appears resolved to them, but this signal must remain strictly advisory. Only IT Staff may formally verify the work, provide a resolution summary, and advance the ticket to `RESOLVED` or `CLOSED`.
4. **Authoritative Status-Transition Integrity & Concurrency**: The complete 8-status ticket lifecycle must be strictly enforced on the backend. Stale or concurrent updates from multiple users must be safely detected and prevented using optimistic concurrency control so that one user does not silently overwrite another user's recent workflow change.
5. **Role-Appropriate Operational Dashboards**: Users need concise, fast operational starting points connected directly to detailed queues:
   - **Requesters** require a dashboard showing only their owned tickets (total open, waiting for requester, recently updated, recently resolved) with quick actions.
   - **IT Staff** require an operational dashboard summarizing unassigned tickets, tickets assigned to them, breakdowns by status and IT priority, and recently updated work.
   - **Administrators** reuse the IT Staff operational dashboard enhanced with concise user-account metrics.
6. **Product Polish, Hardening & Zen Green Consistency**: The entire application must be verified against strict WCAG AA accessibility standards, responsive layouts (mobile, tablet, desktop) without clipping or horizontal overflow, robust error handling, double-click protection, and zero regression across earlier lab capabilities.

---

## 3. Scope

### 3.1 Included Scope
- **Actions Taken Subsystem**:
  - 1-to-N parent-child relational model under `Ticket`.
  - Recording: Action Date/Time, Action Description, Result, Performed by (auto-populated from authenticated session), Follow-Up Required? (boolean toggle), Follow-up Note (strictly required if follow-up is needed), Attachment Notes (referencing files/images).
  - Multi-staff collaboration: Any active IT Staff or Administrator may log an Action Taken on a ticket, regardless of who is the primary Ticket Owner (`BR-02`).
  - Access control: Full create and edit permissions for IT Staff and Administrators; read-only view for Requesters on their owned tickets; strict rejection of unauthorized access (`403 Forbidden`).
- **Authoritative Ticket Lifecycle & Resolution Gate**:
  - 8 lifecycle statuses: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.
  - Backend-enforced state machine rejecting illegal status jumps (`400 Bad Request` / `422 Unprocessable Entity`).
  - Requester "Problem Appears Resolved" indication remains purely advisory (`resolutionIndicated = true`), triggering a public notification comment without altering the official ticket status (`BR-11`).
  - Mandatory `resolutionSummary` (min 5 chars) enforced when transitioning to `RESOLVED` or `CLOSED`.
- **Optimistic Concurrency & Safe Conflict Handling**:
  - Integer `version` column maintained on `Ticket` model.
  - State modification endpoints validate the client's submitted version against the current database version.
  - Stale update detection triggers an immediate `409 Conflict` (`STALE_UPDATE`) response, returning current ticket data and enabling the UI to prompt the user to refresh without losing unsaved form context (`BR-13`).
- **Role-Appropriate Operational Dashboards**:
  - **Requester Dashboard** (`GET /api/requester/dashboard`): Authoritative aggregated metrics for total open tickets, tickets waiting for requester, recently updated tickets (top 5), and recently resolved tickets (top 5), strictly filtered to `requesterId === authUser.id`. Quick actions: *Create Ticket*, *View My Tickets*.
  - **IT Staff Dashboard** (`GET /api/staff/dashboard`): Operational metrics for unassigned tickets, tickets assigned to current user, count by status (all 8 statuses), count by IT priority (all 4 priorities), and recently updated queue items. Quick actions: *Create Ticket*, *Search Tickets*, *My Queue*.
  - **Administrator Dashboard Extension**: Includes all IT Staff operational metrics plus concise user management statistics: total users, active users, and user counts by role.
  - Interactive drill-down routing: Every metric card links directly to `/tickets` or `/staff/tickets` with prepopulated filter query parameters.
  - Safe zero/empty states for all metric cards and ticket lists.
- **Zen Green UI Polish & Navigation Shell**:
  - Persistent Header navigation updated with a role-appropriate "Dashboard" link and clear active-route visual indication.
  - High-contrast metric cards with status tokens, labels, and accessible drill-downs.
  - Accessible mobile cards (<768px) with minimum 44px touch targets; desktop data tables (>=992px).
- **Full Regression & Product Hardening**:
  - Verified preservation of all Lab 1–3 functionality: JWT authentication, password complexity, first-login mandatory password change, requester ticket creation and attachments, soft deletion with audit reasons, public comments, internal notes, and administrator user management.
  - Client-side submit debouncing (double-click prevention) and input preservation on recoverable submission errors.

### 3.2 Explicitly Excluded Scope (§4.2)
- ❌ Automatic SLA clocks, escalation engines, on-call scheduling, and breach notification engines.
- ❌ External notification delivery services (email, SMS, LINE, web push).
- ❌ Inventory consumption, spare-parts management, purchasing workflows, or service cost accounting.
- ❌ Timesheet billing, payroll tracking, or detailed labor-cost calculations.
- ❌ Multi-level approval chains and electronic signatures.
- ❌ Advanced business intelligence tools, custom report builders, or export data warehouses.
- ❌ Multi-tenant organizations and production cloud scale infrastructure.
- ❌ Unapproved product features not defined in this Sprint 4 engineering contract.

---

## 4. Functional Requirements

| FR ID | Feature Domain | Requirement Statement |
| :--- | :--- | :--- |
| **FR-01** | Actions Taken Model | The system shall persist multiple Actions Taken entries under each Ticket, maintaining parent-child referential integrity with cascade deletion on ticket purge. |
| **FR-02** | Actions Taken Fields | Each Action Taken record shall capture: Action Date/Time, Action Description, Result, Performed By (user FK), Follow-Up Required (boolean), Follow-up Note (nullable), and Attachment Notes (nullable). |
| **FR-03** | Performer Auto-Population | The backend shall automatically assign `performedById` from the authenticated JWT session, rejecting any client-supplied author overrides. |
| **FR-04** | Independent Collaboration | The system shall permit any active IT Staff or Administrator to create or update Actions Taken on any accessible ticket, regardless of whether they are the primary Ticket Owner. |
| **FR-05** | Actions Taken Validation | The system shall mandate non-empty `description` (1–2000 chars) and `result` (1–2000 chars). If `followUpRequired` is `true`, `followUpNote` shall be strictly required (1–1000 chars). |
| **FR-06** | Requester Read-Only View | The system shall allow Requesters to view Actions Taken records for their owned tickets in read-only mode, and reject any creation or modification attempts with `403 Forbidden`. |
| **FR-07** | Actions Taken Editing | The system shall allow IT Staff and Administrators to edit existing Actions Taken records while preserving the original creation timestamp and performer audit trail. |
| **FR-08** | Status Transition Enforcement | The system shall enforce the authoritative 8-status lifecycle state machine (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`), rejecting invalid state transitions. |
| **FR-09** | Advisory Resolution Gate | The system shall record a Requester's "Problem Appears Resolved" indication without altering the Ticket status, appending an automated audit comment and prompting IT Staff review. |
| **FR-10** | Resolution Summary Gate | The system shall mandate a non-empty `resolutionSummary` (min 5 chars) whenever an IT Staff or Administrator advances a ticket to `RESOLVED` or `CLOSED`. |
| **FR-11** | Optimistic Concurrency | The system shall verify the Ticket `version` integer on status updates. If the submitted version does not match the database version, the system shall reject the write with `409 Conflict` (`STALE_UPDATE`) and return the latest ticket state. |
| **FR-12** | Requester Dashboard API | The system shall provide an endpoint returning aggregated operational counts (`totalOpen`, `waitingForRequester`, `recentlyUpdated`, `recentlyResolved`) strictly isolated to the authenticated Requester's tickets. |
| **FR-13** | IT Staff Dashboard API | The system shall provide an endpoint returning service-desk operational metrics: unassigned tickets count, tickets assigned to the caller, counts by status, counts by IT priority, and recent queue items. |
| **FR-14** | Admin Dashboard Extension | The system shall extend the staff dashboard response for Administrators with user account summary metrics: total users, active users, and user counts by role. |
| **FR-15** | Dashboard Navigation UI | The application shell header shall render a role-appropriate "Dashboard" navigation tab with an active visual indicator and route binding. |
| **FR-16** | Dashboard Metric Cards UI | Dashboard interfaces shall render Zen Green metric cards with labels, counts, subtitles, and accessible drill-down click targets linking to filtered ticket views. |
| **FR-17** | Double-Click Protection | Interactive submission buttons on Action Taken, status transition, and ticket creation forms shall be debounced and disabled during active in-flight requests. |
| **FR-18** | Form Input Preservation | Recoverable submission failures (e.g., validation errors or 409 conflicts) shall retain user-entered form inputs without resetting the form. |
| **FR-19** | Full Regression Integrity | The system shall maintain 100% functional integrity across all Lab 1–3 capabilities: login, password change, ticket creation, attachments, soft-deletion, public comments, internal notes, and user admin. |

---

## 5. Business Rules

### 5.1 Mandatory Handout Rules (§4.4)
- **BR-01**: **Action Taken belongs to exactly one Ticket.** An `ActionTaken` record maintains a strict foreign key relation to `Ticket` (`ticketId`) and cannot exist as an orphan. Deleting a ticket cascades deletion to its associated Actions Taken.
- **BR-02**: **The Ticket Owner coordinates the Ticket, but an Action Taken may be by a different IT Staff member.** Ticket ownership (`ownerId`) defines coordination responsibility, but any authenticated, active user with role `IT_STAFF` or `ADMINISTRATOR` may perform operational work and log an Action Taken on the ticket.

### 5.2 Extended Business Rules (BR-03 through BR-19)
- **BR-03**: **Performer Identity Authenticity**: The `performedById` field must be assigned authoritatively by the backend from the authenticated user's session token. Client payloads cannot supply or spoof `performedById`.
- **BR-04**: **Mandatory Action Content & Length Limits**:
  - `actionDateTime`: Defaults to server timestamp at creation if omitted; client may specify custom historical datetime not exceeding current server time (`actionDateTime <= NOW()`).
  - `description`: Strictly required, 1 to 2000 characters after trimming whitespace.
  - `result`: Strictly required, 1 to 2000 characters after trimming whitespace.
- **BR-05**: **Conditional Follow-Up Requirement**:
  - `followUpRequired` is a boolean flag (defaults to `false`).
  - If `followUpRequired === true`, `followUpNote` is strictly mandatory (1 to 1000 characters after trimming).
  - If `followUpRequired === false`, `followUpNote` must be null or empty.
- **BR-06**: **Attachment Reference Notes**: `attachmentNotes` is optional (0 to 500 characters), recording visual references, diagnostic file names, or hardware serial numbers.
- **BR-07**: **Requester Actions Taken Read-Only Policy**: Requesters may view Actions Taken records for tickets they own (`requesterId === authUser.id`). Requesters are strictly forbidden from creating, updating, or deleting Actions Taken (`403 Forbidden`).
- **BR-08**: **IT Staff & Administrator Actions Taken Management**: Active IT Staff and Administrators have full authorization to view, create, and update Actions Taken records on all accessible tickets.
- **BR-09**: **Authoritative 8-Status Universe**: The permitted Ticket statuses are strictly: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`.
- **BR-10**: **Permitted Status Transition Matrix**:
  - `NEW` -> `OPEN`, `IN_PROGRESS`, `CANCELLED`
  - `OPEN` -> `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
  - `IN_PROGRESS` -> `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
  - `WAITING_FOR_REQUESTER` -> `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
  - `RESOLVED` -> `CLOSED`, `REOPENED`
  - `CLOSED` is a terminal status (no transitions permitted).
  - `CANCELLED` is a terminal status (no transitions permitted).
  - `REOPENED` -> `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED`
  - Any status transition not explicitly defined above must be rejected by backend validation with `400 Bad Request` (`INVALID_TRANSITION`).
- **BR-11**: **Advisory Resolution Gate**: A Requester's "Problem Appears Resolved" indication is advisory only. It sets `resolutionIndicated = true`, timestamps `resolutionIndicatedAt = NOW()`, and appends an automated public comment, but **does not** modify `currentStatus`. IT Staff review is mandatory before formal resolution.
- **BR-12**: **Mandatory Resolution Summary on Closure/Resolution**: Transitioning any Ticket to `RESOLVED` or `CLOSED` requires an IT Staff or Administrator to supply or preserve a non-empty `resolutionSummary` (min 5 characters).
- **BR-13**: **Optimistic Concurrency Conflict Detection**:
  - Every `Ticket` record maintains an integer `version` initialized to `1` and incremented on every workflow or status modification.
  - When submitting status or priority updates, the client must include the current `version`.
  - If `client.version !== database.version`, the backend must reject the write with `409 Conflict` (`STALE_UPDATE`), return the current authoritative ticket object, and prevent silent overwrites.
- **BR-14**: **Requester Dashboard Ownership Isolation**: All Requester Dashboard metrics (`totalOpen`, `waitingForRequester`, `recentlyUpdated`, `recentlyResolved`) must be computed by the backend strictly filtered by `ticket.requesterId === authUser.id`. Under no circumstances may metrics or ticket summaries leak across requesters.
- **BR-15**: **IT Staff Dashboard Operational Aggregations**:
  - `unassignedCount`: Tickets where `ownerId IS NULL` and `currentStatus NOT IN ('CLOSED', 'CANCELLED')`.
  - `assignedToMeCount`: Tickets where `ownerId === authUser.id` and `currentStatus NOT IN ('CLOSED', 'CANCELLED')`.
  - `countsByStatus`: Map of counts across all 8 `TicketStatus` values.
  - `countsByPriority`: Map of counts across all 4 `ITPriority` values for non-terminal tickets.
  - `recentTickets`: Top 5 to 10 recently updated tickets.
- **BR-16**: **Administrator Dashboard Extension**: When an Administrator accesses the dashboard, the backend includes concise user account metrics: `totalUsers`, `activeUsers`, and `usersByRole` (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`).
- **BR-17**: **Authoritative Server Calculations**: All dashboard counts and analytical data must be calculated server-side using authoritative database queries. Clients must not calculate metrics by fetching raw, unpaginated ticket lists.
- **BR-18**: **Metric Card Drill-Down and Zero-State Contract**:
  - Every metric card must display `0` cleanly without visual errors when no matching records exist.
  - Every card must feature an accessible drill-down navigation link with standardized URL query parameters (e.g. `/staff/tickets?owner=unassigned`, `/tickets?status=WAITING_FOR_REQUESTER`).
- **BR-19**: **Regression Integrity**: All prior functionality from Labs 1–3 (authentication, password complexity, first-login password change, requester ticket creation, attachments, soft delete, public comments, internal notes, admin user management) must remain 100% operational with 0 regressions.

---

## 6. UI Specification Summary
The TokTickIT user interface extends the **Zen Green Design System** detailed in [ui-spec.md](file:///d:/AllStudyProject/CPE334/ToktickIT/docs/lab-04/ui-spec.md):
- **Role-Appropriate Navigation Shell**:
  - **Requester**: "Dashboard", "My Tickets", "Create Ticket".
  - **IT Staff**: "Dashboard", "Ticket Queue", "Create Ticket".
  - **Administrator**: "Dashboard", "Ticket Queue", "User Management".
  - Active route tab is visually highlighted with `--color-secondary-green` (`#0B7A46`) and a white bottom border.
- **IT Staff Operational Dashboard**:
  - **Metric Cards Row**: 5 concise cards (*New*, *Open*, *In Progress*, *Waiting for Requester*, *My Assigned*) featuring large numerals, category labels, trend indicators, and accessible drill-down links.
  - **Operational Queue Preview**: Quick-view table/card list of recent tickets showing Ticket ID, title, status badge, and timestamp.
  - **Quick Actions Panel**: Direct shortcut buttons for *Create Ticket*, *Search Tickets*, and *My Queue*.
- **Requester Dashboard**:
  - **Metric Cards Row**: 4 cards strictly isolated to the authenticated requester (*My Open Tickets*, *In Progress*, *Resolved*, *Closed*).
  - **Recent Activity Preview**: Top 5 recently updated owned tickets.
  - **Quick Actions Panel**: Shortcuts for *Create Ticket* and *View My Tickets*.
- **Actions Taken Component on Ticket Detail**:
  - Located on Ticket Detail below metadata.
  - **Staff/Admin Mode**: Interactive table (desktop) / cards (mobile) with "+ Log Action Taken" button, edit action on each row, modal dialog with auto-populated performer, datetime picker, description, result, follow-up toggle with conditionally mandatory note, and attachment notes.
  - **Requester Mode**: Read-only table/card list displaying all logged actions, timestamps, performers, and results, without create/edit buttons.
- **Ticket Workflow & Concurrency Conflict UI**:
  - Dynamic status dropdown exposing strictly valid next statuses based on `BR-10`.
  - Yellow advisory banner on staff view when Requester has signaled "Problem Appears Resolved".
  - Amber conflict banner with reload button when a `409 Conflict` occurs, informing the user that another staff member has updated the ticket.
- **Responsive & Accessibility Baseline**:
  - Desktop (>=992px), Tablet (768px–991px), Mobile (<768px).
  - Minimum 44px touch targets on mobile controls.
  - High-contrast WCAG AA focus rings (`2px solid #0B7A46`).
  - Dual visual cues (color + icons/labels) for all status representations.

---

## 7. Data Changes & Migration Strategy

### 7.1 Entity Relationship Diagram (Conceptual)
```
┌─────────────────┐           1..* ┌──────────────────────┐
│      User       ├────────────────┤        Ticket        │
│ (id, name,      │  (requesterId) └──────────┬───────────┘
│  email, role,   │                           │
│  passwordHash,  ├───────────────────────────┤ 0..1 (ownerId)
│  isActive,      │                           │
│  mustChangePwd) ├──────────────┐            │ 1..*
│                 │ (performedBy)│ ┌──────────┴───────────┐
│                 │              └─┤     ActionTaken      │
│                 │ (authorId)     │ (id, ticketId,       │
│                 ├──────────────┐ │  actionDateTime,     │
│                 │ (authorId)   │ │  description, result,│
│                 ├────────────┐ │ │  followUpRequired,   │
│                 │            │ │ │  followUpNote,       │
│                 │            │ │ │  attachmentNotes)    │
│                 │            │ │ └──────────────────────┘
│                 │            │ │ 1..*
│                 │            │ ┌────────┴───────────┐
│                 │            └─┤    PublicComment   │
│                 │              └────────────────────┘
│                 │            1..*
│                 │            ┌──────────┴───────────┐
│                 └────────────┤     InternalNote     │
└─────────────────┘            └──────────────────────┘
```

### 7.2 Prisma Schema Increment
```prisma
// server/prisma/schema.prisma

model ActionTaken {
  id               Int       @id @default(autoincrement())
  ticketId         Int
  ticket           Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  performedById    Int
  performedBy      User      @relation("ActionsPerformed", fields: [performedById], references: [id])
  actionDateTime   DateTime  @default(now())
  description      String    // min 1, max 2000 chars
  result           String    // min 1, max 2000 chars
  followUpRequired Boolean   @default(false)
  followUpNote     String?   // mandatory if followUpRequired is true
  attachmentNotes  String?   // optional reference notes
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([ticketId])
  @@index([performedById])
  @@index([actionDateTime])
}

// Enhancements to model Ticket:
// 1. actionsTaken ActionTaken[]
// 2. version Int @default(1) (optimistic locking counter)

// Enhancements to model User:
// 1. actionsPerformed ActionTaken[] @relation("ActionsPerformed")
```

### 7.3 Database Design Justifications (§5.1)
1. **Dedicated `ActionTaken` Table Distinct from Comments and Notes**:
   - *Rationale*: Public comments represent conversational dialogue with requesters, while internal notes represent private staff deliberations. Actions Taken represent structured, auditable units of operational labor with specialized fields (`result`, `followUpRequired`, `followUpNote`, `attachmentNotes`, `actionDateTime`). Creating a dedicated table preserves clear domain boundaries, permits independent indexing, enables schema evolution without polluting conversational records, and facilitates precise role-based authorization (e.g., requesters can read actions taken but cannot read internal notes).
2. **Explicit Integer `version` Column for Optimistic Concurrency**:
   - *Rationale*: While timestamp columns like `updatedAt` can be used for concurrency checks, database timestamp precisions vary across environments (PostgreSQL microsecond vs JavaScript millisecond rounding) and are vulnerable to clock skew and rapid back-to-back writes within the same millisecond. An explicit integer `version` column incremented deterministically (`version: { increment: 1 }`) within transactions provides bulletproof, unambiguous optimistic concurrency protection against race conditions and stale updates.

### 7.4 Migration, Backfill & Rollback Strategy (§5.2)
- **Zero Data Loss**: The migration is purely additive, introducing the `ActionTaken` table and adding `version Int @default(1)` to `Ticket`. All existing tickets, users, comments, notes, and attachments are preserved without alteration.
- **Legacy Tickets Backfill**: Existing tickets created in Labs 1–3 default to `version = 1` and have zero Actions Taken. Queries treat legacy tickets naturally: ticket detail displays an empty Actions Taken state, and dashboard calculations accurately aggregate over legacy records.
- **Rollback Strategy**: In the event of a rollback, a down migration script drops the `ActionTaken` table and drops the `version` column from `Ticket`. No legacy columns or relationships are touched.

### 7.5 Idempotent Seed Data Demographics (§5.3)
The seed script (`server/prisma/seed.ts`) is safe to run repeatedly (`upsert` patterns) and populates:
- **Users**: 11 accounts (5 Requesters, 4 IT Staff, 2 Administrators) including active, inactive, and password-change-required states.
- **Tickets Across All 8 Statuses**:
  - `NEW` (unassigned)
  - `OPEN` (assigned)
  - `IN_PROGRESS` (with multiple Actions Taken)
  - `WAITING_FOR_REQUESTER` (with follow-up required Action Taken)
  - `RESOLVED` (with resolution summary and completed actions)
  - `CLOSED` (with comprehensive audit history)
  - `REOPENED` (previously resolved, now active)
  - `CANCELLED`
- **Actions Taken Distribution**:
  - Tickets with **0 Actions Taken** (e.g., brand new tickets).
  - Tickets with **1 Action Taken** (diagnostic step).
  - Tickets with **multiple Actions Taken** performed by different IT Staff members on the same ticket.
  - At least one action with `followUpRequired = true` and detailed `followUpNote`.
- **Dashboard Metric Demographics**: Configured to verify both non-zero counts and zero/empty states across Requester, IT Staff, and Admin dashboards.

---

## 8. API Contract Summary
Detailed request and response schemas, error structures, and validation rules are documented in [api-spec.md](file:///d:/AllStudyProject/CPE334/ToktickIT/docs/lab-04/api-spec.md).

| Method | Endpoint | Authorized Roles | Description & Concurrency Behavior |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/tickets/:id/actions-taken` | Requester (owner), IT Staff, Admin | Returns chronological list of Actions Taken for the ticket. |
| `POST` | `/api/tickets/:id/actions-taken` | IT Staff, Admin | Creates a new Action Taken. Auto-assigns `performedById`. Validates description, result, follow-up note. |
| `PATCH` | `/api/tickets/:id/actions-taken/:actionId` | IT Staff, Admin | Updates an existing Action Taken. Preserves original creation audit metadata. |
| `PATCH` | `/api/staff/tickets/:id/status` | IT Staff, Admin | Advances ticket status. Enforces transition matrix, resolution summary gate, and optimistic locking (`version` check). Returns `409 Conflict` if stale. |
| `POST` | `/api/tickets/:id/resolve-indication` | Requester (owner) | Records advisory resolution indication. Does NOT change ticket status to `RESOLVED`. |
| `GET` | `/api/requester/dashboard` | Requester | Returns concise aggregated metrics and recent tickets strictly scoped to authenticated requester. |
| `GET` | `/api/staff/dashboard` | IT Staff, Admin | Returns operational service-desk metrics (unassigned, assigned to me, counts by status/priority, recent tickets). Includes user metrics for Admin. |

---

## 9. Acceptance Criteria

| AC ID | Given | When | Then |
| :--- | :--- | :--- | :--- |
| **AC-01** | A permitted IT Staff user and valid action data | An Action Taken is created via `POST /api/tickets/:id/actions-taken` | It is saved under the correct Ticket with the authenticated creator as performer and returned with `201 Created` *(Handout §9.1 exact)*. |
| **AC-02** | An authenticated Requester | Dashboard data is retrieved via `GET /api/requester/dashboard` | Only metrics and recent Tickets owned by that Requester are returned *(Handout §9.1 exact)*. |
| **AC-03** | An authenticated Requester on an owned open ticket | Requester signals problem appears resolved | `resolutionIndicated` is set to `true`, an automated public comment is logged, but the ticket status remains unchanged awaiting IT Staff review. |
| **AC-04** | A ticket owned by Staff Member A | Staff Member B logs an Action Taken | The Action Taken is successfully created under the ticket with Staff Member B recorded as performer, demonstrating multi-staff collaboration (`BR-02`). |
| **AC-05** | An IT Staff user creating an Action Taken | `followUpRequired` is checked `true` but `followUpNote` is empty | The request is rejected with `400 Bad Request` (`INVALID_INPUT`) specifying that a follow-up note is mandatory. |
| **AC-06** | An authenticated Requester | Attempting to create or edit an Action Taken via `POST` or `PATCH` | The backend rejects the request with `403 Forbidden` (`FORBIDDEN_ROLE`). |
| **AC-07** | An IT Staff user attempting an invalid status jump (e.g. `NEW -> RESOLVED`) | Status update is submitted | The backend rejects the transition with `400 Bad Request` (`INVALID_TRANSITION`). |
| **AC-08** | An IT Staff user updating ticket status | Client sends an outdated `version` number | The backend detects the conflict, rejects the write with `409 Conflict` (`STALE_UPDATE`), and returns the current ticket state. |
| **AC-09** | An IT Staff user transitioning a ticket to `RESOLVED` | Non-empty `resolutionSummary` is provided | The status transitions to `RESOLVED`, the resolution summary is persisted, and `version` increments by 1. |
| **AC-10** | An IT Staff user accessing `/api/staff/dashboard` | Dashboard endpoint is queried | Authoritative operational counts for unassigned tickets, assigned to me, counts by status, and counts by priority are returned. |
| **AC-11** | An Administrator accessing `/api/staff/dashboard` | Dashboard endpoint is queried | Response includes operational metrics plus `adminStats` containing total users, active users, and user counts by role. |
| **AC-12** | A user clicking any dashboard metric card | User interacts with the card or drill-down link | Application navigates to the corresponding ticket queue with query parameters prepopulating the filter. |
| **AC-13** | A user submitting an Action Taken or status form | User clicks the submit button multiple times rapidly | Subsequent clicks are debounced/disabled and exactly one request is dispatched to the server. |
| **AC-14** | An application-wide regression audit | Testing authentication, tickets, comments, notes, attachments, and user administration | All Lab 1–3 automated test suites pass with 100% success rate and zero regressions. |

---

## 10. Definition of Done (DoD)
To ensure complete sprint execution before final release:
1. **Specification & Contracts**: `specification.md`, `ui-spec.md`, `api-spec.md`, `tests.md`, `reviewer.md`, and `ai-use.md` completed and aligned with handout requirements.
2. **Database & Migrations**: Prisma migration applied cleanly to PostgreSQL with zero data loss; idempotent seed script verified.
3. **Backend Implementation**: All Actions Taken, workflow state machine, concurrency conflict handling, and dashboard APIs implemented with strict validation and RBAC.
4. **Frontend Implementation**: IT Staff and Requester dashboards, Actions Taken component on Ticket Detail, status selector with dynamic transitions, conflict recovery banner, and Header navigation shell implemented with Zen Green tokens.
5. **Automated Test Coverage**: 100% pass rate across all unit tests, API integration tests, client component tests, and Playwright E2E suites.
6. **Responsive & Accessibility Verification**: All screens verified across Desktop (1280px), Tablet (768px), and Mobile (375px) with zero horizontal overflow, min 44px touch targets, and WCAG AA contrast/focus standards.
7. **Git & Staged Integration**: Feature branches created, code reviewed with recorded comments in `reviewer.md`, merged to `lab4-staging`, and finally merged to `main`.
8. **Final Deliverable**: Compiled 9-part PDF report (`Answer Part 1` through `Answer Part 9`) with direct repository links and legible screenshots.

---

## 11. Assumptions and Decisions
- **Optimistic Concurrency Mechanism**: Implemented via an explicit integer `version` field on `Ticket` rather than floating timestamps to guarantee cross-platform consistency and zero clock-skew vulnerabilities.
- **Action Taken Immutability vs Editable**: Handout §8.3 specifies both "create mode and view/edit mode". We permit IT Staff and Administrators to edit existing action descriptions, results, follow-up flags, notes, and attachment notes, while keeping original creation timestamp and performer immutable.
- **Admin Dashboard Integration**: Handout §4.6 states "Administrator dashboard may reuse the IT Staff dashboard and optionally include concise user-account counts". We implement this by having `/api/staff/dashboard` return an `adminStats` object when the requesting user's role is `ADMINISTRATOR`.
- **Soft Deletion of Actions Taken**: Handout does not require deletion of Actions Taken. In alignment with audit requirements, Actions Taken are append-only historical records; cascade deletion occurs only if the parent Ticket is purged.
