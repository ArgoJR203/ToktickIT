# Lab 3 Test Plan and Traceability Matrix

## 1. Test Strategy

The testing strategy for Lab 3 adheres strictly to **Spec-Driven Development (Spec DD)** and **Test-Driven Development (TDD)** principles. Comprehensive automated test coverage is established across eight distinct layers before feature implementation begins:

1. **Unit Tests** (`server/tests/lab-03/`):
   - Pure domain utility testing executed in isolation without database latency:
     - `UNIT-01`: Password Complexity Validator (`password-validator.test.ts`)
     - `UNIT-02`: Status Transition Matrix Validator (`status-transition-validator.test.ts`)
     - `UNIT-03`: Server-Side Token Revocation Store (`token-revocation.test.ts`)
     - `UNIT-04`: Administrator Safety Constraints Validator (`admin-safety-validator.test.ts`)
2. **Authentication & Session Tests** (`auth.api.test.ts`):
   - Valid credentials login, JWT token issuance, user profile & role returned.
   - Safe error handling for incorrect credentials and deactivated accounts (`isActive = false`) without leaking account status.
   - Password complexity boundary validations (min 8 chars, uppercase, lowercase, number/symbol).
   - First-login mandatory password change (`mustChangePassword = true`).
   - Logout token invalidation via server-side Token Revocation Store (subsequent calls return `401 Unauthorized`).
3. **Server-Side Authorization & Regression Tests** (`authorization.api.test.ts`):
   - Role boundaries: Requester blocked from staff queue and admin routes (`403 Forbidden`).
   - IT Staff blocked from user administration routes (`403 Forbidden`).
   - Ticket and attachment ownership isolation: Requester cannot query or modify tickets owned by another user (`403`/`404`).
   - Requester regression: Lab 2 ticket creation, retrieval, and attachment operations succeed using authenticated session context.
4. **Comments & Notes Confidentiality Tests** (`comments-notes.api.test.ts`):
   - Public Comments readable by Requester, IT Staff, and Admin; append-only enforcement.
   - **API-08**: Requester requesting Internal Notes returns `403 Forbidden` without exposing note data *(Handout §10 exact)*.
   - IT Staff and Admin can author and inspect private Internal Notes.
   - Whitespace-only comment/note validation.
5. **IT Staff Queue & Operational Workflow Tests** (`staff-queue.api.test.ts`, `staff-ticket-detail.api.test.ts`):
   - Queue query testing: keyword search, category, priority, status, ownership filters, sorting, and pagination.
   - IT Priority initialization (copies Requested Priority upon creation) and subsequent updates by staff.
   - Ticket ownership claiming and reassignment.
   - Permitted status transition matrix enforcement (valid progressions allowed; invalid progressions rejected with `400 Bad Request`).
   - Resolution summary capture upon ticket resolution.
   - Requester "Problem Appears Resolved" indication handling.
6. **Administrator Safety & User Management Tests** (`users-admin.api.test.ts`):
   - User listing with search and role filter.
   - User creation with 1 role and initial password (`mustChangePassword = true`).
   - Rejection of duplicate email addresses (`409 Conflict`).
   - User editing (name, email, role, activation state).
   - Resetting initial passwords.
   - **Non-Admin Forbidden Access**: Non-administrators attempting admin endpoints return `403 Forbidden`.
   - **Self-Deactivation Protection**: Administrator attempting to deactivate own account returns `400 Bad Request`.
   - **Last Active Admin Protection**: Attempting to deactivate or demote the sole active Administrator returns `400 Bad Request`.
7. **UI Component & Style Tests** (`client/tests/lab-03/`):
   - `Login.test.tsx`: Form rendering, input validation, busy state, safe error banners.
   - `ChangePassword.test.tsx`: Mandatory password change checklist, matching confirmations, progress states.
   - `StaffTicketQueue.test.tsx`: Queue data table, search input, filter controls, pagination, priority/status badges.
   - `StaffTicketDetail.test.tsx`: Operational controls grid, ownership claim, status dropdown, resolution summary, visual warning on Internal Notes.
   - `UserManagement.test.tsx`: User table, create/edit modal, active toggle, safety warnings.
8. **End-to-End (E2E) Playwright Tests** (`e2e/lab-03/`):
   - `authentication.spec.ts`: Login, first-login mandatory password change, role navigation, logout.
   - `staff-ticket-flow.spec.ts`: Staff queue navigation, filter by priority, claim ticket, update IT priority, advance status, post internal note.
   - `user-administration.spec.ts`: Admin user creation with initial password, edit user, attempt self-deactivation (verify error alert), reset password.

---

## 2. Planned Tests Traceability Matrix

