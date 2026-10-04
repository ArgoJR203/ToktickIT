# Zen Green UI Specification (Lab 4)

## 1. Visual Design System & Design Tokens

TokTickIT preserves and deepens the **Zen Green Design System** established in Labs 2 and 3. All dashboard metric cards, operational tables, Actions Taken modals, workflow controls, and feedback elements adhere strictly to these color, spacing, and typographic tokens:

| Token Name | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| `--color-primary-green` | `#006B3C` | Application header, primary submission buttons, modal confirm headers. |
| `--color-secondary-green` | `#0B7A46` | Active navigation tabs, accessible focus rings, action links, hover fills. |
| `--color-pale-green` | `#EAF6EF` | Metric card backgrounds, selected rows, success callouts, subtle fills. |
| `--color-bg-quiet` | `#F5F7F6` | Main application background (soft gray-green quiet tone). |
| `--color-surface-card` | `#FFFFFF` | Dashboard metric cards, form containers, queue tables, modal dialogs. |
| `--color-surface-border` | `#E0E6E2` | Card outlines, table row dividers, input field borders. |
| `--color-text-main` | `#1A2E26` | Main body text, headings, dark charcoal-green for high contrast (12.8:1). |
| `--color-text-muted` | `#5A6B63` | Subtitles, metric subtitles, timestamps, column headers, helper copy. |
| `--color-field-editable` | `#FFFFFF` | Editable input background with neutral `#CCCCCC` border. |
| `--color-field-readonly` | `#F0F4F1` | Shading for read-only fields (e.g. auto-assigned Performer name). |
| `--color-error-text` | `#D32F2F` | Validation errors, red asterisks, destructive action text. |
| `--color-error-bg` | `#FDECEA` | Validation error banner fill, danger badge backgrounds. |
| `--color-warning-badge` | `#F57C00` | In Progress / Pending status badges, warning callouts. |
| `--color-warning-bg` | `#FFF3E0` | Internal Notes section accent background and warning banner. |
| `--color-conflict-bg` | `#FFF8E1` | Stale-update 409 conflict alert banner fill. |
| `--color-conflict-border` | `#FFA000` | Stale-update 409 conflict alert border. |
| `--color-success-badge` | `#2E7D32` | Resolved status badge, active user badge, success banners. |
| `--color-neutral-badge` | `#607D8B` | Closed status badge, inactive user badge. |

---

## 2. Badge Design System

### 2.1 Ticket Status Badges
- **NEW**: Background `#E3F2FD`, Text `#1565C0`, Border `1px solid #90CAF9` (Soft Blue)
- **OPEN**: Background `#E8F5E9`, Text `#2E7D32`, Border `1px solid #A5D6A7` (Soft Green)
- **IN PROGRESS**: Background `#FFF8E1`, Text `#F57F17`, Border `1px solid #FFE082` (Warm Amber)
- **WAITING FOR REQUESTER**: Background `#FFF3E0`, Text `#E65100`, Border `1px solid #FFCC80` (Deep Orange)
- **RESOLVED**: Background `#E8F5E9`, Text `#1B5E20`, Border `1px solid #81C784` (Rich Emerald)
- **CLOSED**: Background `#ECEFF1`, Text `#455A64`, Border `1px solid #CFD8DC` (Slate Gray)
- **REOPENED**: Background `#F3E5F5`, Text `#7B1FA2`, Border `1px solid #CE93D8` (Purple)
- **CANCELLED**: Background `#FFEBEE`, Text `#C62828`, Border `1px solid #EF9A9A` (Muted Red)

### 2.2 Action Taken Status Badges
- **PENDING**: Background `#FFF9C4`, Text `#F57F17`, Border `1px solid #FFF176` (Yellow)
- **IN PROGRESS**: Background `#FFF8E1`, Text `#E65100`, Border `1px solid #FFE082` (Warm Amber)
- **COMPLETED**: Background `#E8F5E9`, Text `#2E7D32`, Border `1px solid #A5D6A7` (Soft Green)
- **CANCELLED**: Background `#ECEFF1`, Text `#607D8B`, Border `1px solid #CFD8DC` (Neutral Gray)

### 2.3 Priority Badges
- **LOW**: Background `#E8F5E9`, Text `#2E7D32` (Green)
- **MEDIUM**: Background `#FFF8E1`, Text `#F57F17` (Amber)
- **HIGH**: Background `#FFF3E0`, Text `#E65100` (Orange)
- **URGENT**: Background `#FFEBEE`, Text `#D32F2F`, Font-Weight 700 (Red)

