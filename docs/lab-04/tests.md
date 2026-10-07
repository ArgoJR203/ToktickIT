# Lab 4 Test Plan and Traceability Matrix

## 1. Test Strategy

The testing strategy for Lab 4 enforces **Specification-Driven Development (Spec DD)** and **Test-Driven Development (TDD)** principles. Comprehensive automated test coverage is established across all required categories per Handout §10: pure domain units, backend REST API integration, frontend UI components, UI style, responsive layouts, accessibility, migration/rollback, performance-smoke, and end-to-end workflows.

### 1.1 Pure Domain Unit Tests (`server/tests/lab-04/`)
- `UNIT-01`: **Actions Taken Content & Follow-up Validator**: Validates description/result length boundaries (1–2000 chars) and enforces that `followUpNote` is mandatory if and only if `followUpRequired === true` (`BR-04`, `BR-05`).
- `UNIT-02`: **Optimistic Concurrency Version Validator**: Evaluates version match logic (`submittedVersion === currentVersion`), verifying that mismatched versions trigger stale-update rejections (`BR-14`).
- `UNIT-03`: **Lifecycle Status Transition State Machine**: Validates all permitted transitions across the 8-status universe (including `CLOSED -> REOPENED`) and verifies that unauthorized jumps are rejected (`BR-10`, `BR-11`).
- `UNIT-04`: **Dashboard Operational Metrics Calculator**: Verifies pure mathematical aggregation algorithms (unassigned filter, assigned to caller, status counts, priority grouping) (`BR-16`, `BR-18`).
- `UNIT-05`: **Inactive Assignee Validator**: Verifies that assignee must be an active user with role `IT_STAFF` or `ADMINISTRATOR` (`BR-07`, `AC-15`).

### 1.2 Actions Taken Backend API Tests (`server/tests/lab-04/actions-taken.api.test.ts`)
- `API-01`: Retrieve Actions Taken list for owned ticket by Requester (`200 OK`, `BR-09`).
- `API-02`: **Requester non-owned ticket authorization protection**: Requester querying Actions Taken for another user's ticket receives `403 Forbidden` (`code: "FORBIDDEN"`), preserving 100% backward-compatibility with Lab 2/3 ticket/attachment isolation tests (`BR-21`).
- `API-03`: Create valid Action Taken by IT Staff with auto-populated performer and approved assignee (`201 Created`) *(Handout §10 exact, AC-01)*.
- `API-04`: Multi-staff collaboration: Staff Member B logs Action Taken on a ticket owned by Staff Member A (`BR-02`, `AC-04`).
- `API-05`: Content validation: Empty description or result returns `400 Bad Request` (`INVALID_INPUT`, `BR-04`).
- `API-06`: Conditional follow-up validation: `followUpRequired = true` without `followUpNote` returns `400 Bad Request` (`INVALID_INPUT`, `BR-05`, `AC-05`).
- `API-07`: Role restriction: Requester attempting `POST /api/tickets/:id/actions-taken` returns `403 Forbidden` (`FORBIDDEN_ROLE`, `BR-09`, `AC-06`).
- `API-08`: Update Action Taken: IT Staff updates description, result, follow-up, or status via `PATCH` with atomic OCC check (`200 OK`, `FR-08`).
- `API-18`: Performer spoofing protection: Sending a forged `performedById` in request payload is ignored; server authoritatively assigns session user ID (`BR-03`).
- `API-19`: Content length boundaries: Description and result with exactly 2000 characters succeed (`201 Created`); 2001 characters rejected (`400 Bad Request`).
- `API-20`: Future action planning: Submitting future `actionDateTime` is accepted for planning work (`201 Created`, `BR-04`).
- `API-21`: Inactive assignee rejection: Assigning an inactive staff account returns `400 Bad Request` (`code: "INACTIVE_ASSIGNEE"`, `BR-07`, `AC-15`).