*(Test IDs aligned directly with Handout §10 and expanded to cover all requirements, unit domains, and edge boundaries)*

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UNIT-01** | Unit | BR-07 | Password complexity domain rules | Validates min 8 chars, uppercase, lowercase, number/symbol; rejects invalid strings | `server/tests/lab-03/password-validator.test.ts` | ✅ Passed |
| **UNIT-02** | Unit | BR-14, BR-17 | Status transition matrix logic | Validates allowed progressions (e.g. `NEW -> OPEN`); blocks disallowed skips (e.g. `NEW -> RESOLVED`) | `server/tests/lab-03/status-transition-validator.test.ts` | ✅ Passed |
| **UNIT-03** | Unit | BR-09, AC-06 | Token revocation store domain | Adds token to revocation set, confirms `isRevoked(token) === true`, verifies TTL expiration | `server/tests/lab-03/token-revocation.test.ts` | ✅ Passed |
| **UNIT-04** | Unit | BR-21, BR-22 | Admin safety constraints validator | Validates self-deactivation rejection and last active admin preservation rules | `server/tests/lab-03/admin-safety-validator.test.ts` | ✅ Passed |
| **API-01** | API | AC-01, FR-01 | Valid user login *(Handout §10 exact)* | Authenticated response with JWT, safe user data, and role (`200 OK`) | `server/tests/lab-03/auth.api.test.ts` | ✅ Passed |
| **API-02** | API | AC-05, BR-01 | Inactive account login rejection | Denied access with safe error without leaking account existence (`401 Unauthorized`) | `server/tests/lab-03/auth.api.test.ts` | ✅ Passed |
| **API-03** | API | BR-07 | Password boundary: length < 8 chars | Rejects password shorter than 8 characters (`400 Bad Request`) | `server/tests/lab-03/auth.api.test.ts` | ✅ Passed |
| **API-04** | API | BR-07 | Password boundary: missing uppercase/number | Rejects password missing uppercase or numeric/special character (`400 Bad Request`) | `server/tests/lab-03/auth.api.test.ts` | ✅ Passed |
| **API-05** | API | AC-02, BR-02 | Mandatory password change at first login | Saves valid new password and clears `mustChangePassword` (`200 OK`) | `server/tests/lab-03/auth.api.test.ts` | ✅ Passed |
| **API-06** | API | AC-06, BR-09 | User logout & token revocation | Adds token to revocation store; subsequent requests using revoked token return `401 Unauthorized` (`TOKEN_REVOKED`) | `server/tests/lab-03/auth.api.test.ts` | ✅ Passed |
| **API-07** | API | AC-02, BR-02 | Functional endpoints blocked when password change required | Gated endpoint returns `403 Forbidden` (`PASSWORD_CHANGE_REQUIRED`) | `server/tests/lab-03/authorization.api.test.ts` | ✅ Passed |
| **API-08** | API | AC-04, BR-04 | **Requester requests Internal Notes** | Forbidden; no note data returned (`403 Forbidden`) *(Handout §10 exact)* | `server/tests/lab-03/comments-notes.api.test.ts` | ✅ Passed |
| **API-09** | API | AC-03, BR-03 | Requester ownership isolation | Backend applies authenticated identity; ignores client-supplied ID; rejects cross-user access (`403`/`404`) | `server/tests/lab-03/authorization.api.test.ts` | ✅ Passed |
| **API-10** | API | FR-08, BR-24 | Lab 2 Requester regression under auth | Authenticated requester can create ticket, retrieve owned tickets, and upload attachments | `server/tests/lab-03/authorization.api.test.ts` | ✅ Passed |
| **API-11** | API | AC-11, FR-09 | Public Comments creation and retrieval | Permitted for Requester (owner) and Staff; append-only feed (`201 Created`) | `server/tests/lab-03/comments-notes.api.test.ts` | ✅ Passed |
| **API-12** | API | BR-18 | Whitespace-only comment/note rejection | Rejects empty or whitespace-only content with `400 Bad Request` | `server/tests/lab-03/comments-notes.api.test.ts` | ✅ Passed |
| **API-13** | API | AC-07, FR-11 | IT Staff Ticket Queue retrieval | Returns all system tickets with pagination metadata (`200 OK`) | `server/tests/lab-03/staff-queue.api.test.ts` | ✅ Passed |
| **API-14** | API | AC-07, FR-12 | Queue search & multi-field filtering | Filters by keyword/category/status/priority/owner (`200 OK`) | `server/tests/lab-03/staff-queue.api.test.ts` | ✅ Passed |
| **API-15** | API | BR-12 | IT Priority initialization & update | Ticket creation copies Requested Priority; IT Staff can update IT Priority independently (`200 OK`) | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | [Planned] |
| **API-16** | API | AC-08, FR-13 | Claim and reassign ticket ownership | IT Staff can assign ticket to self or active staff member (`200 OK`) | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | [Planned] |
| **API-17** | API | AC-10, BR-14 | Permitted status transition & resolution summary | Valid status transition succeeds and stores optional `resolutionSummary` (`200 OK`) | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | [Planned] |
| **API-18** | API | AC-10, BR-14 | Invalid status transition rejected | Invalid transition rejected with `400 Bad Request` (`INVALID_TRANSITION`) | `server/tests/lab-03/staff-ticket-detail.api.test.ts` | [Planned] |
| **API-19** | API | AC-12, BR-05 | Requester "Problem Appears Resolved" signal | Records resolution indication without prematurely setting `RESOLVED` or `CLOSED` (`200 OK`) | `server/tests/lab-03/comments-notes.api.test.ts` | ✅ Passed |
| **API-20** | API | AC-13, FR-18 | Administrator creates user with initial password | User created with role, initial password, and `mustChangePassword = true` (`201 Created`) | `server/tests/lab-03/users-admin.api.test.ts` | [Planned] |
| **API-21** | API | BR-20 | Duplicate email rejection | Rejects existing email with `409 Conflict` (`DUPLICATE_EMAIL`) | `server/tests/lab-03/users-admin.api.test.ts` | [Planned] |
| **API-22** | API | AC-14, BR-21 | Prevent Administrator self-deactivation | Admin attempting to deactivate own account returns `400 Bad Request` | `server/tests/lab-03/users-admin.api.test.ts` | [Planned] |
| **API-23** | API | AC-15, BR-22 | Prevent removing or deactivating last Admin | System rejects deactivating or demoting the last active Administrator (`400 Bad Request`) | `server/tests/lab-03/users-admin.api.test.ts` | [Planned] |
| **API-24** | API | AC-16, FR-20 | Administrator sets new initial password | Sets temporary password and marks `mustChangePassword = true` (`200 OK`) | `server/tests/lab-03/users-admin.api.test.ts` | [Planned] |
| **API-25** | API | FR-07 | Forbidden access for non-Administrators | Requester and IT Staff attempting Admin endpoints return `403 Forbidden` | `server/tests/lab-03/users-admin.api.test.ts` | [Planned] |
| **UI-01** | UI | AC-01, FR-01 | Login screen form, validation, and loading | Renders email/password, validates inputs, shows loading spinner on submit | `client/tests/lab-03/Login.test.tsx` | ✅ Passed |
| **UI-02** | UI | AC-02, FR-03 | Mandatory Change Password checklist | Interactive password complexity checkmarks; blocks submission until valid | `client/tests/lab-03/ChangePassword.test.tsx` | ✅ Passed |
| **UI-03** | UI | AC-07, FR-11 | Staff Ticket Queue table and filters | Renders queue table, status/priority badges, search bar, pagination | `client/tests/lab-03/StaffTicketQueue.test.tsx` | ✅ Passed |
| **UI-04** | UI | AC-08, AC-10 | Staff Ticket Detail actions & resolution summary | Claim to me, reassign select, IT Priority select, status dropdown, resolution summary input | `client/tests/lab-03/StaffTicketDetail.test.tsx` | [Planned] |
| **UI-05** | UI | AC-04, AC-11 | Comments and Internal Notes tabs | Public comments feed and distinct amber-accented internal notes section with warning banner | `client/tests/lab-03/StaffTicketDetail.test.tsx` | [Planned] |
| **UI-06** | UI | AC-13, AC-14 | Admin User Management interface | User list, "+ Create User" modal, edit user, self-deactivation safety alert | `client/tests/lab-03/UserManagement.test.tsx` | [Planned] |
| **E2E-01** | E2E | AC-01, AC-06 | Authentication & role navigation flow | Login as Requester / Staff / Admin, verify navigation tabs, logout | `e2e/lab-03/authentication.spec.ts` | [Planned] |
| **E2E-02** | E2E | AC-02, BR-02 | **Initial password login and change** | Login with initial password, normal app opens only after valid change *(Handout §10 exact)* | `e2e/lab-03/authentication.spec.ts` | [Planned] |
| **E2E-03** | E2E | AC-07, AC-08, AC-10 | Staff ticket queue & lifecycle workflow | Open queue, claim ticket, update IT Priority, advance status, post note | `e2e/lab-03/staff-ticket-flow.spec.ts` | [Planned] |
| **E2E-04** | E2E | AC-13, AC-14, AC-15 | Administrator user lifecycle & safety | Create user, edit profile, test self-deactivation protection, reset password | `e2e/lab-03/user-administration.spec.ts` | [Planned] |

