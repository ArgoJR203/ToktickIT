# Lab 2 Sprint Engineering Specification

## 1. Sprint Goal
Deliver a fully functional, responsive Requester-facing IT Support Ticketing MVP for **TokTickIT** built on the Zen Green design system. By the end of Sprint 2, an end-user (Requester) can simulate login via a Development Requester selector, create IT support tickets with permitted attachments, view and manage their submitted tickets in a searchable and paginated list, inspect detailed ticket views, add attachments to existing tickets, and perform soft-removal of their attachments with audit logging, while ensuring backend ownership enforcement and full test coverage.

---

## 2. Stakeholder Request Interpretation
The IT department requires a professional end-user facing web portal for submitting and managing IT support requests. Key capabilities required:
1. **Ticket Creation**: Requesters must describe issues, select categories and related systems, set requested priority, attach evidence (images/PDFs), and submit tickets to obtain an official Ticket Number.
2. **My Tickets Dashboard**: Requesters must be able to view, search, filter, sort, and paginate through their own submitted tickets.
3. **Ticket Detail & Attachments**: Requesters must be able to inspect full ticket information, view attachment metadata, download active files, add new attachments, and soft-remove existing attachments with mandatory reasons.
4. **Development Requester Selector**: Since full authentication is deferred to Lab 3, a temporary identity selection screen is required for test purposes to simulate multi-tenant requester context and strict data ownership isolation.
5. **Zen Green UI Foundation**: The application must implement a clean, accessible, consistent Zen Green Theme visual style and responsive component library across desktop, tablet, and mobile viewports.

---

## 3. Scope

### 3.1 Included Scope
- **Development Requester Selector**: Simulated login selection screen, context preservation in client state, active user switching, and inactive user filtering.
- **Create Ticket Workflow**: Form validation, classification select inputs, ticket summary & description, drag-and-drop file upload, auto-generated Ticket Number (`TKT-YYYY-XXXXXX`), and default status (`NEW`).
- **My Tickets Workflow**: Paginated ticket table/card view, real-time search (by summary or ticket number), category filter, priority filter, status filter, and column sorting.
- **Requester Ticket Detail Workflow**: Read-only display of ticket fields, requester ownership enforcement, attachment section with upload, preview metadata, download stream, and soft-removal modal dialog.
- **Data Model & REST API**: PostgreSQL database schema (Prisma), seed data script, and robust RESTful API endpoints with ownership checks.
- **Responsive & Zen Green UI**: Zen Green design tokens, clear component hierarchy, accessibility compliance, and responsive layouts across desktop, tablet, and mobile.
- **Automated Testing & Documentation**: Unit, API integration, UI component, responsive visual, and E2E Playwright tests tracing to acceptance criteria.

### 3.2 Excluded Scope (Deferred to Future Labs)
- **Authentication & Security**: Real login/logout, password hashing, sessions, JWT tokens, user registration, and OAuth (deferred to Lab 3).
- **IT Staff & Admin Workflows**: IT Staff dashboard, claiming/assigning tickets, modifying IT Priority, status updates by staff, resolution workflows, and admin configuration screens.
- **Collaboration Features**: Public comments, internal notes, actions taken timeline, and email notifications.
- **Ticket Lifecycle Post-Creation**: Status transitions beyond `NEW` (e.g., In Progress, Resolved, Closed, Cancelled).

---

## 4. Functional Requirements