### 2.4 User Role Badges
- **Requester**: Background `#E8F4F8`, Text `#0288D1`, Border `1px solid #B3E5FC`
- **IT Staff**: Background `#EAF6EF`, Text `#006B3C`, Border `1px solid #A3D9BE`, Font-Weight 600
- **Administrator**: Background `#F3E5F5`, Text `#6A1B9A`, Border `1px solid #E1BEE7`, Font-Weight 600

---

## 3. Application Shell & Role-Based Navigation

### 3.1 Top Navigation Bar (Header)
- **Height**: 60px, background `--color-primary-green` (`#006B3C`), white text, full width.
- **Brand**: TokTickIT logo with ticket/support icon on left.
- **Role-Tailored Navigation Tabs**:
  - **Requester**:
    1. **Dashboard** (Default landing view) -> view `dashboard`
    2. **My Tickets** -> view `tickets`
    3. **Create Ticket** -> view `create-ticket`
  - **IT Staff**:
    1. **Dashboard** (Default landing view) -> view `staff-dashboard`
    2. **Ticket Queue** -> view `staff-queue`
    3. **Create Ticket** -> view `create-ticket` *(Permitted for logging work)*
  - **Administrator**:
    1. **Dashboard** (Default landing view) -> view `staff-dashboard`
    2. **Ticket Queue** -> view `staff-queue`
    3. **User Management** -> view `user-management`
- **Active Tab Styling**:
  - Background `--color-secondary-green` (`#0B7A46`).
  - Bottom indicator: `3px solid #FFFFFF`.
  - Accessible `aria-current="page"`.
- **User Profile Area (Right)**:
  - Initials avatar chip (e.g. `[JS]` for John Smith).
  - User full name.
  - Role badge (`Requester` / `IT Staff` / `Admin`).
  - "Logout" button with sign-out icon, styled with subtle border and pale hover fill.

---

## 4. Screen Layouts & Detailed Mockup Specifications

### 4.1 Screen 1: IT Staff Dashboard

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ TokTickIT   [Dashboard]  [Ticket Queue]  [Create Ticket]         [JS] Admin │
├─────────────────────────────────────────────────────────────────────────────┤
│ Welcome back, John!                                             [⟳ Refresh] │
│ Here's what's happening with your queue today.                              │
│                                                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │Unassigned│ │   Open   │ │In Progress││Waiting Req││My Assigned│            │
│ │    3     │ │    5     │ │    4     │ │    2     │ │    3     │            │
│ │   View   │ │   View   │ │   View   │ │   View   │ │   View   │            │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│                                                                             │
│ ┌───────────────────────────────────────┐  ┌──────────────────────────────┐ │
│ │ Recent Queue Tickets         View all │  │ Quick Actions                │ │
│ ├───────────────────────────────────────┤  ├──────────────────────────────┤ │
│ │ TKT-2026-000001 [In Progress] May 12 │  │ [ + Create Ticket ]          │ │
│ │ Email sync failing on mobile          │  │ [ 🔍 Search Tickets ]        │ │
│ ├───────────────────────────────────────┤  │ [ 📋 My Queue ]              │ │
│ │ TKT-2026-000002 [Open]        May 10 │  │                              │ │
│ │ Campus Wi-Fi certificate issue        │  │ Admin Statistics:            │ │
│ ├───────────────────────────────────────┤  │ • Total Users: 11 (9 Active) │ │
│ │ TKT-2026-000003 [Waiting Req] May 06 │  │ • Requesters: 6 \| Staff: 4   │ │
│ └───────────────────────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Layout Specifications:
- **Greeting Banner**: Personalized greeting (`"Welcome back, {userName}!"`), subtitle, and manual refresh button.
- **Metric Cards Grid (5 Cards)**:
  1. **Unassigned**: Count of non-terminal tickets without owner (`ownerId === null`). Drill-down: `/staff/tickets?owner=unassigned`.
  2. **Open**: Count of tickets in `OPEN` status. Drill-down: `/staff/tickets?currentStatus=OPEN`.
  3. **In Progress**: Count of tickets in `IN_PROGRESS` status. Drill-down: `/staff/tickets?currentStatus=IN_PROGRESS`.
  4. **Waiting for Requester**: Count in `WAITING_FOR_REQUESTER`. Drill-down: `/staff/tickets?currentStatus=WAITING_FOR_REQUESTER`.
  5. **My Assigned**: Count of non-terminal tickets owned by caller (`ownerId === authUser.id`). Drill-down: `/staff/tickets?owner=me`.
