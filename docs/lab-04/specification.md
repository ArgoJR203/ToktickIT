# Lab 4 Sprint Engineering Specification

## 1. Sprint Goal
Deliver an enterprise-grade service-desk product increment for **TokTickIT** that completes the core ticket execution lifecycle through **Actions Taken by IT Staff**, enforces authoritative **Ticket Status Transitions** with **Atomic Optimistic Concurrency Control (OCC)**, provides **Role-Appropriate Operational Dashboards** for Requesters, IT Staff, and Administrators, and executes comprehensive **Final Regression and Product Hardening** across all features established in Labs 1 through 3 within the Zen Green design language.

---

## 2. Stakeholder Request Interpretation
The TokTickIT service desk currently receives tickets, tracks ownership and IT priority, and supports public comments and internal notes. However, stakeholders identified critical operational gaps:
1. **Granular Work Planning & Execution Tracking (Actions Taken)**: IT Staff need a reliable way to plan and track the actual work under each ticket. Each action records date/time, description, result, automatically populated performer, approved assignee, action status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), follow-up requirement flag with mandatory follow-up notes, and attachment/reference notes.
2. **Coordinated Work Allocation**: While a single Ticket Owner coordinates the ticket overall, different IT Staff members can perform work and record Actions Taken on that ticket.
3. **Strict Resolution Gate Enforcement**: Requesters may signal when an issue appears resolved, but this signal remains strictly advisory. Furthermore, IT Staff cannot formally advance a ticket to `RESOLVED` or `CLOSED` while Actions Taken under the ticket remain incomplete or have pending follow-up. Formal resolution requires verified completion of work and a mandatory resolution summary.
4. **Authoritative Status-Transition Integrity & Concurrency**: The complete ticket lifecycle must be strictly enforced on the backend. Stale or concurrent updates from multiple users must be safely detected and prevented using atomic compare-and-swap optimistic concurrency control so that one user does not silently overwrite another user's recent workflow changes.
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
  - Captures: Action Date/Time (can be past, present, or future for planning), Action Description, Result, Performed By (auto-populated from authenticated session), Assignee (optional active IT Staff / Admin FK), Action Status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), Follow-Up Required? (boolean toggle), Follow-up Note (strictly required if follow-up is needed), Attachment Notes (referencing files/images), and concurrency `version`.
  - Inactive Assignee Protection: Assigning an inactive staff account is strictly rejected (`400 Bad Request`).
  - Multi-staff collaboration: Any active IT Staff or Administrator may log an Action Taken on a ticket, regardless of who is the primary Ticket Owner (`BR-02`).
  - Access control: Full create and edit permissions for IT Staff and Administrators; read-only view for Requesters on their owned tickets; strict rejection of unauthorized access (`403 Forbidden`).
  - ID Enumeration Protection: Requesters querying tickets not owned by them receive `404 Not Found` (`BR-21`).
- **Authoritative Ticket Lifecycle & Resolution Gates**:
  - 8 lifecycle statuses: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.
  - Backend-enforced state machine rejecting illegal status jumps (`400 Bad Request`).
  - Preserved backward compatibility: `CLOSED -> REOPENED` transition remains permitted (only `CANCELLED` is strictly terminal).
  - Advisory Resolution Gate: Requester's "Problem Appears Resolved" indication remains purely advisory (`resolutionIndicated = true`), triggering an automated public comment without altering ticket status (`BR-11`).
  - Action Completion Resolution Gate: Ticket cannot transition to `RESOLVED` or `CLOSED` if any Action Taken under it is in an incomplete state (`PENDING`, `IN_PROGRESS`) or has pending follow-up (`BR-20`).
  - Resolution Summary Gate: Mandatory `resolutionSummary` (min 5 chars) enforced when transitioning to `RESOLVED` or `CLOSED`.
- **Atomic Optimistic Concurrency Control (OCC)**:
  - Integer `version` column maintained on both `Ticket` and `ActionTaken` models.
  - State modification updates use atomic conditional updates (`UPDATE ... WHERE id = $1 AND version = $2`).
  - If a collision occurs (`count === 0`), the backend returns `409 Conflict` (`STALE_UPDATE`) and provides the current state, enabling the UI to prompt the user to reload without losing unsaved inputs.
  - Backward compatibility: Legacy API callers omitting `version` are processed gracefully without breaking Lab 3 tests.