### 1.3 Ticket Workflow & Optimistic Concurrency API Tests (`server/tests/lab-04/ticket-workflow.api.test.ts`)
- `API-09`: Valid status transition: IT Staff advances status from `OPEN` to `IN_PROGRESS` with incremented version (`200 OK`, `BR-11`).
- `API-10`: Invalid status jump rejection: Transitioning from `NEW` directly to `RESOLVED` returns `400 Bad Request` (`INVALID_TRANSITION`, `BR-11`, `AC-07`).
- `API-11`: Atomic optimistic concurrency collision: Submitting status update with obsolete `version` returns `409 Conflict` (`STALE_UPDATE`) and current ticket state (`BR-14`, `AC-08`).
- `API-12`: Mandatory resolution summary: Advancing to `RESOLVED` or `CLOSED` without resolution summary returns `400 Bad Request` (`code: "MISSING_RESOLUTION_SUMMARY"`, `BR-13`, `AC-09`).
- `API-13`: Requester advisory resolution indication: `POST /api/tickets/:id/resolve-indication` sets `resolutionIndicated = true` and logs public comment without changing ticket status (`BR-12`, `AC-03`).
- `API-22`: Action completion resolution gate: Advancing to `RESOLVED` while an Action Taken under the ticket is in `PENDING`, `IN_PROGRESS`, or has `followUpRequired=true` with `followUpDone=false` returns `400 Bad Request` (`code: "INCOMPLETE_ACTIONS_TAKEN"`, `BR-20`, `AC-16`).