- **Recent Queue Panel (70% width on Desktop)**:
  - Displays top 5 recent operational tickets with Ticket ID (monospace), title, status badge, and timestamp.
  - Clicking any ticket navigates directly to Staff Ticket Detail.
- **Quick Actions & Admin Panel (30% width on Desktop)**:
  - Shortcuts: *Create Ticket*, *Search Tickets*, *My Queue*.
  - For Administrators (`role === 'ADMINISTRATOR'`), renders **Admin Statistics Card**:
    - Total Users: 11 (9 Active, 2 Inactive)
    - Requesters: 6 | Staff: 4 | Admin: 1

---

### 4.2 Screen 2: Requester Dashboard

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ TokTickIT   [Dashboard]  [My Tickets]  [Create Ticket]       [JA] Requester │
├─────────────────────────────────────────────────────────────────────────────┤
│ Welcome, Jennifer!                                              [⟳ Refresh] │
│ Here's the latest on your requests.                                         │
│                                                                             │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│ │My Open Tickets││ Waiting on Me│ │Recently Upd │ │Recently Res. │         │
│ │      2       │ │      1       │ │      5       │ │      3       │         │
│ │   View all   │ │   View all   │ │   View all   │ │   View all   │         │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                                             │
│ ┌───────────────────────────────────────┐  ┌──────────────────────────────┐ │
│ │ My Recent Tickets            View all │  │ Quick Actions                │ │
│ ├───────────────────────────────────────┤  ├──────────────────────────────┤ │
│ │ TKT-2026-000001 [In Progress] May 12 │  │ [ + Create Ticket ]          │ │
│ │ Email sync failing on mobile          │  │   Submit a new request       │ │
│ ├───────────────────────────────────────┤  │                              │ │
│ │ TKT-2026-000004 [Resolved]    May 11 │  │ [ 📋 View My Tickets ]       │ │
│ │ VPN configuration assistance          │  │   Track existing requests    │ │
│ └───────────────────────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Layout Specifications:
- **Ownership Guarantee**: Strictly displays tickets and metrics owned by the authenticated Requester (`ticket.requesterId === authUser.id`).
- **Metric Cards Row (4 Cards Matching §4.6)**:
  1. **My Open Tickets**: Total active tickets (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `REOPENED`). Drill-down: `/tickets?statusGroup=open`.
  2. **Waiting on Me**: Tickets in `WAITING_FOR_REQUESTER`. Drill-down: `/tickets?currentStatus=WAITING_FOR_REQUESTER`.
  3. **Recently Updated**: Tickets updated recently. Drill-down: `/tickets`.
  4. **Recently Resolved**: Tickets in `RESOLVED` or `CLOSED`. Drill-down: `/tickets?statusGroup=resolved`.
- **Recent Tickets List**: Top 5 recent owned tickets with ID, title, status badge, and timestamp.
- **Quick Actions Panel**: Direct buttons for *Create Ticket* and *View My Tickets*.

---

### 4.3 Screen 3: Actions Taken on Ticket Detail

#### 4.3.1 Staff & Admin View (Interactive Management)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Actions Taken (2)                                       [+ Log Action Taken]│
├─────────────────────────────────────────────────────────────────────────────┤
│ Date/Time        Description      Result      Status      Assignee / Performer│
├─────────────────────────────────────────────────────────────────────────────┤
│ 2026-05-12 10:15 Replaced battery Passed test [COMPLETED] Sarah Chen (P)    │
│                  Ref: report.pdf                          Alex Thompson (A) │
│                                                           [Edit]            │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2026-05-13 14:00 Follow-up test   Pending     [PENDING]   Alex Thompson (P) │
│ (Planned)        Follow-up Note: Verify telemetry after 48h  Alex Thompson (A) │
│                                                           [Edit]            │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4.3.2 Log / Edit Action Taken Modal Dialog
- **Modal Container**: Accessible modal dialog (`role="dialog"`, `aria-modal="true"`), max-width 640px.
- **Form Fields**:
  1. `Performed By` (Read-only): Auto-populated with current authenticated user's name (`#F0F4F1`).
  2. `Assignee` (Optional select): Dropdown of active IT Staff and Admin accounts. Inactive accounts are filtered out; selecting an invalid account yields inline validation error.
  3. `Action Status` (Select): `COMPLETED` (default for executed actions), `PENDING` (for planned actions), `IN_PROGRESS`, `CANCELLED`.
  4. `Action Date/Time` (Required `*`): Datetime-local picker. Can be past, present, or future for scheduling upcoming actions.
  5. `Action Description` (Required `*`): Textarea (1–2000 chars) with live counter.
  6. `Result` (Required `*`): Textarea (1–2000 chars) with live counter.
  7. `Follow-Up Required?` (Checkbox):
     - Unchecked: `Follow-up Note` field hidden.
     - Checked: `Follow-up Note` textarea displays with red required asterisk `*`.
  8. `Follow-up Note` (Conditionally Required `*`): Textarea (1–1000 chars).
  9. `Attachment Notes` (Optional): Text input (0–500 chars).
