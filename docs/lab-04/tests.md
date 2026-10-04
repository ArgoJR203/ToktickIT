# Lab 4 Test Plan and Traceability Matrix

## 1. Test Strategy

The testing strategy for Lab 4 enforces **Specification-Driven Development (Spec DD)** and **Test-Driven Development (TDD)** principles. Comprehensive automated test coverage spans eight distinct testing layers across unit domain rules, backend REST API integration, frontend UI components, responsive layout checks, and end-to-end user workflows.

### 1.1 Pure Domain Unit Tests (`server/tests/lab-04/`)
Isolated algorithmic tests executed in-memory without database latency:
1. `UNIT-01`: **Actions Taken Content & Follow-up Validator**: Validates description/result non-empty limits (1–2000 chars) and enforces that `followUpNote` is mandatory if and only if `followUpRequired === true` (`BR-04`, `BR-05`).
2. `UNIT-02`: **Optimistic Concurrency Version Validator**: Evaluates version match logic (`submittedVersion === currentVersion`), verifying that mismatched versions trigger stale-update rejections (`BR-13`).
3. `UNIT-03`: **Lifecycle Status Transition State Machine**: Validates all permitted transitions across the 8-status universe and verifies that unauthorized transitions are rejected (`BR-09`, `BR-10`).
4. `UNIT-04`: **Dashboard Operational Metrics Calculator**: Verifies pure mathematical aggregation algorithms (unassigned filter, assigned to caller, status counts, priority grouping).

### 1.2 Actions Taken Backend API Tests (`server/tests/lab-04/actions-taken.api.test.ts`)
- **API-01**: Retrieve Actions Taken list for owned ticket by Requester (`200 OK`).
- **API-02**: Cross-requester isolation: Requester querying Actions Taken for another user's ticket returns `403 Forbidden` (`OWNERSHIP_VIOLATION`).
- **API-03**: Create valid Action Taken by IT Staff with auto-populated performer (`201 Created`) *(Handout §10 exact, AC-01)*.
- **API-04**: Multi-staff collaboration: Staff Member B logs Action Taken on a ticket owned by Staff Member A (`BR-02`, `AC-04`).
- **API-05**: Validation rejection: Missing or empty description or result returns `400 Bad Request` (`INVALID_INPUT`).
- **API-06**: Conditional follow-up validation: `followUpRequired = true` without `followUpNote` returns `400 Bad Request` (`INVALID_INPUT`).
- **API-07**: Role restriction: Requester attempting `POST /api/tickets/:id/actions-taken` returns `403 Forbidden` (`FORBIDDEN_ROLE`).
- **API-08**: Update Action Taken: IT Staff updates description, result, or attachment notes via `PATCH` (`200 OK`).

### 1.3 Ticket Workflow & Optimistic Concurrency API Tests (`server/tests/lab-04/ticket-workflow.api.test.ts`)
- **API-09**: Valid status transition: IT Staff advances status from `OPEN` to `IN_PROGRESS` with incremented version (`200 OK`).
- **API-10**: Invalid status jump rejection: Transitioning from `NEW` directly to `RESOLVED` returns `400 Bad Request` (`INVALID_TRANSITION`).
- **API-11**: Optimistic concurrency collision: Submitting status update with obsolete `version` returns `409 Conflict` (`STALE_UPDATE`) and current ticket state (`BR-13`, `AC-08`).
- **API-12**: Resolution gate enforcement: Advancing to `RESOLVED` or `CLOSED` requires non-empty `resolutionSummary` (`422 Unprocessable` / `400 Bad Request`).
- **API-13**: Requester advisory resolution indication: `POST /api/tickets/:id/resolve-indication` sets `resolutionIndicated = true` and logs public comment without changing ticket status (`BR-11`, `AC-03`).

### 1.4 Role Dashboard API Tests (`requester-dashboard.api.test.ts`, `staff-dashboard.api.test.ts`)
- **API-14**: Requester dashboard: Returns aggregated metrics and recent tickets strictly owned by the caller (`200 OK`) *(Handout §10 exact, AC-02)*.
- **API-15**: IT Staff dashboard: Returns operational metrics (unassigned count, assigned to caller, status counts, priority counts) (`200 OK`, `AC-10`).
- **API-16**: Administrator dashboard extension: When requested by Admin, payload includes `adminStats` with total users, active users, and counts by role (`200 OK`, `AC-11`).
- **API-17**: Cross-role protection: IT Staff accessing requester dashboard or Requester accessing staff dashboard returns `403 Forbidden`.

### 1.5 Client UI Component Tests (`client/tests/lab-04/`)
- `ActionsTaken.test.tsx`:
  - **UI-01**: Renders Actions Taken table with timestamps, performers, and results.
  - **UI-02**: Modal validation: follow-up note input appears conditionally and enforces required validation when checked.
  - **UI-03**: Requester view hides "+ Log Action Taken" and edit buttons (read-only mode).
