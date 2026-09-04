# Lab 2 Test Plan and Results

## 1. Test Strategy
The testing strategy for Lab 2 follows Spec-Driven Development (Spec DD) and Test-Driven Development (TDD) principles. Comprehensive test coverage is planned across six distinct testing levels before feature implementation begins:
1. **Unit Tests**: Test core domain utility functions (e.g. Ticket Number generator format, file type validator, data transformers).
2. **API & Integration Tests**: Test REST endpoints, validation logic, PostgreSQL query constraints, attachment file operations, error status responses, and data ownership rules (`x-requester-id` isolation).
3. **UI Component Tests**: Test component rendering, field-level error messages, form reset behavior, tab switching, and button loading states.
4. **UI Style Tests**: Verify CSS class assertions, Zen Green color token application, asterisk displays, font scales, and component state classes.
5. **Responsive Visual Tests**: Test viewport layouts at Desktop (>=992px), Tablet (768-991px), and Mobile (<768px), checking for label clipping, element overlap, touch target sizing, and card transformation.
6. **End-to-End (E2E) Tests**: Full user flow verification in Playwright simulating requester selection, ticket creation, My Tickets search/filter, and attachment soft removal.

---

## 2. Planned Tests

| Test ID | Type | Requirement / AC | What It Tests | Expected Result | Automated Test File | Final Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **UNIT-01** | Unit | BR-01 | Ticket Number format generation | Returns string matching `TKT-\d{4}-\d{6}` | `server/tests/lab-02/ticket-generator.test.ts` | [Passed] |
| **UNIT-02** | Unit | BR-12, BR-13 | Attachment validator | Accepts JPG/PNG/WEBP/PDF <= 5MB; rejects others | `server/tests/lab-02/attachment-validator.test.ts` | [Pending] |
| **API-01** | API | AC-01, FR-02 | Create valid ticket via API | Returns `201 Created` with official `ticketNumber` & status `NEW` | `server/tests/lab-02/create-ticket.api.test.ts` | [Passed] |
| **API-02** | API | AC-05, BR-08 | Create ticket invalid input | Returns `400 Bad Request` with field validation errors | `server/tests/lab-02/create-ticket.api.test.ts` | [Passed] |
| **API-03** | API | AC-03, BR-05 | My Tickets ownership isolation | Returns `200 OK` with non-empty tickets belonging ONLY to `x-requester-id` (§13.1 traceable) | `server/tests/lab-02/my-tickets.api.test.ts` | [Passed] |
| **API-04** | API | AC-04, FR-05, BR-07 | My Tickets search, filtering & secondary sorting | Filters by keyword/category/priority/status; deterministic secondary sort tie-breaker; non-empty assertions (§13.1 traceable) | `server/tests/lab-02/my-tickets.api.test.ts` | [Passed] |
| **API-05** | API | AC-03, BR-18 | Unauthorized ticket detail access | Returns `403 Forbidden` / `404 Not Found` when accessing other requester's ticket | `server/tests/lab-02/ticket-detail.api.test.ts` | [Pending] |
| **API-06** | API | AC-06, BR-14 | Attachment upload to ticket | Saves file to server storage & creates database record | `server/tests/lab-02/attachments.api.test.ts` | [Pending] |
| **API-07** | API | AC-08, BR-15 | Soft removal of attachment | Sets `isRemoved = true`, records reason/timestamp, blocks binary stream (`410`) | `server/tests/lab-02/attachments.api.test.ts` | [Pending] |
| **UI-01** | UI | AC-02 | Requester context redirect | Displays Dev Requester selection screen if no requester context set | `client/tests/lab-02/RequesterSelector.test.tsx` | [Passed] |
| **UI-02** | UI | AC-05 | Create Ticket validation display | Inline red validation error messages appear below invalid controls | `client/tests/lab-02/CreateTicket.test.tsx` | [Passed] |
| **UI-03** | UI | FR-12 | Submit busy & loading state | Submit button disabled and shows spinner during request processing | `client/tests/lab-02/CreateTicket.test.tsx` | [Passed] |
| **UI-04** | UI | AC-08 | Soft removal modal confirmation | Modal prompts for removal reason, disables confirm until valid reason entered | `client/tests/lab-02/AttachmentSection.test.tsx` | [Pending] |
| **UI-05** | UI Style | Zen Green UI | CSS classes and color tokens | Verified `#006B3C` primary header, `#EAF6EF` section emphasis, red asterisks | `client/tests/lab-02/MyTickets.test.tsx` | [Passed] |
| **E2E-01** | E2E | AC-01, AC-04 | Complete ticket submission & retrieval flow | Requester creates ticket, redirects to My Tickets, ticket appears in list | `e2e/lab-02/requester-ticket-flow.spec.ts` | [Pending] |
| **E2E-02** | E2E | AC-03 | Cross-requester context switching | Switch Requester A -> B; verified Requester A tickets disappear from view | `e2e/lab-02/requester-ticket-flow.spec.ts` | [Pending] |
| **E2E-03** | E2E | AC-08 | Attachment upload and soft removal flow | Upload PDF -> view active -> soft remove with reason -> verify "Removed" badge | `e2e/lab-02/requester-ticket-flow.spec.ts` | [Pending] |
| **API-08** | API | AC-07, BR-12, BR-13 | Attachment upload rejection (invalid type/oversize) | Returns `400 Bad Request` with `FILE_TOO_LARGE` or `INVALID_FILE_TYPE` error code | `server/tests/lab-02/attachments.api.test.ts` | [Pending] |
| **API-09** | API | AC-08, BR-16 | Download soft-removed attachment returns 410 | GET download endpoint after soft removal returns `410 Gone` | `server/tests/lab-02/attachments.api.test.ts` | [Pending] |
| **API-10** | API | FR-01, BR-04 | Fetch active requesters only | Returns only `isActive: true` requesters; excludes inactive | `server/tests/lab-02/requesters.api.test.ts` | [Passed] |
| **API-11** | API | FR-02 | Fetch ticket categories | Returns all 4 seed categories | `server/tests/lab-02/categories.api.test.ts` | [Passed] |
| **API-12** | API | FR-02 | Fetch related systems with optional category filter | Returns active systems; filters by `?categoryId` when provided | `server/tests/lab-02/related-systems.api.test.ts` | [Passed] |
| **UI-06** | UI | AC-10 | Network error display & form preservation | Zen Green error banner shown on API failure; dismiss button; form inputs preserved | `client/tests/lab-02/CreateTicket.test.tsx`, `client/tests/lab-02/MyTickets.test.tsx` | [Passed] |
| **UI-07** | UI | AC-03, FR-07 | Ticket detail view & metadata grid | Renders ticket header, status badge, metadata grid, and description | `client/tests/lab-02/RequesterTicketDetail.test.tsx` | [Pending] |
| **RESP-01** | Responsive | AC-09 | Mobile card view layout at <768px | Simulates mobile viewport; tickets render as cards in d-md-none container; no horizontal scrollbar; touch targets >= 44px | `client/tests/lab-02/MyTickets.test.tsx` | [Passed] |