---

## 3. Acceptance-Criterion Traceability

| Acceptance Criterion | Covered By Test IDs | Layer & Verification Focus |
| :--- | :--- | :--- |
| **AC-01** (Valid login & user role) | UNIT-01, API-01, UI-01, E2E-01 | Password check, JWT issuance, response payload, UI dashboard entry |
| **AC-02** (Mandatory first password change) | UNIT-01, API-05, API-07, UI-02, E2E-02 | Password validation, route guard blocks normal views until valid password saved |
| **AC-03** (Requester ownership isolation) | API-09 | Backend ignores client-supplied IDs and prevents cross-requester leaks |
| **AC-04** (Internal Notes hidden from Requester) | API-08, UI-05 | `403 Forbidden` returned to Requesters; notes tab hidden in Requester UI |
| **AC-05** (Inactive account login rejection) | API-02, UI-01 | Safe error response without leaking password correctness |
| **AC-06** (Logout token invalidation) | UNIT-03, API-06, E2E-01 | Token registered in revocation store; subsequent calls return `401 Unauthorized` |
| **AC-07** (IT Staff Ticket Queue) | API-13, API-14, UI-03, E2E-03 | Shared queue retrieval with search, filters, pagination |
| **AC-08** (Claim & reassign ticket ownership) | API-16, UI-04, E2E-03 | Quick "Assign to Me" and reassignment dropdown |
| **AC-09** (IT Priority adjustment) | API-15, UI-04, E2E-03 | Initial copy from requested priority, independent update of IT Priority |
| **AC-10** (Status progression & transition rules) | UNIT-02, API-17, API-18, UI-04, E2E-03 | State machine validator allows valid, rejects invalid; resolution summary |
| **AC-11** (Public Comments feed) | API-11, UI-05 | Append-only public communication between Requester & Staff |
| **AC-12** (Problem Appears Resolved signal) | API-19 | Requester resolution indication without premature closure |
| **AC-13** (Admin user creation with initial password)| API-20, UI-06, E2E-04 | User created with role, initial password, mustChangePassword=true |
| **AC-14** (Admin self-deactivation protection) | UNIT-04, API-22, UI-06, E2E-04 | `400 Bad Request` and UI disable/warning on self-deactivate |
| **AC-15** (Last active Admin protection) | UNIT-04, API-23, UI-06, E2E-04 | `400 Bad Request` when attempting to deactivate last admin |
| **AC-16** (Admin sets new initial password) | UNIT-01, API-24, UI-06, E2E-04 | Temporary password sets `mustChangePassword = true` |