- **Role-Appropriate Operational Dashboards**:
  - **Requester Dashboard** (`GET /api/requester/dashboard`): Authoritative aggregated metrics for total open tickets, tickets waiting for requester, recently updated tickets (top 5), and recently resolved tickets (top 5), strictly filtered to `requesterId === authUser.id`. Quick actions: *Create Ticket*, *View My Tickets*.
  - **IT Staff Dashboard** (`GET /api/staff/dashboard`): Operational metrics for unassigned tickets, tickets assigned to current user, count by status (all 8 statuses), count by IT priority (all 4 priorities), and recently updated queue items. Quick actions: *Create Ticket*, *Search Tickets*, *My Queue*.
  - **Administrator Dashboard Extension**: Includes all IT Staff operational metrics plus concise user management statistics: total users (11), active users (9), and user counts by role.
  - Interactive drill-down routing: Metric cards navigate to the corresponding ticket queue with query parameters prepopulating the filter.
  - Safe zero/empty states for all metric cards and ticket lists.
- **Zen Green UI Polish & Navigation Shell**:
  - Persistent Header navigation updated with a role-appropriate "Dashboard" link and active-route visual indication.
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
| **FR-02** | Actions Taken Fields | Each Action Taken record shall capture: Action Date/Time, Action Description, Result, Performed By (user FK), Assignee (nullable user FK), Action Status (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), Follow-Up Required (boolean), Follow-up Note (nullable), Attachment Notes (nullable), and concurrency Version (integer). |
| **FR-03** | Performer Auto-Population | The backend shall automatically assign `performedById` from the authenticated JWT session, ignoring and rejecting any client-supplied author overrides. |
| **FR-04** | Independent Collaboration | The system shall permit any active IT Staff or Administrator to create or update Actions Taken on any accessible ticket, regardless of whether they are the primary Ticket Owner. |
| **FR-05** | Actions Taken Validation | The system shall mandate non-empty `description` (1–2000 chars) and `result` (1–2000 chars). If `followUpRequired` is `true`, `followUpNote` shall be strictly required (1–1000 chars). |
| **FR-06** | Inactive Assignee Rejection | The system shall validate that any assigned user for an Action Taken is an active IT Staff or Administrator account (`isActive = true`), rejecting inactive accounts with `400 Bad Request`. |
| **FR-07** | Requester Read-Only View | The system shall allow Requesters to view Actions Taken records for their owned tickets in read-only mode, and reject any creation or modification attempts with `403 Forbidden`. |
| **FR-08** | Actions Taken Editing & OCC | The system shall allow IT Staff and Administrators to edit existing Actions Taken records while preserving the original creation timestamp and performer, updating `updatedById`, and enforcing optimistic concurrency via atomic CAS. |
| **FR-09** | Status Transition Enforcement | The system shall enforce the authoritative 8-status lifecycle state machine (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`), rejecting invalid state transitions. |
| **FR-10** | Advisory Resolution Gate | The system shall record a Requester's "Problem Appears Resolved" indication without altering the Ticket status, appending an automated audit comment and prompting IT Staff review. |
| **FR-11** | Action Completion Gate | The system shall prevent transitioning a Ticket to `RESOLVED` or `CLOSED` if any Action Taken under that ticket remains in `PENDING` or `IN_PROGRESS` status or has an unaddressed follow-up flag. |
| **FR-12** | Resolution Summary Gate | The system shall mandate a non-empty `resolutionSummary` (min 5 chars) whenever an IT Staff or Administrator advances a ticket to `RESOLVED` or `CLOSED`. |
| **FR-13** | Ticket Optimistic Concurrency | The system shall execute ticket status updates via atomic conditional write matching `version`. Mismatched versions shall return `409 Conflict` (`STALE_UPDATE`) with current ticket data. |
| **FR-14** | Requester Dashboard API | The system shall provide an endpoint returning aggregated operational counts (`totalOpen`, `waitingForRequester`, `recentlyUpdated`, `recentlyResolved`) strictly isolated to the authenticated Requester's tickets. |
| **FR-15** | IT Staff Dashboard API | The system shall provide an endpoint returning service-desk operational metrics: unassigned tickets count, tickets assigned to the caller, counts by status, counts by IT priority, and recent queue items. |
| **FR-16** | Admin Dashboard Extension | The system shall extend the staff dashboard response for Administrators with user account summary metrics: total users, active users, and user counts by role. |
| **FR-17** | Dashboard Navigation UI | The application shell header shall render a role-appropriate "Dashboard" navigation tab with an active visual indicator and route binding. |
| **FR-18** | Dashboard Metric Cards UI | Dashboard interfaces shall render Zen Green metric cards with labels, counts, subtitles, and accessible drill-down click targets linking to filtered ticket views. |
| **FR-19** | Double-Click Debounce | Interactive submission buttons on Action Taken, status transition, and ticket creation forms shall be debounced and disabled during active in-flight requests. |
| **FR-20** | Form Input Preservation | Recoverable submission failures (e.g., validation errors or 409 conflicts) shall retain user-entered form inputs without resetting the form. |
| **FR-21** | ID Enumeration Protection | Requesters attempting to access tickets or actions belonging to another user shall receive `404 Not Found` without disclosing whether the resource exists. |

---

## 5. Business Rules

### 5.1 Mandatory Handout Rules (§4.4)
- **BR-01**: **Action Taken belongs to exactly one Ticket.** An `ActionTaken` record maintains a strict foreign key relation to `Ticket` (`ticketId`) and cannot exist as an orphan. Deleting a ticket cascades deletion to its associated Actions Taken.
- **BR-02**: **The Ticket Owner coordinates the Ticket, but an Action Taken may be by a different IT Staff member.** Ticket ownership (`ownerId`) defines coordination responsibility, but any authenticated, active user with role `IT_STAFF` or `ADMINISTRATOR` may perform operational work, be assigned, and log an Action Taken on the ticket.

### 5.2 Extended Business Rules (BR-03 through BR-21)
- **BR-03**: **Performer Identity Authenticity**: The `performedById` field must be assigned authoritatively by the backend from the authenticated user's session token. Client payloads cannot supply or override `performedById`.
- **BR-04**: **Mandatory Action Content & Length Limits**:
  - `actionDateTime`: Defaults to server timestamp at creation if omitted; can be specified in the past or future to enable work planning and scheduling.
  - `description`: Strictly required, 1 to 2000 characters after trimming whitespace.
  - `result`: Strictly required, 1 to 2000 characters after trimming whitespace.
- **BR-05**: **Conditional Follow-Up Requirement**:
  - `followUpRequired` is a boolean flag (defaults to `false`).
  - If `followUpRequired === true`, `followUpNote` is strictly mandatory (1 to 1000 characters after trimming).
  - If `followUpRequired === false`, `followUpNote` must be null or empty.
- **BR-06**: **Attachment Reference Notes**: `attachmentNotes` is optional (0 to 500 characters), recording visual references, diagnostic file names, or hardware serial numbers.
- **BR-07**: **Action Assignee & Inactive Assignee Rejection**:
  - An Action Taken may have an optional `assigneeId` representing the designated IT Staff member responsible for the action.
  - The assignee must be an **active** user (`isActive = true`) with role `IT_STAFF` or `ADMINISTRATOR`.
  - Assigning an inactive user or a requester must be rejected with `400 Bad Request` (`code: "INACTIVE_ASSIGNEE"` or `"INVALID_ASSIGNEE"`).
- **BR-08**: **Action Taken Lifecycle Status**:
  - Permitted action statuses: `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`.
  - Default status is `COMPLETED` for executed work, or `PENDING` for planned work.
- **BR-09**: **Requester Actions Taken Read-Only Policy**: Requesters may view Actions Taken records for tickets they own (`requesterId === authUser.id`). Requesters are strictly forbidden from creating, updating, or deleting Actions Taken (`403 Forbidden`).
- **BR-10**: **Authoritative 8-Status Ticket Lifecycle**: The permitted Ticket statuses are strictly: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, and `CANCELLED`.
- **BR-11**: **Permitted Status Transition Matrix**:
  - `NEW` -> `OPEN`, `IN_PROGRESS`, `CANCELLED`
  - `OPEN` -> `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
  - `IN_PROGRESS` -> `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
  - `WAITING_FOR_REQUESTER` -> `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
  - `RESOLVED` -> `CLOSED`, `REOPENED`
  - `CLOSED` -> `REOPENED` *(Preserved from Lab 3)*
  - `REOPENED` -> `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED`
  - `CANCELLED` is a terminal status (no transitions permitted).
  - Any status transition not explicitly defined above must be rejected by backend validation with `400 Bad Request` (`INVALID_TRANSITION`).
- **BR-12**: **Advisory Resolution Gate**: A Requester's "Problem Appears Resolved" indication is advisory only. It sets `resolutionIndicated = true`, timestamps `resolutionIndicatedAt = NOW()`, and appends an automated public comment, but **does not** modify `currentStatus`. IT Staff review is mandatory before formal resolution.
- **BR-13**: **Mandatory Resolution Summary on Closure/Resolution**: Transitioning any Ticket to `RESOLVED` or `CLOSED` requires an IT Staff or Administrator to supply or preserve a non-empty `resolutionSummary` (min 5 characters).
- **BR-14**: **Atomic Optimistic Concurrency Control (OCC)**:
  - Every `Ticket` and `ActionTaken` maintains an integer `version` initialized to `1`.
  - State updates execute an atomic conditional write: `UPDATE ... WHERE id = $1 AND version = $2`.
  - If no rows match, the update was superseded concurrently; the backend returns `409 Conflict` (`STALE_UPDATE`) and the latest database record.
  - Backward compatibility: If client omits `version`, the update executes without concurrency rejection to preserve legacy Lab 3 client behavior.
- **BR-15**: **Requester Dashboard Ownership Isolation**: All Requester Dashboard metrics (`totalOpen`, `waitingForRequester`, `recentlyUpdated`, `recentlyResolved`) must be computed by the backend strictly filtered by `ticket.requesterId === authUser.id`.
- **BR-16**: **IT Staff Dashboard Operational Aggregations**:
  - `unassignedCount`: Tickets where `ownerId IS NULL` and `currentStatus NOT IN ('CLOSED', 'CANCELLED')`.
  - `assignedToMeCount`: Tickets where `ownerId === authUser.id` and `currentStatus NOT IN ('CLOSED', 'CANCELLED')`.
  - `countsByStatus`: Map of counts across all 8 `TicketStatus` values.
  - `countsByPriority`: Map of counts across all 4 `ITPriority` values for non-terminal tickets.
  - `recentTickets`: Top 5 to 10 recently updated tickets.
- **BR-17**: **Administrator Dashboard Extension**: When an Administrator accesses the dashboard, the backend includes concise user account metrics: `totalUsers` (11), `activeUsers` (9), and `usersByRole` (`REQUESTER: 6`, `IT_STAFF: 4`, `ADMINISTRATOR: 1`).
- **BR-18**: **Authoritative Server Calculations**: All dashboard counts and analytical data must be calculated server-side using authoritative database queries. Clients must not calculate metrics by fetching raw, unpaginated ticket lists.
- **BR-19**: **Metric Card Drill-Down and Zero-State Contract**:
  - Every metric card must display `0` cleanly without visual errors when no matching records exist.
  - Every card features an accessible drill-down navigation link with standardized URL query parameters matching backend filter names (`currentStatus`, `ownerId`).
- **BR-20**: **Action Completion Gate on Resolution**: A Ticket cannot be transitioned to `RESOLVED` or `CLOSED` if any Action Taken under that ticket has `status IN ('PENDING', 'IN_PROGRESS')` or `followUpRequired === true`. All actions must be completed or cancelled before closing the ticket (`400 Bad Request`, `code: "INCOMPLETE_ACTIONS_TAKEN"`).
- **BR-21**: **ID Enumeration Prevention**: For Requesters, attempting to access any ticket ID or action ID that does not exist OR belongs to another requester must return `404 Not Found` (`code: "NOT_FOUND"`), never `403 Forbidden`, preventing resource enumeration.

---

## 6. UI Specification Summary
The TokTickIT user interface extends the **Zen Green Design System** detailed in [ui-spec.md](./ui-spec.md):
- **Role-Appropriate Navigation Shell**:
  - **Requester**: "Dashboard", "My Tickets", "Create Ticket".
  - **IT Staff**: "Dashboard", "Ticket Queue", "Create Ticket" *(Staff can create tickets on behalf of users)*.
  - **Administrator**: "Dashboard", "Ticket Queue", "User Management".
  - Active route tab is visually highlighted with `--color-secondary-green` (`#0B7A46`) and a white bottom border.
- **IT Staff Operational Dashboard**:
  - **Metric Cards Row**: 5 concise cards (*Unassigned*, *Open*, *In Progress*, *Waiting for Requester*, *My Assigned*) featuring large numerals, category labels, and accessible drill-down links.
  - **Operational Queue Preview**: Quick-view table/card list of recent tickets showing Ticket ID, title, status badge, and timestamp.
  - **Quick Actions Panel**: Direct shortcut buttons for *Create Ticket*, *Search Tickets*, and *My Queue*.
- **Requester Dashboard**:
  - **Metric Cards Row**: 4 cards strictly isolated to the authenticated requester (*My Open Tickets*, *Waiting for Requester*, *Recently Updated*, *Recently Resolved*).
  - **Recent Activity Preview**: Top 5 recently updated owned tickets.
  - **Quick Actions Panel**: Shortcuts for *Create Ticket* and *View My Tickets*.
- **Actions Taken Component on Ticket Detail**:
  - Located on Ticket Detail below metadata.
  - **Staff/Admin Mode**: Interactive table (desktop) / cards (mobile) with "+ Log Action Taken" button, edit action on each row, modal dialog with auto-populated performer, assignee select (with inactive filtering), status selector (`PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`), datetime picker (supports future planning), description, result, follow-up toggle with conditionally mandatory note, and attachment notes.
  - **Requester Mode**: Read-only table/card list displaying all logged actions, timestamps, performers, and results, without create/edit buttons.
- **Ticket Workflow & Concurrency Conflict UI**:
  - Dynamic status dropdown exposing strictly valid next statuses based on `BR-11`.
  - Yellow advisory banner on staff view when Requester has signaled "Problem Appears Resolved".
  - Amber conflict banner with reload button when a `409 Conflict` occurs, informing the user that another staff member has updated the ticket.

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
│                 ├──────────────┼─┤     ActionTaken      │
│                 │  (assignee)  │ │ (id, ticketId,       │
│                 ├──────────────┼─┤  performedById,      │
│                 │ (updatedBy)  │ │  assigneeId,         │
│                 │              │ │  status, version,    │
│                 │ (authorId)   │ │  actionDateTime,     │
│                 ├──────────────┐ │  description, result,│
│                 │ (authorId)   │ │  followUpRequired,   │
│                 ├────────────┐ │ │  followUpNote,       │
│                 │            │ │ │  attachmentNotes,    │
│                 │            │ │ │  updatedById)        │
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

enum ActionStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model ActionTaken {
  id               Int          @id @default(autoincrement())
  ticketId         Int
  ticket           Ticket       @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  performedById    Int
  performedBy      User         @relation("ActionsPerformed", fields: [performedById], references: [id])
  assigneeId       Int?
  assignee         User?        @relation("ActionsAssigned", fields: [assigneeId], references: [id])
  updatedById      Int?
  updatedBy        User?        @relation("ActionsUpdated", fields: [updatedById], references: [id])
  status           ActionStatus @default(COMPLETED)
  version          Int          @default(1)
  actionDateTime   DateTime     @default(now())
  description      String       // min 1, max 2000 chars
  result           String       // min 1, max 2000 chars
  followUpRequired Boolean      @default(false)
  followUpNote     String?      // mandatory if followUpRequired is true
  attachmentNotes  String?      // optional reference notes
  createdAt        DateTime     @default(now())
  updatedAt        DateTime     @updatedAt

  @@index([ticketId])
  @@index([performedById])
  @@index([assigneeId])
  @@index([actionDateTime])
  @@index([status])
}

// Enhancements to model Ticket:
// 1. actionsTaken ActionTaken[]
// 2. version Int @default(1) (optimistic concurrency counter)

// Enhancements to model User:
// 1. actionsPerformed ActionTaken[] @relation("ActionsPerformed")
// 2. actionsAssigned  ActionTaken[] @relation("ActionsAssigned")
// 3. actionsUpdated   ActionTaken[] @relation("ActionsUpdated")
```

### 7.3 Database Design Justifications (§5.1)
1. **Dedicated `ActionTaken` Table Distinct from Comments and Notes**:
   - *Rationale*: Public comments represent conversational dialogue with requesters, while internal notes represent private staff deliberations. Actions Taken represent structured, auditable units of operational labor with specialized fields (`result`, `assigneeId`, `status`, `followUpRequired`, `followUpNote`, `attachmentNotes`, `actionDateTime`). Creating a dedicated table preserves clear domain boundaries, permits independent indexing, enables schema evolution without polluting conversational records, and facilitates precise role-based authorization (e.g., requesters can read actions taken but cannot read internal notes).
2. **Explicit Integer `version` Column for Atomic Optimistic Concurrency**:
   - *Rationale*: While timestamp columns like `updatedAt` can be used for concurrency checks, database timestamp precisions vary across environments (PostgreSQL microsecond vs JavaScript millisecond rounding) and are vulnerable to clock skew and rapid back-to-back writes within the same millisecond. An explicit integer `version` column updated via atomic compare-and-swap (`UPDATE ... WHERE id = $1 AND version = $2`) provides deterministic, race-condition-free optimistic concurrency control without deadlocks.

### 7.4 Migration, Backfill & Rollback Strategy (§5.2)
- **Zero Data Loss**: The migration is purely additive, introducing the `ActionTaken` table and `ActionStatus` enum, and adding `version Int @default(1)` to `Ticket`. All existing tickets, users, comments, notes, and attachments are preserved without alteration.
- **Legacy Tickets Backfill**: Existing tickets created in Labs 1–3 default to `version = 1` and have zero Actions Taken. Queries treat legacy tickets naturally: ticket detail displays an empty Actions Taken state, and dashboard calculations accurately aggregate over legacy records.
- **Rollback Strategy**: In the event of a rollback, a down migration script drops the `ActionTaken` table and drops the `version` column from `Ticket`. No legacy columns or relationships are touched.

### 7.5 Idempotent Seed Data Demographics (§5.3)
The seed script (`server/prisma/seed.ts`) is safe to run repeatedly (`upsert` patterns) and populates:
- **Users**: 11 accounts matching Lab 3 seed:
  - 6 Requesters: Jennifer Anderson, Sarah Johnson, Michael Brown, Amanda Clark, David Lee (mustChangePassword), Robert Taylor (inactive).
  - 4 IT Staff: Alex Thompson, Lisa Martinez, Kevin Patel, Robert Wilson (inactive).
  - 1 Administrator: John Smith.
- **Tickets Across All 8 Statuses**: `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`.
- **Actions Taken Distribution**:
  - Tickets with **0 Actions Taken** (e.g., new tickets).
  - Tickets with **1 Action Taken** (diagnostic step).
  - Tickets with **multiple Actions Taken** performed by different IT Staff members on the same ticket.
  - Actions with `followUpRequired = true` and detailed `followUpNote`.
  - Actions in `COMPLETED`, `IN_PROGRESS`, and `PENDING` states.
- **Dashboard Metric Demographics**: Configured to verify both non-zero counts and zero/empty states across Requester, IT Staff, and Admin dashboards.

---

## 8. Authoritative Dashboard Metrics Specification

### 8.1 Unified Metrics Table

| Metric Key | Target Role | Calculation Formula / Query | Empty Behavior | Drill-Down Destination |
| :--- | :--- | :--- | :--- | :--- |
| `totalOpen` | Requester | `COUNT(*)` where `requesterId = auth.id` AND `currentStatus IN ('NEW', 'OPEN', 'IN_PROGRESS', 'WAITING_FOR_REQUESTER', 'REOPENED')` | Count: 0 | `/tickets?statusGroup=open` |
| `waitingForRequester` | Requester | `COUNT(*)` where `requesterId = auth.id` AND `currentStatus = 'WAITING_FOR_REQUESTER'` | Count: 0 | `/tickets?currentStatus=WAITING_FOR_REQUESTER` |
| `recentlyUpdated` | Requester | Top 5 tickets where `requesterId = auth.id` ORDER BY `updatedAt DESC, id DESC` | Empty list with "No recent tickets" | Click ticket -> Ticket Detail |
| `recentlyResolved` | Requester | Top 5 tickets where `requesterId = auth.id` AND `currentStatus IN ('RESOLVED', 'CLOSED')` ORDER BY `updatedAt DESC, id DESC` | Empty list with "No resolved tickets" | Click ticket -> Ticket Detail |
| `unassignedCount` | IT Staff / Admin | `COUNT(*)` where `ownerId IS NULL` AND `currentStatus NOT IN ('CLOSED', 'CANCELLED')` | Count: 0 | `/staff/tickets?owner=unassigned` |
| `assignedToMeCount` | IT Staff / Admin | `COUNT(*)` where `ownerId = auth.id` AND `currentStatus NOT IN ('CLOSED', 'CANCELLED')` | Count: 0 | `/staff/tickets?owner=me` |
| `countsByStatus` | IT Staff / Admin | Map of counts for each of the 8 `TicketStatus` values | Counts: 0 per status | `/staff/tickets?currentStatus={STATUS}` |
| `countsByPriority` | IT Staff / Admin | Map of counts for each of the 4 `ITPriority` values on non-terminal tickets | Counts: 0 per priority | `/staff/tickets?itPriority={PRIORITY}` |
| `recentTickets` | IT Staff / Admin | Top 5 to 10 tickets ORDER BY `updatedAt DESC, id DESC` | Empty list with "Queue empty" | Click ticket -> Staff Ticket Detail |
| `adminStats` | Admin only | `{ totalUsers: 11, activeUsers: 9, usersByRole: { REQUESTER: 6, IT_STAFF: 4, ADMINISTRATOR: 1 } }` | Omitted if not Admin | `/admin/users` |

- **Timezone & Date Boundaries**: Timestamps are stored and returned in UTC ISO-8601. Date trends (e.g. today's delta) use server local time (Asia/Bangkok, UTC+07:00, boundary 00:00:00 to 23:59:59).

---

## 9. Acceptance Criteria

| AC ID | Given | When | Then |
| :--- | :--- | :--- | :--- |
| **AC-01** | A permitted IT Staff user and valid action data | An Actions Taken is created via `POST /api/tickets/:id/actions-taken` | It is saved under the correct Ticket with the authenticated creator and approved assignee *(Handout §9.1 exact)*. |
| **AC-02** | An authenticated Requester | Dashboard data is retrieved via `GET /api/requester/dashboard` | Only metrics and recent Tickets owned by that Requester are returned *(Handout §9.1 exact)*. |
| **AC-03** | An authenticated Requester on an owned open ticket | Requester signals problem appears resolved | `resolutionIndicated` is set to `true`, an automated public comment is logged, but the ticket status remains unchanged awaiting IT Staff review. |
| **AC-04** | A ticket owned by Staff Member A | Staff Member B logs an Action Taken | The Action Taken is successfully created under the ticket with Staff Member B recorded as performer, demonstrating multi-staff collaboration (`BR-02`). |
| **AC-05** | An IT Staff user creating an Action Taken | `followUpRequired` is checked `true` but `followUpNote` is empty | The request is rejected with `400 Bad Request` (`INVALID_INPUT`) specifying that a follow-up note is mandatory. |
| **AC-06** | An authenticated Requester | Attempting to create or edit an Action Taken via `POST` or `PATCH` | The backend rejects the request with `403 Forbidden` (`FORBIDDEN_ROLE`). |
| **AC-07** | An IT Staff user attempting an invalid status jump (e.g. `NEW -> RESOLVED`) | Status update is submitted | The backend rejects the transition with `400 Bad Request` (`INVALID_TRANSITION`). |
| **AC-08** | An IT Staff user updating ticket status | Client sends an outdated `version` number | The backend detects the conflict via atomic CAS, rejects the write with `409 Conflict` (`STALE_UPDATE`), and returns the current ticket state. |
| **AC-09** | An IT Staff user transitioning a ticket to `RESOLVED` | Non-empty `resolutionSummary` is provided and all Actions Taken are completed | The status transitions to `RESOLVED`, the resolution summary is persisted, and `version` increments by 1. |
| **AC-10** | An IT Staff user accessing `/api/staff/dashboard` | Dashboard endpoint is queried | Authoritative operational counts for unassigned tickets, assigned to me, counts by status, and counts by priority are returned. |
| **AC-11** | An Administrator accessing `/api/staff/dashboard` | Dashboard endpoint is queried | Response includes operational metrics plus `adminStats` containing total users (11), active users (9), and user counts by role. |
| **AC-12** | A user clicking any dashboard metric card | User interacts with the card or drill-down link | Application navigates to the corresponding ticket queue with query parameters prepopulating the filter. |
| **AC-13** | A user submitting an Action Taken or status form | User clicks the submit button multiple times rapidly | Subsequent clicks are debounced/disabled and exactly one request is dispatched to the server. |
| **AC-14** | An application-wide regression audit | Testing authentication, tickets, comments, notes, attachments, and user administration | All Lab 1–3 automated test suites pass with 100% success rate and zero regressions. |
| **AC-15** | An IT Staff user assigning an Action Taken | Assignee is an inactive staff member (`isActive = false`) | The request is rejected with `400 Bad Request` (`INACTIVE_ASSIGNEE`). |
| **AC-16** | An IT Staff user attempting to resolve a ticket | An Action Taken under the ticket has `status = 'PENDING'` or pending follow-up | The transition is rejected with `400 Bad Request` (`INCOMPLETE_ACTIONS_TAKEN`). |

---

## 10. Definition of Done (DoD)
To ensure complete sprint execution before final release:
1. **Specification & Contracts**: `specification.md`, `ui-spec.md`, `api-spec.md`, `tests.md`, `reviewer.md`, and `ai-use.md` completed and aligned with handout requirements.
2. **Database & Migrations**: Prisma migration applied cleanly to PostgreSQL with zero data loss; idempotent seed script verified.
3. **Backend Implementation**: All Actions Taken, workflow state machine, atomic concurrency conflict handling, and dashboard APIs implemented with strict validation and RBAC.
4. **Frontend Implementation**: IT Staff and Requester dashboards, Actions Taken component on Ticket Detail, status selector with dynamic transitions, conflict recovery banner, and Header navigation shell implemented with Zen Green tokens.
5. **Automated Test Coverage**: 100% pass rate across all unit tests, API integration tests, client component tests, and Playwright E2E suites.
6. **Responsive & Accessibility Verification**: All screens verified across Desktop (1280px), Tablet (768px), and Mobile (375px) with zero horizontal overflow, min 44px touch targets, and WCAG AA contrast/focus standards.
7. **Git & Staged Integration**: Feature branches created, code reviewed with recorded comments in `reviewer.md`, merged to `lab4-staging`, and finally merged to `main`.
8. **Final Deliverable**: Compiled 9-part PDF report (`Answer Part 1` through `Answer Part 9`) with direct repository links and legible screenshots.

---

## 11. Assumptions and Technical Decisions
- **Optimistic Concurrency Mechanism**: Implemented via explicit integer `version` fields on `Ticket` and `ActionTaken` updated through atomic conditional writes (`updateMany({ where: { id, version } })`) to eliminate race conditions and avoid millisecond precision/clock-skew issues.
- **Action Taken Modifiability vs Auditability**: Actions Taken can be updated by active IT Staff and Administrators to record results or adjust follow-ups, with `updatedById` and `updatedAt` tracking modifications. Creation timestamp and initial performer remain immutable.
- **Action Scheduling / Future Dates**: `actionDateTime` can be set in the future to support planning upcoming work, as requested by the stakeholder ("plan and track").
- **ID Enumeration Protection**: Requesters querying any ticket or action not owned by them receive `404 Not Found` rather than `403 Forbidden` to prevent guessing valid ticket IDs.
- **Backward Compatibility**: `PATCH /api/staff/tickets/:id/status` accepts either `status` or `currentStatus`, and treats `version` as optional for unversioned legacy callers so that Lab 3 test suites continue passing without changes.