- `TicketWorkflow.test.tsx`:
  - **UI-04**: Status dropdown displays only permitted next statuses based on state machine.
  - **UI-05**: Renders 409 conflict alert banner with "Reload Latest Ticket Data" button when stale update occurs.
  - **UI-06**: Renders advisory resolution notice banner when requester has signaled resolution.
- `RequesterDashboard.test.tsx`:
  - **UI-07**: Displays 4 metric cards with correct counts and drill-down links to `/tickets`.
- `StaffDashboard.test.tsx`:
  - **UI-08**: Displays 5 operational metric cards, recent queue list, quick action buttons, and Admin Statistics card for administrators.

### 1.6 Playwright End-to-End (E2E) Suites (`e2e/lab-04/`)
- `actions-taken-flow.spec.ts` (**E2E-01**): IT Staff logs in, opens ticket, creates Action Taken with follow-up note, verifies auto-assigned performer; edits action; logs out and logs in as Requester to verify read-only view.
- `ticket-resolution.spec.ts` (**E2E-02**): Requester clicks "Problem Appears Resolved"; verifies status remains unchanged; IT Staff logs in, reviews work, enters resolution summary, and formally sets status to `RESOLVED` *(Handout §10 exact, AC-03)*.
- `dashboards.spec.ts` (**E2E-03**): Requester and IT Staff dashboards load with accurate counts; clicking metric cards navigates to filtered queues; Admin sees user account metrics.
- `regression-smoke.spec.ts` (**E2E-04**): Full regression flow validating authentication, password changes, ticket attachments, public comments, internal notes, and admin user management.

---

## 2. Planned Tests Traceability Matrix