---

## 4. Responsive and Visual Checklist

- [ ] **Zen Green Design System Tokens**: Primary green (`#006B3C`), secondary accents (`#0B7A46`), pale green highlights (`#EAF6EF`), and quiet background (`#F5F7F6`).
- [ ] **Badge Styling Consistency**: Status badges, priority badges, and role badges consistently styled across all screens.
- [ ] **Internal Notes Distinction**: Internal Notes visually distinct using warm amber accents (`#FFF3E0`, lock icon) to prevent accidental public disclosure.
- [ ] **Desktop Viewport (≥992px)**: Full queue table with pagination; 4-column metadata grid; modal dialogs centered with backdrop.
- [ ] **Tablet Viewport (768-991px)**: Condensed queue table or responsive grid; form labels top-aligned.
- [ ] **Mobile Viewport (<768px)**: Stacked single-column controls; queue rendered as card list; minimum touch target height 44px; zero horizontal scrolling.
- [ ] **WCAG AA Compliance**: High-contrast focus outlines (`2px solid #0B7A46`); contrast ratio >= 4.5:1.
- [ ] **Visual Screenshot Artifacts**: Saved in `artifacts/lab-03/screenshots/` under `authentication/`, `staff-queue/`, `staff-ticket-detail/`, and `user-management/`.

---

## 5. Test Execution Commands

```bash
# Run server Lab 3 unit tests
npm --prefix server test -- tests/lab-03/password-validator.test.ts tests/lab-03/status-transition-validator.test.ts tests/lab-03/token-revocation.test.ts tests/lab-03/admin-safety-validator.test.ts

# Run server Lab 3 API & integration tests
npm --prefix server test -- tests/lab-03/

# Run client Lab 3 component & style tests
npm --prefix client test -- tests/lab-03/

# Run Playwright End-to-End tests
npx playwright test e2e/lab-03/
```

---

## 6. Test Tracking and Final Results

- **Total Planned Tests**: 39 (4 Unit + 25 API + 6 UI + 4 E2E)
- **Passed**: 22 (UNIT-01..04, API-01..14, API-19, UI-01..03)
- **Failed**: 0
- **Skipped**: 0
- **Pending**: 17 (API-15..18, API-20..25, UI-04..06, E2E-01..04)
- **Target Coverage**: 100% of Acceptance Criteria (AC-01 through AC-16), domain utilities, and REST endpoints.