---

## 3. Acceptance-Criterion Traceability

| Acceptance Criterion | Covered By Test IDs | Verification Method |
| :--- | :--- | :--- |
| **AC-01** (Valid ticket creation & Ticket Number) | API-01, E2E-01 | API test checks response `ticketNumber`; E2E verifies UI success page |
| **AC-02** (Dev Requester selection redirect) | UI-01, E2E-02 | UI component test checks route guard; E2E tests app startup flow |
| **AC-03** (Ownership isolation) | API-03, API-05, UI-07, E2E-02 | API attempts cross-requester query; UI renders ticket detail; E2E switches user identity |
| **AC-04** (Search & Filtering) | API-04, E2E-01 | API queries params; E2E interacts with search input and filters |
| **AC-05** (Field validation & error preservation) | API-02, UI-02 | Form submission without required fields verifies inline text |
| **AC-06** (Attachment upload) | API-06, E2E-03 | File upload multipart request verifies database record & storage |
| **AC-07** (Attachment size/type rejection) | UNIT-02, API-08 | Unit test validates logic; API test POSTs invalid files and asserts `400` with error codes |
| **AC-08** (Soft removal & blocked download) | API-07, API-09, UI-04, E2E-03 | Soft-remove sets `isRemoved`; download returns `410 Gone`; UI modal + E2E flow |
| **AC-09** (Mobile responsive layout) | E2E-01, RESP-01 | E2E mobile viewport test; dedicated responsive test verifies card list & no scroll |
| **AC-10** (Backend offline safe error state) | UI-06 | Mock API failure triggers Zen Green error banner; form inputs preserved |

---

## 4. Responsive and Visual Checklist (Planned Verification)

- [ ] **Desktop (>=992px)**: Header displays logo, nav items, and active requester dropdown; Create Ticket displays 2-column form grid; My Tickets renders full data table with interactive column headers.
- [ ] **Tablet (768-991px)**: Form fields re-align cleanly; summary and description span full width; data table remains readable without clipping.
- [ ] **Mobile (<768px)**: Stacked single-column controls; buttons maintain min-height 44px for touch friendliness; My Tickets transforms to a mobile card list view; 0 horizontal page scrollbar.
- [ ] **Zen Green Design System**: Primary header `#006B3C`, secondary accents `#0B7A46`, pale section fills `#EAF6EF`, soft gray read-only inputs `#F0F4F1`.
- [ ] **Validation & Error Placement**: Required asterisks (`*`) in red; inline field validation messages directly below corresponding controls.
- [ ] **Screenshot Evidence**: To be saved under `artifacts/lab-02/screenshots/` (`create-ticket/`, `my-tickets/`, `ticket-detail/`).

---

## 5. Test Commands

```bash
# Run server unit & API integration tests
npm --prefix server test -- lab-02

# Run client UI component and style tests
npm --prefix client test -- lab-02

# Run Playwright End-to-End tests
npx playwright test e2e/lab-02/
```

---

## 6. Final Results (Update as implementation proceeds)

- **Total Planned Tests**: 25
- **Passed**: 10 (UNIT-01, API-01, API-02, API-10, API-11, API-12, UI-01, UI-02, UI-03, UI-06)
- **Failed**: 0
- **Skipped**: 0
- **Coverage Summary**: 25 tests planned tracing to 100% of Acceptance Criteria (AC-01 through AC-10) and all API endpoints.

---

## 7. Known Limitations or Deferred Tests

1. **Real Authentication & Tokens**: Auth headers and session persistence are simulated using `x-requester-id`. Integration tests for session expiration will be written in Lab 3.
2. **IT Staff Workflow**: Status progression beyond `NEW` and staff priority modifications are out of scope for Sprint 2.
3. **Live File Virus Scanning**: Attachment uploads are checked for mime-type and extension matching, but binary antivirus inspection is deferred to production infrastructure setup.