*(Test IDs aligned with Handout §10 and mapped to Acceptance Criteria)*

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Initial Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **UNIT-01** | Unit | BR-04, BR-05 | Actions Taken content and follow-up validation | Enforces 1–2000 chars; requires follow-up note only if followUpRequired is true | `server/tests/lab-04/actions-taken-validator.test.ts` | ⏳ Pending |
| **UNIT-02** | Unit | BR-13, AC-08 | Optimistic concurrency version comparison | Rejects mismatched version; accepts matching version | `server/tests/lab-04/concurrency-validator.test.ts` | ⏳ Pending |
| **UNIT-03** | Unit | BR-09, BR-10 | Status transition state machine logic | Allows legal transitions; blocks illegal skips (e.g. `NEW -> RESOLVED`) | `server/tests/lab-04/workflow-transition-validator.test.ts` | ⏳ Pending |
| **UNIT-04** | Unit | BR-15, BR-17 | Operational dashboard calculation helpers | Accurately aggregates counts by status, priority, and ownership | `server/tests/lab-04/dashboard-calculator.test.ts` | ⏳ Pending |
| **API-01** | API | BR-07 | Requester views Actions Taken on owned ticket | Returns chronological actions list (`200 OK`) | `server/tests/lab-04/actions-taken.api.test.ts` | ⏳ Pending |
| **API-02** | API | BR-07, AC-06 | Cross-requester Actions Taken access isolation | Rejects access to other users' ticket actions with `403 Forbidden` | `server/tests/lab-04/actions-taken.api.test.ts` | ⏳ Pending |
| **API-03** | API | AC-01, FR-02 | Create valid Action Taken by IT Staff *(Handout §10 exact)* | Created under ticket with auto-assigned performer (`201 Created`) | `server/tests/lab-04/actions-taken.api.test.ts` | ⏳ Pending |
| **API-04** | API | BR-02, AC-04 | Multi-staff collaboration on Action Taken | Staff B logs action on ticket owned by Staff A (`201 Created`) | `server/tests/lab-04/actions-taken.api.test.ts` | ⏳ Pending |
| **API-05** | API | BR-04 | Actions Taken description/result validation | Rejects empty description or result with `400 Bad Request` | `server/tests/lab-04/actions-taken.api.test.ts` | ⏳ Pending |
| **API-06** | API | BR-05, AC-05 | Conditional follow-up note validation | Rejects missing follow-up note when follow-up is true (`400 Bad Request`) | `server/tests/lab-04/actions-taken.api.test.ts` | ⏳ Pending |
| **API-07** | API | BR-07, AC-06 | Requester forbidden from creating Action Taken | Write attempt rejected with `403 Forbidden` (`FORBIDDEN_ROLE`) | `server/tests/lab-04/actions-taken.api.test.ts` | ⏳ Pending |
| **API-08** | API | FR-07 | IT Staff updates existing Action Taken | Updates description, result, follow-up, notes (`200 OK`) | `server/tests/lab-04/actions-taken.api.test.ts` | ⏳ Pending |
| **API-09** | API | BR-10 | Permitted ticket status transition | Updates status from `OPEN` to `IN_PROGRESS`, increments version (`200 OK`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | ⏳ Pending |
| **API-10** | API | BR-10, AC-07 | Illegal status transition rejection | Rejects jump from `NEW` to `RESOLVED` with `400 Bad Request` | `server/tests/lab-04/ticket-workflow.api.test.ts` | ⏳ Pending |
| **API-11** | API | BR-13, AC-08 | Optimistic concurrency conflict detection | Rejects write with outdated version returning `409 Conflict` (`STALE_UPDATE`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | ⏳ Pending |
| **API-12** | API | BR-12, AC-09 | Mandatory resolution summary on resolution | Requires min 5 chars resolution summary when setting `RESOLVED` (`200 OK`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | ⏳ Pending |
| **API-13** | API | BR-11, AC-03 | Requester advisory resolution indication | Flags resolutionIndicated, appends comment, status unchanged (`200 OK`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | ⏳ Pending |
| **API-14** | API | AC-02, BR-14 | Requester dashboard metrics isolation *(Handout §9.1 exact)* | Returns only metrics and recent tickets owned by caller (`200 OK`) | `server/tests/lab-04/requester-dashboard.api.test.ts` | ⏳ Pending |
| **API-15** | API | AC-10, BR-15 | IT Staff operational dashboard metrics | Returns unassigned, assigned to me, status, priority counts (`200 OK`) | `server/tests/lab-04/staff-dashboard.api.test.ts` | ⏳ Pending |
| **API-16** | API | AC-11, BR-16 | Administrator dashboard user account metrics | Returns staff metrics plus total users, active users, role counts (`200 OK`) | `server/tests/lab-04/staff-dashboard.api.test.ts` | ⏳ Pending |
| **API-17** | API | BR-14, BR-15 | Dashboard cross-role authorization restriction | Requesters blocked from staff dashboard; staff blocked from requester dashboard (`403`) | `server/tests/lab-04/staff-dashboard.api.test.ts` | ⏳ Pending |
| **UI-01** | UI | AC-01, FR-02 | Actions Taken table rendering | Renders chronological actions with datetime, performer, result | `client/tests/lab-04/ActionsTaken.test.tsx` | ⏳ Pending |
| **UI-02** | UI | AC-05, BR-05 | Actions Taken modal conditional follow-up | Follow-up note input displays and validates dynamically upon toggle | `client/tests/lab-04/ActionsTaken.test.tsx` | ⏳ Pending |
| **UI-03** | UI | AC-06, BR-07 | Actions Taken requester read-only mode | Hides create and edit buttons when viewed by ticket Requester | `client/tests/lab-04/ActionsTaken.test.tsx` | ⏳ Pending |
| **UI-04** | UI | BR-10 | Ticket Detail dynamic status dropdown | Exposes strictly permitted next statuses matching transition matrix | `client/tests/lab-04/TicketWorkflow.test.tsx` | ⏳ Pending |
| **UI-05** | UI | AC-08, BR-13 | Stale-update 409 conflict alert banner | Displays conflict notice and "Reload Latest Ticket Data" action button | `client/tests/lab-04/TicketWorkflow.test.tsx` | ⏳ Pending |
| **UI-06** | UI | BR-11 | Advisory resolution indication banner | Renders warning notice informing staff of requester's resolution signal | `client/tests/lab-04/TicketWorkflow.test.tsx` | ⏳ Pending |
| **UI-07** | UI | AC-02, AC-12 | Requester Dashboard cards and drill-downs | Displays 4 metric cards, recent tickets, routes to filtered `/tickets` | `client/tests/lab-04/RequesterDashboard.test.tsx` | ⏳ Pending |
| **UI-08** | UI | AC-10, AC-11 | Staff Dashboard operational cards & admin stats | Displays 5 metric cards, recent queue, quick actions, admin user stats | `client/tests/lab-04/StaffDashboard.test.tsx` | ⏳ Pending |
| **E2E-01** | E2E | AC-01, AC-04 | End-to-end Actions Taken lifecycle | IT Staff logs action, edits action, Requester views read-only | `e2e/lab-04/actions-taken-flow.spec.ts` | ⏳ Pending |
| **E2E-02** | E2E | AC-03, BR-11 | **Resolution gate workflow** *(Handout §10 exact)* | Requester indicates resolved; status remains unchanged; staff formally resolves | `e2e/lab-04/ticket-resolution.spec.ts` | ⏳ Pending |
| **E2E-03** | E2E | AC-02, AC-10 | Dashboards metrics and drill-down navigation | Verifies Requester and Staff dashboard counts and filter navigations | `e2e/lab-04/dashboards.spec.ts` | ⏳ Pending |
| **E2E-04** | E2E | AC-14, BR-19 | Full regression verification across Labs 1–3 | End-to-end check of auth, tickets, attachments, comments, notes, admin users | `e2e/lab-04/regression-smoke.spec.ts` | ⏳ Pending |