| ID | Functionality | Description |
| :--- | :--- | :--- |
| **FR-01** | Development Requester Selection | System shall allow selecting an active Development Requester to establish the current session context. |
| **FR-02** | Ticket Creation | System shall allow the selected Requester to submit a ticket with category, related system, summary, description, requested priority, and initial attachments. |
| **FR-03** | Ticket Number Generation | System shall automatically generate a unique, non-sequential or formatted Ticket Number (e.g., `TKT-2026-XXXXXX`) upon ticket creation. |
| **FR-04** | My Tickets Listing | System shall display a list of tickets belonging strictly to the currently selected Development Requester. |
| **FR-05** | Search and Filtering | System shall allow filtering tickets by search keyword (summary/number), category, priority, and status. |
| **FR-06** | Sorting and Pagination | System shall allow sorting tickets by date/priority/status and support paginated viewing (default 10 items per page). |
| **FR-07** | Ticket Detail Retrieval | System shall allow opening a detailed read-only view of an owned ticket. |
| **FR-08** | Attachment Upload | System shall support uploading permitted file types (JPG, PNG, WEBP, PDF) up to 5 MB per file, max 5 active attachments per ticket. |
| **FR-09** | Attachment Metadata & Download | System shall render attachment metadata (name, size, type, upload date) and allow downloading active attachment files. |
| **FR-10** | Attachment Soft Removal | System shall allow soft-removing an attachment with a mandatory removal reason. Soft-removed files remain visible as metadata but cannot be downloaded. |
| **FR-11** | Data Ownership Enforcement | System shall reject unauthorized API and UI access to tickets or attachments belonging to a different Requester. |
| **FR-12** | Form Validation & Preserved Inputs | System shall display field-level validation errors and preserve user input during validation or server failure states. |

---

## 5. Business Rules

- **BR-01**: The official Ticket Number is generated by the backend upon successful creation and must be globally unique (format: `TKT-YYYY-XXXXXX`).
- **BR-02**: A newly created ticket always initializes with `CurrentStatus = NEW`.
- **BR-03**: Lab 2 uses a Development Requester selector instead of login. The selected identity is for testing context only and is not secure authentication.
- **BR-04**: Only Requesters marked `isActive = true` appear in the Development Requester selection screen. Inactive Requesters cannot be selected.
- **BR-05**: Requesters can only access, view, search, and manage tickets and attachments that they own (`ticket.requesterId == currentRequester.id`).
- **BR-06**: Searching in My Tickets matches partial strings (case-insensitive) against `ticketNumber` and `summary`.
- **BR-07**: Default ticket list sorting is `createdAt` descending (newest tickets first).
- **BR-08**: Ticket Summary is required, trimmed of leading/trailing whitespace, minimum 5 characters, maximum 100 characters.
- **BR-09**: Ticket Description is required, trimmed, minimum 10 characters, maximum 2000 characters.
- **BR-10**: Category and Related System are required selections from active database records. Selected Related System must belong to the selected Category if relationship constraints apply.
- **BR-11**: Requested Priority is required and must be one of: `LOW`, `MEDIUM`, `HIGH`, `URGENT`.
- **BR-12**: Permitted attachment file types are strictly: `image/jpeg`, `image/jpg`, `image/png`, `image/webp`, and `application/pdf`. Other file types must be rejected.
- **BR-13**: Maximum file size for any single attachment is **5 MB** (5,242,880 bytes).
- **BR-14**: A ticket can have a maximum of **5 active (non-removed)** attachments at any time.
- **BR-15**: Attachment removal is implemented strictly as a **soft removal** (`isRemoved = true`, `removalReason` required min 3 characters, `removedAt = NOW()`).
- **BR-16**: Soft-removed attachments remain visible in the attachment list marked with a "Removed" badge and removal metadata, but binary file download endpoints must return `410 Gone` or `404 Not Found`.
- **BR-17**: If ticket creation succeeds but attachment upload fails, the ticket creation transaction is completed, but clear warning messages inform the user of failed attachments.
- **BR-18**: Attempting to view or access a ticket belonging to another requester returns `403 Forbidden` (or `404 Not Found` to prevent resource enumeration).
- **BR-19**: Switching the selected Development Requester immediately clears client-side cache and reloads all ticket lists and state for the newly selected requester.
- **BR-20**: The architecture must keep data models and API contracts modular to allow seamless migration to real authentication (JWT/Session tokens) in Lab 3.

---

## 6. UI Specification Summary