### 1.4 Role Dashboard API Tests (`requester-dashboard.api.test.ts`, `staff-dashboard.api.test.ts`, `tickets.api.test.ts`)
- `API-14`: Requester dashboard: Returns aggregated metrics (`totalOpen`, `waitingForRequester`, `resolvedCount`, `closedCount`) and recent tickets strictly owned by the caller (`200 OK`) *(Handout §10 exact, AC-02)*.
- `API-15`: IT Staff dashboard: Returns operational metrics (unassigned count, assigned to caller, status counts, priority counts) (`200 OK`, `AC-10`).
- `API-16`: Administrator dashboard extension: When requested by Admin, payload includes `adminStats` computed dynamically via `COUNT(*)` DB queries (e.g. baseline seed: total users 11, active 9, role distribution: 6 requesters, 4 staff, 1 admin; correctly reflects dynamic user additions/deactivations) (`200 OK`, `AC-11`, `BR-17`).
- `API-17`: Cross-role protection: IT Staff accessing requester dashboard or Requester accessing staff dashboard returns `403 Forbidden` (`BR-15`, `BR-16`).
- `API-23`: Status group ticket filtering: `GET /api/tickets?statusGroup=open` returns active tickets (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`); `GET /api/tickets?statusGroup=resolved` returns `RESOLVED` and `CLOSED` tickets for requester dashboard drill-down (`200 OK`, `AC-12`, `FR-18`).

### 1.5 Client UI Component Tests (`client/tests/lab-04/`)
- `ActionsTaken.test.tsx`:
  - `UI-01`: Renders Actions Taken table with timestamps, performers, assignees, and results (`AC-01`).
  - `UI-02`: Modal validation: follow-up note input appears conditionally and enforces required validation when checked (`AC-05`, `BR-05`).
  - `UI-03`: Requester view hides "+ Log Action Taken" and edit buttons (read-only mode) (`AC-06`, `BR-09`).
- `TicketWorkflow.test.tsx`:
  - `UI-04`: Status dropdown displays only permitted next statuses based on state machine (`BR-11`).
  - `UI-05`: Renders 409 conflict alert banner with "Reload Latest Ticket Data" button when stale update occurs (`AC-08`, `BR-14`).
  - `UI-06`: Renders advisory resolution notice banner when requester has signaled resolution (`BR-12`).
- `RequesterDashboard.test.tsx`:
  - `UI-07`: Displays 4 metric cards (`totalOpen`, `waitingForRequester`, etc.) with correct counts and drill-down links (`AC-02`, `AC-12`).
- `StaffDashboard.test.tsx`:
  - `UI-08`: Displays 5 operational metric cards (`unassignedCount`, `assignedToMeCount`, etc.), recent queue, quick action buttons, and Admin Statistics card (`AC-10`, `AC-11`).
- `FormProtection.test.tsx`:
  - `UI-09`: Double-click submit button debounce disables button during in-flight request, preventing duplicate dispatch (`AC-13`, `FR-19`).

### 1.6 UI Style, Responsive, Accessibility & Non-Functional Tests
- `STYLE-01`: **Design System Token Adherence**: Verifies all rendered dashboard cards, status badges, buttons, and headers use exact Zen Green CSS variables (`--color-primary-green`, etc.) without hardcoded ad-hoc styles.
- `RESP-01`: **Responsive Viewport Breakdown**: Verifies rendering at Mobile (375px), Tablet (768px), and Desktop (1280px) with `min-height: 44px` on touch targets and zero horizontal scrollbar (`overflow-x: hidden`).
- `A11Y-01`: **WCAG AA Accessibility Audit**: Verifies high-contrast focus rings (`2px solid #0B7A46`), `aria-current="page"` on navigation tabs, screen-reader labels on metric cards, and dual visual indicators for status/priority cues.
- `MIGR-01`: **Migration & Rollback Regression**: Validates that running Prisma migrations preserves 100% of legacy tickets, comments, and notes with zero data loss, and verifies clean rollback behavior.
- `PERF-01`: **Dashboard Performance Smoke Test**: Asserts that `/api/staff/dashboard` and `/api/requester/dashboard` complete in under 200ms using indexed SQL aggregations.

### 1.7 Playwright End-to-End (E2E) Suites (`e2e/lab-04/`)
- `actions-taken-flow.spec.ts` (**E2E-01**): IT Staff logs in, opens ticket, creates Action Taken with approved assignee and follow-up note; edits action; logs out and logs in as Requester to verify read-only view (`AC-01`, `AC-04`, `AC-06`).
- `ticket-resolution.spec.ts` (**E2E-02**): Requester clicks "Problem Appears Resolved"; verifies status remains unchanged; IT Staff logs in, attempts to resolve with pending actions (blocked), completes all actions, enters resolution summary, and formally resolves ticket *(Handout §10 exact, AC-03, AC-16)*.
- `dashboards.spec.ts` (**E2E-03**): Requester and IT Staff dashboards load with accurate counts; clicking metric cards navigates to filtered queues; Admin sees user account metrics (`AC-02`, `AC-10`, `AC-11`, `AC-12`).
- `regression-smoke.spec.ts` (**E2E-04**): Full regression flow validating authentication, password changes, ticket attachments, public comments, internal notes, and admin user management (`AC-14`).
- `concurrency-conflict.spec.ts` (**E2E-05**): Two browser contexts open the same ticket; Context A updates status; Context B submits update; Context B receives 409 conflict banner and clicks "Reload Latest Ticket Data" to recover gracefully (`AC-08`).

---

## 2. Planned Tests Traceability Matrix

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Initial Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :---: |
| **UNIT-01** | Unit | BR-04, BR-05 | Actions Taken content & follow-up validation | Enforces 1–2000 chars; requires follow-up note only if followUpRequired is true | `server/tests/lab-04/actions-taken-validator.test.ts` | ✅ Passed |
| **UNIT-02** | Unit | BR-14, AC-08 | Optimistic concurrency version check | Rejects mismatched version; accepts matching version | `server/tests/lab-04/concurrency-validator.test.ts` | ✅ Passed |
| **UNIT-03** | Unit | BR-10, BR-11 | Status transition state machine logic | Allows legal transitions (including `CLOSED -> REOPENED`); blocks illegal skips | `server/tests/lab-04/workflow-transition-validator.test.ts` | ✅ Passed |
| **UNIT-04** | Unit | BR-16, BR-18 | Operational dashboard calculation helpers | Accurately aggregates counts by status, priority, and ownership | `server/tests/lab-04/dashboard-calculator.test.ts` | ⏳ Pending |
| **UNIT-05** | Unit | BR-07, AC-15 | Assignee active status validator | Rejects inactive users or requesters as assignees | `server/tests/lab-04/assignee-validator.test.ts` | ✅ Passed |
| **API-01** | API | BR-09 | Requester views Actions Taken on owned ticket | Returns chronological actions list (`200 OK`) | `server/tests/lab-04/actions-taken.api.test.ts` | ✅ Passed |
| **API-02** | API | BR-21 | Requester non-owned ticket isolation | Returns `403 Forbidden` on non-owned ticket (preserves Lab 2/3 contract) | `server/tests/lab-04/actions-taken.api.test.ts` | ✅ Passed |
| **API-03** | API | AC-01, FR-02 | Create valid Action Taken by IT Staff *(Handout §10 exact)* | Created under ticket with auto-assigned performer & approved assignee (`201 Created`) | `server/tests/lab-04/actions-taken.api.test.ts` | ✅ Passed |
| **API-04** | API | BR-02, AC-04 | Multi-staff collaboration on Action Taken | Staff B logs action on ticket owned by Staff A (`201 Created`) | `server/tests/lab-04/actions-taken.api.test.ts` | ✅ Passed |
| **API-05** | API | BR-04 | Actions Taken description/result validation | Rejects empty description or result with `400 Bad Request` | `server/tests/lab-04/actions-taken.api.test.ts` | ✅ Passed |
| **API-06** | API | BR-05, AC-05 | Conditional follow-up note validation | Rejects missing follow-up note when followUpRequired is true (`400 Bad Request`) | `server/tests/lab-04/actions-taken.api.test.ts` | ✅ Passed |
| **API-07** | API | BR-09, AC-06 | Requester forbidden from creating Action Taken | Write attempt rejected with `403 Forbidden` (`FORBIDDEN_ROLE`) | `server/tests/lab-04/actions-taken.api.test.ts` | ✅ Passed |
| **API-08** | API | FR-08 | IT Staff updates existing Action Taken | Updates description, result, status with atomic OCC check (`200 OK`) | `server/tests/lab-04/actions-taken.api.test.ts` | ✅ Passed |
| **API-09** | API | BR-11 | Permitted ticket status transition | Updates status from `OPEN` to `IN_PROGRESS`, increments version (`200 OK`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | ✅ Passed |
| **API-10** | API | BR-11, AC-07 | Illegal status transition rejection | Rejects jump from `NEW` to `RESOLVED` with `400 Bad Request` | `server/tests/lab-04/ticket-workflow.api.test.ts` | ✅ Passed |
| **API-11** | API | BR-14, AC-08 | Optimistic concurrency conflict detection | Atomic CAS rejects write with outdated version returning `409 Conflict` (`STALE_UPDATE`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | ✅ Passed |
| **API-12** | API | BR-13, AC-09 | Mandatory resolution summary on resolution | Requires min 5 chars resolution summary when setting `RESOLVED` (`400 Bad Request`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | ✅ Passed |
| **API-13** | API | BR-12, AC-03 | Requester advisory resolution indication | Flags resolutionIndicated, appends comment, status unchanged (`200 OK`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | ✅ Passed |
| **API-14** | API | AC-02, BR-15 | Requester dashboard metrics isolation *(Handout §10 exact)* | Returns owned aggregate metrics (totalOpen, waiting, resolved, closed) and recent tickets (`200 OK`) | `server/tests/lab-04/requester-dashboard.api.test.ts` | ⏳ Pending |
| **API-15** | API | AC-10, BR-16 | IT Staff operational dashboard metrics | Returns unassigned, assigned to me, status, priority counts (`200 OK`) | `server/tests/lab-04/staff-dashboard.api.test.ts` | ⏳ Pending |
| **API-16** | API | AC-11, BR-17 | Administrator dashboard user account metrics | Returns staff metrics plus dynamic adminStats computed from DB (`200 OK`) | `server/tests/lab-04/staff-dashboard.api.test.ts` | ⏳ Pending |
| **API-17** | API | BR-15, BR-16 | Dashboard cross-role authorization restriction | Requesters blocked from staff dashboard; staff blocked from requester dashboard (`403`) | `server/tests/lab-04/staff-dashboard.api.test.ts` | ⏳ Pending |
| **API-18** | API | BR-03 | Performer spoofing protection | Replaces client-sent `performedById` with authenticated user (`201 Created`) | `server/tests/lab-04/actions-taken.api.test.ts` | ✅ Passed |
| **API-19** | API | BR-04 | Content length boundary testing | 2000 chars accepted (`201 Created`); 2001 chars rejected (`400 Bad Request`) | `server/tests/lab-04/actions-taken.api.test.ts` | ✅ Passed |
| **API-20** | API | BR-04 | Planned future action date acceptance | Accepts future datetime for planned work scheduling (`201 Created`) | `server/tests/lab-04/actions-taken.api.test.ts` | ✅ Passed |
| **API-21** | API | BR-07, AC-15 | Inactive assignee rejection | Assigning inactive staff user returns `400 Bad Request` (`INACTIVE_ASSIGNEE`) | `server/tests/lab-04/actions-taken.api.test.ts` | ✅ Passed |
| **API-22** | API | BR-20, AC-16 | Incomplete Actions Taken blocks resolution | Rejects resolution if actions are PENDING/IN_PROGRESS or followUpRequired=true with followUpDone=false (`400 Bad Request`) | `server/tests/lab-04/ticket-workflow.api.test.ts` | ✅ Passed |
| **API-23** | API | AC-12, FR-18 | Status group ticket filtering | Returns tickets filtered by statusGroup=open\|resolved for drill-downs (`200 OK`) | `server/tests/lab-04/tickets.api.test.ts` | ⏳ Pending |
| **UI-01** | UI | AC-01, FR-02 | Actions Taken table rendering | Renders chronological actions with datetime, performer, assignee, result | `client/tests/lab-04/ActionsTaken.test.tsx` | ✅ Passed |
| **UI-02** | UI | AC-05, BR-05 | Actions Taken modal conditional follow-up | Follow-up note input displays and validates dynamically upon toggle | `client/tests/lab-04/ActionsTaken.test.tsx` | ✅ Passed |
| **UI-03** | UI | AC-06, BR-09 | Actions Taken requester read-only mode | Hides create and edit buttons when viewed by ticket Requester | `client/tests/lab-04/ActionsTaken.test.tsx` | ✅ Passed |
| **UI-04** | UI | BR-11 | Ticket Detail dynamic status dropdown | Exposes strictly permitted next statuses matching transition matrix | `client/tests/lab-04/TicketWorkflow.test.tsx` | ✅ Passed |
| **UI-05** | UI | AC-08, BR-14 | Stale-update 409 conflict alert banner | Displays conflict notice and "Reload Latest Ticket Data" action button | `client/tests/lab-04/TicketWorkflow.test.tsx` | ✅ Passed |
| **UI-06** | UI | BR-12 | Advisory resolution indication banner | Renders warning notice informing staff of requester's resolution signal | `client/tests/lab-04/TicketWorkflow.test.tsx` | ✅ Passed |
| **UI-07** | UI | AC-02, AC-12 | Requester Dashboard cards and drill-downs | Displays 4 metric cards, recent tickets, routes to filtered `/tickets` | `client/tests/lab-04/RequesterDashboard.test.tsx` | ⏳ Pending |
| **UI-08** | UI | AC-10, AC-11 | Staff Dashboard operational cards & admin stats | Displays 5 metric cards, recent queue, quick actions, admin user stats | `client/tests/lab-04/StaffDashboard.test.tsx` | ⏳ Pending |
| **UI-09** | UI | AC-13, FR-19 | Submit button debouncing | Disables submit button during in-flight request, preventing duplicate dispatch | `client/tests/lab-04/FormProtection.test.tsx` | ⏳ Pending |
| **STYLE-01**| Style| Zen Green | Design token adherence | Verifies Zen Green CSS variable tokens across all Lab 4 components | `client/tests/lab-04/StyleSystem.test.tsx` | ⏳ Pending |
| **RESP-01** | Resp | Responsiveness | Responsive viewport layout verification | Mobile (375px) cards & touch targets >= 44px, Tablet (768px), Desktop (1280px) | `client/tests/lab-04/ResponsiveLayout.test.tsx` | ⏳ Pending |
| **A11Y-01** | A11y | Accessibility | WCAG AA compliance audit | High-contrast focus rings (`2px solid #0B7A46`), aria labels, dual visual cues | `client/tests/lab-04/Accessibility.test.tsx` | ⏳ Pending |
| **MIGR-01** | Migr | BR-19 | Database migration & zero data loss | Validates legacy data intactness and rollback script cleanliness | `server/tests/lab-04/migration-regression.test.ts` | ⏳ Pending |
| **PERF-01** | Perf | Performance | Dashboard API response time smoke test | Asserts dashboard queries execute under 200ms with indexed relations | `server/tests/lab-04/dashboard-perf.test.ts` | ⏳ Pending |
| **E2E-01** | E2E | AC-01, AC-04 | End-to-end Actions Taken lifecycle | IT Staff logs action, edits action, Requester views read-only | `e2e/lab-04/actions-taken-flow.spec.ts` | ⏳ Pending |
| **E2E-02** | E2E | AC-03, BR-12 | **Resolution gate workflow** *(Handout §10 exact)* | Requester indicates resolved; status remains unchanged; staff formally resolves | `e2e/lab-04/ticket-resolution.spec.ts` | ⏳ Pending |
| **E2E-03** | E2E | AC-02, AC-10 | Dashboards metrics and drill-down navigation | Verifies Requester and Staff dashboard counts and filter navigations | `e2e/lab-04/dashboards.spec.ts` | ⏳ Pending |
| **E2E-04** | E2E | AC-14, BR-19 | Full regression verification across Labs 1–3 | End-to-end check of auth, tickets, attachments, comments, notes, admin users | `e2e/lab-04/regression-smoke.spec.ts` | ⏳ Pending |
| **E2E-05** | E2E | AC-08, BR-14 | Concurrency collision and UI recovery flow | Context A updates status, Context B updates same ticket, receives 409, reloads | `e2e/lab-04/concurrency-conflict.spec.ts` | ⏳ Pending |

---

## 3. Acceptance Criteria to Test Mapping Matrix

| Acceptance Criterion | Description Summary | Mapping Automated Tests |
| :--- | :--- | :--- |
| **AC-01** | Create valid Action Taken with creator and approved assignee | `API-03`, `UI-01`, `E2E-01` |
| **AC-02** | Requester dashboard metrics scoped to owned tickets | `API-14`, `UI-07`, `E2E-03` |
| **AC-03** | Requester advisory resolution indication does not change status | `API-13`, `UI-06`, `E2E-02` |
| **AC-04** | Multi-staff collaboration on Actions Taken under one ticket | `API-04`, `E2E-01` |
| **AC-05** | Follow-up note strictly mandatory when followUpRequired is true | `UNIT-01`, `API-06`, `UI-02` |
| **AC-06** | Requester cannot create or edit Actions Taken (read-only view) | `API-07`, `UI-03`, `E2E-01` |
| **AC-07** | Invalid status jump rejected by backend state machine | `UNIT-03`, `API-10` |
| **AC-08** | Stale update rejected with 409 Conflict via atomic OCC | `UNIT-02`, `API-11`, `UI-05`, `E2E-05` |
| **AC-09** | Valid ticket resolution requires resolution summary and completed actions | `API-12`, `E2E-02` |
| **AC-10** | IT Staff dashboard operational counts (unassigned, assigned to me, etc.) | `UNIT-04`, `API-15`, `UI-08`, `E2E-03` |
| **AC-11** | Administrator dashboard includes user account summary metrics | `API-16`, `UI-08`, `E2E-03` |
| **AC-12** | Clicking metric cards navigates to filtered ticket queue | `API-23`, `UI-07`, `UI-08`, `E2E-03` |
| **AC-13** | Rapid double-click button submit debouncing prevents duplicate dispatch | `UI-09` |
| **AC-14** | Full regression verification across all Labs 1–3 capabilities | `MIGR-01`, `E2E-04` |
| **AC-15** | Inactive staff account rejected as Action Taken assignee | `UNIT-05`, `API-21` |
| **AC-16** | Ticket resolution blocked while Actions Taken remain pending/incomplete | `API-22`, `E2E-02` |