- **Actions**: "Save Action Taken" (with loading spinner & double-click debounce), "Cancel".

#### 4.3.3 Requester View (Read-Only)
- Requesters see all logged Actions Taken under their ticket in read-only cards or table.
- No "+ Log Action Taken" button; no "[Edit]" action links.

---

### 4.4 Screen 4: Ticket Workflow & Concurrency Conflict UI

#### 4.4.1 Dynamic Status Transition Dropdown
On Staff Ticket Detail, the status selector dynamically lists **only permitted next statuses** according to the transition matrix (`BR-11`):
- E.g. When status is `NEW`: options are strictly `[ NEW (current), Open, In Progress, Cancelled ]`.
- Moving to `RESOLVED` or `CLOSED` requires:
  1. Non-empty `Resolution Summary` input (min 5 chars).
  2. All Actions Taken must be in terminal state (`COMPLETED` or `CANCELLED`) with no unresolved follow-up (`BR-20`). If pending actions exist, an inline error banner blocks submission.

#### 4.4.2 Advisory Resolution Banner (Staff View)
When Requester has signaled "Problem Appears Resolved":
- Amber alert banner at the top of Staff Ticket Detail:
  *"The requester indicated this problem appears resolved. Please verify the work, check completed actions, and formally update the ticket status."*

#### 4.4.3 Stale-Update 409 Conflict Banner & Recovery
When an update is rejected due to concurrent modification by another user:
- Backend responds with `409 Conflict` (`STALE_UPDATE`).
- UI displays a prominent conflict banner:
  *"⚠️ Update Conflict: Another staff member has updated this ticket while you were viewing it. Your changes were not saved to prevent overwriting their work."*
  - Button: **"Reload Latest Ticket Data"** (fetches fresh ticket state, updates status badge and version counter, preserving draft text).

---

## 5. Screen Modes and User Feedback Specifications

| Mode / Feedback State | Visual Representation | Component Behavior |
| :--- | :--- | :--- |
| **Loading / Busy** | Centered Zen Green spinner (`border-top-color: #006B3C`) or button spinner | Submission buttons disabled, prevents double clicks (`FR-19`). |
| **Field Validation Error** | Red border (`#D32F2F`) on input, red error text directly below control | Triggered on blur or submit; clears dynamically on input keystroke. |
| **Form Error Banner** | Pale red banner (`#FDECEA`, border `#D32F2F`, text `#D32F2F`) at top of form | Displays server error message; retains user-entered inputs (`FR-20`). |
| **409 Conflict Alert** | Amber banner (`#FFF8E1`, border `#FFA000`, text `#5D4037`) with reload button | Informs user of concurrent modification; offers safe reload trigger. |
| **Success Toast / Banner** | Pale green banner (`#EAF6EF`, border `#2E7D32`, text `#1B5E20`) | Auto-dismisses after 4 seconds or on user close. |
| **Empty State** | Quiet card with empty illustration and text (e.g. *"No Actions Taken yet"*) | Displays clear helper text and "+ Log Action Taken" call to action. |
| **Forbidden (403)** | Zen Green error card with shield/lock icon | *"You do not have permission to perform this action or view this resource."* |
| **Not Found (404)** | Quiet card with search/magnifying-glass icon | *"The requested ticket could not be found."* (Prevents ID enumeration). |

---

## 6. Responsive and Accessibility Rules

- **Viewport Breakpoints**:
  - Desktop: `>= 992px` (Full table view, 5-column metric cards row, 2-column split layout).
  - Tablet: `768px - 991px` (2/3-column metric cards, condensed tables, stacked panels).
  - Mobile: `< 768px` (2-column metric cards, stacked card lists, full-width 100% buttons).