The UI adheres strictly to the **Zen Green Theme** specification detailed in [ui-spec.md](file:///d:/AllStudyProject/CPE334/TokTickIT/docs/lab-02/ui-spec.md).
- **Color Palette**: Primary Green (`#006B3C`), Secondary Green (`#0B7A46`), Pale Green (`#EAF6EF`), Quiet Background (`#F5F7F6`), Surface Cards (`#FFFFFF`).
- **Form Controls**: Top-aligned labels, red asterisk `*` for required fields, field-level inline error messages below inputs.
- **Button Hierarchy**: Primary Green for main submission, Secondary Green outlined for secondary actions, Red/Destructive for soft-removal actions, clear disabled and busy states.
- **Responsive Design**:
  - **Desktop (>=992px)**: Multi-column grid form, interactive data table with sort headers.
  - **Tablet (768-991px)**: Two-column layout, summary/description full width.
  - **Mobile (<768px)**: Stacked single-column controls, responsive card-list view for My Tickets, touch targets >= 44px.

---

## 7. Data Changes

### 7.1 Entity Relationship Diagram (Conceptual)
- **`RequesterUser`** `1` --- `*` **`Ticket`**
- **`Category`** `1` --- `*` **`Ticket`**
- **`RelatedSystem`** `1` --- `*` **`Ticket`**
- **`Ticket`** `1` --- `*` **`Attachment`**

### 7.2 Prisma Database Schema
The database model extends `server/prisma/schema.prisma`:

```prisma
enum RequestedPriority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

enum CurrentStatus {
  NEW
  IN_PROGRESS
  PENDING
  RESOLVED
  CLOSED
}

model RequesterUser {
  id        Int      @id @default(autoincrement())
  name      String
  email     String   @unique
  isActive  Boolean  @default(true)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  tickets   Ticket[]
}

model Category {
  id             Int             @id @default(autoincrement())
  name           String          @unique
  createdAt      DateTime        @default(now())
  tickets        Ticket[]
  relatedSystems RelatedSystem[]
}

model RelatedSystem {
  id         Int       @id @default(autoincrement())
  name       String    @unique
  isActive   Boolean   @default(true)
  categoryId Int?
  category   Category? @relation(fields: [categoryId], references: [id])
  createdAt  DateTime  @default(now())
  tickets    Ticket[]
}

model Ticket {
  id                Int               @id @default(autoincrement())
  ticketNumber      String            @unique
  requesterId       Int
  requester         RequesterUser     @relation(fields: [requesterId], references: [id])
  categoryId        Int
  category          Category          @relation(fields: [categoryId], references: [id])
  relatedSystemId   Int
  relatedSystem     RelatedSystem     @relation(fields: [relatedSystemId], references: [id])
  summary           String
  description       String
  requestedPriority RequestedPriority @default(MEDIUM)
  currentStatus     CurrentStatus     @default(NEW)
  createdAt         DateTime          @default(now())
  updatedAt         DateTime          @updatedAt
  attachments       Attachment[]

  @@index([requesterId])
  @@index([categoryId])
  @@index([relatedSystemId])
  @@index([createdAt])
}

model Attachment {
  id            Int       @id @default(autoincrement())
  ticketId      Int
  ticket        Ticket    @relation(fields: [ticketId], references: [id], onDelete: Cascade)
  filename      String
  originalName  String
  mimeType      String
  sizeBytes     Int
  storagePath   String
  isRemoved     Boolean   @default(false)
  removalReason String?
  removedAt     DateTime?
  createdAt     DateTime  @default(now())

  @@index([ticketId])
}
```

### 7.3 Seed Data Requirements
Seed script `server/prisma/seed.ts` must be idempotent and generate:
1. **Categories (4)**: `Account and Access`, `Hardware`, `Software`, `Network`.
2. **Related Systems (7)**: `Email`, `Campus Wi-Fi`, `VPN`, `LEB2 App`, `Grade Submission App`, `Printer`, `Corporate Laptop`.
3. **Active Requesters (4)**:
   - Jennifer Anderson (`jennifer.anderson@example.com`)
   - Sarah Johnson (`sarah.johnson@example.com`)
   - David Lee (`david.lee@example.com`)
   - Michael Brown (`michael.brown@example.com`)
4. **Inactive Requester (1)**:
   - Robert Taylor (`robert.taylor@example.com`, `isActive: false`)

---

## 8. API Contract Summary

Refer to [api-spec.md](file:///d:/AllStudyProject/CPE334/TokTickIT/docs/lab-02/api-spec.md) for complete payload schemas.
- `GET /api/requesters`: Fetch active Development Requesters.
- `GET /api/categories`: Fetch ticket categories.
- `GET /api/related-systems`: Fetch related systems.
- `GET /api/tickets`: Fetch paginated list of tickets owned by `x-requester-id`. Supports query params: `search`, `categoryId`, `requestedPriority`, `currentStatus`, `sortBy`, `sortOrder`, `page`, `pageSize`.
- `POST /api/tickets`: Submit a new ticket for `x-requester-id`.
- `GET /api/tickets/:id`: Fetch owned ticket detail by ID.
- `POST /api/tickets/:id/attachments`: Upload attachment file to ticket.
- `GET /api/attachments/:id/download`: Download active attachment binary stream.
- `DELETE /api/attachments/:id`: Soft-remove attachment with removal reason.

---

## 9. Acceptance Criteria

- **AC-01**: Given valid Ticket data (Category, System, Summary, Description, Priority), when the selected Requester submits the form, then one Ticket is saved with status `NEW`, an official Ticket Number is generated, and a success confirmation is displayed.
- **AC-02**: Given no Development Requester is selected, when the user attempts to access ticket screens, then the user is redirected to the Development Requester Selection screen.
- **AC-03**: Given Requester A is selected, when Requester A requests tickets or attempts to access a Ticket ID owned by Requester B, then Requester B's ticket data is not returned (`403 Forbidden` / `404 Not Found`).
- **AC-04**: Given a list of tickets, when a Requester enters a search keyword matching a summary or ticket number, then only matching tickets owned by that Requester are displayed.
- **AC-05**: Given invalid form inputs (e.g. Summary < 5 characters, missing Category), when submitted, then field-level validation error messages appear immediately below the affected controls and no API request is created.
- **AC-06**: Given an active attachment file meeting format (JPG/PNG/WEBP/PDF) and size (<= 5MB) criteria, when uploaded to an owned ticket, then the attachment metadata appears in the attachment section.
- **AC-07**: Given an unsupported file format or file > 5MB, when an upload is attempted, then a clear validation error is displayed and the file is rejected.
- **AC-08**: Given an active attachment, when the owning Requester provides a removal reason and confirms soft removal, then `isRemoved` is set to `true`, a "Removed" badge is displayed, and download attempts are blocked (`410 Gone`).
- **AC-09**: Given the My Tickets screen on a mobile viewport (<768px), when rendered, then tickets display as responsive cards without horizontal page scrolling.
- **AC-10**: Given the backend service is offline, when a user submits a ticket, then a graceful Zen Green error banner is displayed and form inputs are preserved.

---

## 10. Definition of Done

### 10.1 Part 1: Product Completion
- [ ] All required scope (Dev Requester Selector, Create Ticket, My Tickets, Ticket Detail, Attachments) fully implemented.
- [ ] All Acceptance Criteria (AC-01 through AC-10) satisfied with passing automated test evidence.
- [ ] Conformance to Zen Green Theme visual specification across desktop, tablet, and mobile.
- [ ] Backend ownership verification on all ticket and attachment endpoints.
- [ ] Safe error handling and form state preservation on failures.
- [ ] Complete setup and execution instructions in README.md.

### 10.2 Part 2: Course Delivery Requirements
- [ ] Decomposed into GitHub Issues with clear Kanban tracking (Backlog -> Done).
- [ ] Feature branches merged into `lab2-staging` via peer-reviewed Pull Requests.
- [ ] Integration testing completed on `lab2-staging` prior to single release PR to `main`.
- [ ] Peer review comments, responses, and approvals documented in `reviewer.md`.
- [ ] AI usage and prompt log documented in `ai-use.md`.
- [ ] Compiled final PDF report following the required "Answer Part 1" through "Answer Part 9" format.

---

## 11. Assumptions and Decisions

1. **Simulated Authentication Header**: In Lab 2, client requests include the HTTP header `x-requester-id: <id>` to communicate the selected requester context to the backend cleanly.
2. **File Storage Strategy**: Uploaded files are stored in the local server directory `server/uploads/` with sanitized, timestamp-prefixed filenames, while metadata is tracked in PostgreSQL.
3. **Soft Removal Policy**: Removed files remain on disk for audit compliance, but database flags and API endpoints strictly prevent binary streaming or download for removed files.
4. **Ticket Number Format**: Generated as `TKT-YYYY-XXXXXX` using current year and zero-padded sequential or unique alphanumeric string to ensure readability and professional format.