- **Touch Target Sizing**: All interactive buttons, tabs, modal triggers, and form inputs maintain a minimum touch target height of **44px** on mobile.
- **Focus Rings**: All interactive controls implement high-contrast WCAG AA compliant focus outlines: `2px solid #0B7A46`, `outline-offset: 2px`.
- **Contrast Ratios**: All text tokens against background tokens exceed the WCAG 2.1 AA requirement of **4.5:1** (Zen Green `--color-text-main` `#1A2E26` on `#FFFFFF` is 12.8:1; `--color-primary-green` `#006B3C` with white text is 5.4:1).
- **Dual Visual Cues**: Statuses and priorities never rely solely on color; each is accompanied by a text label and/or distinct icon.
- **Zero Horizontal Overflow**: Every screen verified at 375px (mobile), 768px (tablet), and 1280px (desktop) with `overflow-x: hidden` and zero clipping.

---

## 7. Visual & Responsive Checklist (Handout §14 Part 9)

| Checklist Category | Inspection Criterion | Specification & Implementation Target | Verification Status |
| :--- | :--- | :--- | :---: |
| **Design Consistency** | Uniform Zen Green token palette across all views | Primary `#006B3C`, Secondary `#0B7A46`, Pale `#EAF6EF`, Quiet `#F5F7F6`. No ad-hoc generic colors. | **Planned (Sprint 4 Contract)** |
| **Role Navigation** | Navigation strictly matches authenticated role | Requester sees Dashboard, My Tickets, Create; Staff sees Dashboard, Queue, Create; Admin sees Dashboard, Queue, User Mgmt. | **Planned (Sprint 4 Contract)** |
| **Role Header Badges** | User profile shows current authenticated identity | Top right shows User Name, Role Badge (Requester / IT Staff / Admin), and Logout button. | **Planned (Sprint 4 Contract)** |
| **Status Badges** | Consistent color-coded badges for all 8 statuses | New (Blue), Open (Green), In Progress (Amber), Waiting (Orange), Resolved (Emerald), Closed (Slate), Reopened (Purple), Cancelled (Red). | **Planned (Sprint 4 Contract)** |
| **Priority Badges** | Distinct visual badges for Requested & IT Priority | Low (Green), Medium (Amber), High (Orange), Urgent (Bold Red). | **Planned (Sprint 4 Contract)** |
| **Editable vs Read-Only** | Clear visual distinction between field states | Editable fields have white background with neutral border; Read-only fields shaded with `#F0F4F1`. | **Planned (Sprint 4 Contract)** |
| **Actions Taken Component** | Integrated under Ticket Detail with role security | Staff/Admin see interactive table & modal; Requesters see read-only feed without edit controls. | **Planned (Sprint 4 Contract)** |
| **Follow-Up Conditional UI** | Follow-up note required only when toggle checked | Dynamic DOM expansion; red asterisk and mandatory validation applied only if `followUpRequired = true`. | **Planned (Sprint 4 Contract)** |
| **Resolution Summary** | Visible to requester on resolved/closed tickets | Input field for IT Staff in detail view; rendered as styled summary card for Requester. | **Planned (Sprint 4 Contract)** |
| **Conflict 409 Feedback** | Clear feedback when concurrent write is rejected | Amber conflict alert banner with "Reload Latest Ticket Data" action button preventing data loss. | **Planned (Sprint 4 Contract)** |
| **Validation Placement** | Field errors rendered directly beneath controls | Red text (`#D32F2F`) below invalid inputs; red asterisk (`*`) on required labels. | **Planned (Sprint 4 Contract)** |
| **Focus Rings** | High-contrast WCAG AA accessible focus rings | `2px solid #0B7A46` with `outline-offset: 2px` across all interactive elements. | **Planned (Sprint 4 Contract)** |
| **Touch Targets** | Mobile buttons and interactive elements >= 44px | Mobile buttons and form inputs maintain `min-height: 44px` for touch accessibility. | **Planned (Sprint 4 Contract)** |
| **Clipping & Overlap** | Zero text clipping, truncation, or element overlap | Long descriptions wrap cleanly; cards expand without clipping metadata. | **Planned (Sprint 4 Contract)** |
| **Horizontal Overflow** | Zero horizontal scrollbar on any viewport | Verified across Mobile (375px), Tablet (768px), and Desktop (1280px); `overflow-x: hidden`. | **Planned (Sprint 4 Contract)** |
| **Screenshot Evidence** | Captured across Desktop, Tablet, and Mobile | Organized in `artifacts/lab-04/screenshots/` under `staff-dashboard/`, `requester-dashboard/`, and `actions-taken/`. | **Planned (Sprint 4 Contract)** |

*Note*: Verification Status will be formally updated to **Verified** alongside captured screenshot evidence during Issue #4-6 (Final Hardening & Release Verification).
