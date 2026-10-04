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

### 2.2 Priority Badges
- **LOW**: Background `#E8F5E9`, Text `#2E7D32` (Green)
- **MEDIUM**: Background `#FFF8E1`, Text `#F57F17` (Amber)
- **HIGH**: Background `#FFF3E0`, Text `#E65100` (Orange)
- **URGENT**: Background `#FFEBEE`, Text `#D32F2F`, Font-Weight 700 (Red)

### 2.3 User Role Badges
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
    1. **Dashboard** (Default landing view) -> `/dashboard`
    2. **My Tickets** -> `/tickets`
    3. **Create Ticket** -> `/tickets/create`
  - **IT Staff**:
    1. **Dashboard** (Default landing view) -> `/staff/dashboard`
    2. **Ticket Queue** -> `/staff/tickets`
    3. **Create Ticket** -> `/tickets/create`
  - **Administrator**:
    1. **Dashboard** (Default landing view) -> `/staff/dashboard`
    2. **Ticket Queue** -> `/staff/tickets`
    3. **User Management** -> `/admin/users`
- **Active Tab Styling**:
  - Background `--color-secondary-green` (`#0B7A46`).
  - Bottom indicator: `3px solid #FFFFFF`.
  - Accessible `aria-current="page"`.
- **User Profile Area (Right)**:
  - Initials avatar chip (e.g. `[JD]`).
  - User full name.
  - Role badge (`Requester` / `IT Staff` / `Admin`).
  - "Logout" button with sign-out icon, styled with subtle border and pale hover fill.

---

## 4. Screen Layouts & Detailed Mockup Specifications

### 4.1 Screen 1: IT Staff Dashboard (`/staff/dashboard`)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ TokTickIT   [Dashboard]  [Ticket Queue]  [Create Ticket]         [MA] Admin │
├─────────────────────────────────────────────────────────────────────────────┤
│ Welcome back, Michael!                                          [⟳ Refresh] │
│ Here's what's happening with your queue today.                              │
│                                                                             │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│ │   New    │ │   Open   │ │In Progress││Waiting Req││My Assigned│            │
│ │    14    │ │    23    │ │    18    │ │    7     │ │    16    │            │
│ │ +3 today │ │ -2 today │ │ +1 today │ │ +2 today │ │ +4 today │            │
│ └──────────┘ └──────────┘ └──────────┘ └──────────┘ └──────────┘            │
│                                                                             │
│ ┌───────────────────────────────────────┐  ┌──────────────────────────────┐ │
│ │ My Recent Tickets            View all │  │ Quick Actions                │ │
│ ├───────────────────────────────────────┤  ├──────────────────────────────┤ │
│ │ TKT-2026-000234 [In Progress] May 12 │  │ [ + Create Ticket ]          │ │
│ │ Laptop battery drains quickly         │  │ [ 🔍 Search Tickets ]        │ │
│ ├───────────────────────────────────────┤  │ [ 📋 My Queue ]              │ │
│ │ TKT-2026-000220 [Open]        May 10 │  │                              │ │
│ │ Printer keeps showing offline         │  │ Admin Statistics:            │ │
│ ├───────────────────────────────────────┤  │ • Total Users: 11 (9 Active) │ │
│ │ TKT-2026-000218 [In Progress] May 06 │  │ • Requesters: 5 | Staff: 4    │ │
│ └───────────────────────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Layout Specifications:
- **Greeting Banner**: Personalized greeting (`"Welcome back, {userName}!"`), subtitle, and manual refresh button.
- **Metric Cards Grid**:
  - 5 cards displayed in a responsive horizontal grid (`grid-template-columns: repeat(auto-fit, minmax(180px, 1fr))`).
  - Each card contains:
    - **Header Label**: `New`, `Open`, `In Progress`, `Waiting for Requester`, `My Assigned`.
    - **Primary Count**: Bold 32px monospace numeral in `--color-text-main`.
    - **Context Subtitle**: Trend or status indicator (e.g. `+3 today` or `Requires action`).
    - **Interactive Drill-Down**: Entire card is keyboard accessible (`tabindex="0"`, `role="link"`), linking directly to `/staff/tickets` with prepopulated query filter:
      - *New* -> `/staff/tickets?status=NEW`
      - *Open* -> `/staff/tickets?status=OPEN`
      - *In Progress* -> `/staff/tickets?status=IN_PROGRESS`
      - *Waiting for Requester* -> `/staff/tickets?status=WAITING_FOR_REQUESTER`
      - *My Assigned* -> `/staff/tickets?owner=me`
- **Recent Queue Panel (Left / Main, 70% width on Desktop)**:
  - Concise list of 5 most recent tickets requiring attention.
  - Displays: Ticket ID (monospace), Summary title, Status badge, Timestamp, and click-through link to Ticket Detail.
  - "View all" header link routes to `/staff/tickets`.
- **Quick Actions & Admin Panel (Right, 30% width on Desktop)**:
  - Shortcuts: *Create Ticket* (`/tickets/create`), *Search Tickets* (`/staff/tickets?focusSearch=true`), *My Queue* (`/staff/tickets?owner=me`).
  - If authenticated user is `ADMINISTRATOR`, renders an additional **Admin Summary Card**:
    - Total Users count, Active Users count, and role breakdown pill badges.
- **Responsive Layout**:
  - `>= 992px`: 5-column metric row, 2-column side-by-side body (70% / 30%).
  - `768px - 991px`: 3-column / 2-column metric grid, stacked panels.
  - `< 768px`: 2-column metric cards, stacked full-width panels, 44px min touch targets.

---

### 4.2 Screen 2: Requester Dashboard (`/dashboard`)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ TokTickIT   [Dashboard]  [My Tickets]  [Create Ticket]       [JA] Requester │
├─────────────────────────────────────────────────────────────────────────────┤
│ Welcome, Jennifer!                                              [⟳ Refresh] │
│ Here's the latest on your requests.                                         │
│                                                                             │
│ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐         │
│ │My Open Tickets││ In Progress  │ │   Resolved   │ │    Closed    │         │
│ │      3       │ │      2       │ │      5       │ │      12      │         │
│ │   View all   │ │   View all   │ │   View all   │ │   View all   │         │
│ └──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘         │
│                                                                             │
│ ┌───────────────────────────────────────┐  ┌──────────────────────────────┐ │
│ │ My Recent Tickets            View all │  │ Quick Actions                │ │
│ ├───────────────────────────────────────┤  ├──────────────────────────────┤ │
│ │ TKT-2026-000234 [In Progress] May 12 │  │ [ + Create Ticket ]          │ │
│ │ Laptop battery drains quickly         │  │   Submit a new request       │ │
│ ├───────────────────────────────────────┤  │                              │ │
│ │ TKT-2026-000222 [Resolved]    May 11 │  │ [ 📋 View My Tickets ]       │ │
│ │ Request software access               │  │   Track existing requests    │ │
│ └───────────────────────────────────────┘  └──────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### Layout Specifications:
- **Ownership Guarantee**: Strictly displays tickets and metrics owned by the authenticated Requester (`ticket.requesterId === authUser.id`).
- **Metric Cards Row**:
  - 4 cards: `My Open Tickets` (all active statuses), `In Progress`, `Resolved`, `Closed`.
  - Accessible drill-down links navigating to `/tickets` filtered by respective status.
- **Recent Tickets List**:
  - Displays top 5 recent owned tickets with ID, title, status badge, and last updated timestamp.
- **Quick Actions Panel**:
  - Large button: "+ Create Ticket" (routes to `/tickets/create`).
  - Button: "View My Tickets" (routes to `/tickets`).

---

### 4.3 Screen 3: Actions Taken on Ticket Detail

#### 4.3.1 Staff & Admin View (Interactive Management)
The Actions Taken component sits on the Ticket Detail screen immediately below the ticket metadata grid and above the comments/notes tabs:

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ Actions Taken (3)                                       [+ Log Action Taken]│
├─────────────────────────────────────────────────────────────────────────────┤
│ Date/Time        Description        Result       Follow-Up   Performed By   │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2026-05-12 10:15 Replaced battery   Passed test  No          Sarah Chen     │
│                  Ref: img_001.jpg                            [Edit]         │
├─────────────────────────────────────────────────────────────────────────────┤
│ 2026-05-11 14:30 Diagnostics run    Battery degraded Yes      Michael Adams │
│                  Follow-up Note: Order replacement part      [Edit]         │
└─────────────────────────────────────────────────────────────────────────────┘
```

#### 4.3.2 Log / Edit Action Taken Modal Dialog
When clicking "+ Log Action Taken" or "[Edit]":
- **Modal Container**: Accessible modal dialog (`role="dialog"`, `aria-modal="true"`), max-width 600px.
- **Form Fields**:
  1. `Performed By` (Read-only input): Auto-populated with current authenticated user's name (`--color-field-readonly` background `#F0F4F1`).
  2. `Action Date/Time` (Required `*`): Datetime-local picker, defaulting to current time. Cannot exceed current datetime.
  3. `Action Description` (Required `*`): Textarea (min 1, max 2000 chars), placeholder: *"Describe diagnostic steps, repairs, or procedures performed..."*. Live character counter.
  4. `Result` (Required `*`): Textarea (min 1, max 2000 chars), placeholder: *"Describe the observed outcome, system response, or test result..."*. Live character counter.
  5. `Follow-Up Required?` (Checkbox / Toggle):
     - Unchecked: `Follow-up Note` field is hidden or disabled.
     - Checked: `Follow-up Note` textarea animates into view with red required asterisk `*`.
  6. `Follow-up Note` (Conditionally Required `*`): Textarea (1–1000 chars). Submitting while blank when toggle is checked displays inline error: *"Follow-up note is required when follow-up is requested."*
  7. `Attachment Notes` (Optional): Text input (max 500 chars), placeholder: *"e.g. Look for diagnostics.pdf in Attachments tab"*.
- **Actions**:
  - Primary button: "Save Action Taken" (with loading spinner).
  - Secondary button: "Cancel" (dismisses modal).

#### 4.3.3 Requester View (Read-Only)
- Requesters see all logged Actions Taken under their ticket.
- Rendered in a clean, read-only card or table layout.
- No "+ Log Action Taken" button; no "[Edit]" action links.
- Clearly displays Action Date/Time, Description, Result, Performed by, and Follow-Up information.

---

### 4.4 Screen 4: Ticket Workflow & Concurrency Conflict UI

#### 4.4.1 Dynamic Status Transition Dropdown
On Staff Ticket Detail, the status selector dynamically lists **only permitted next statuses** according to the transition matrix (`BR-10`):
- E.g. When status is `NEW`: options are strictly `[ NEW (current), Open, In Progress, Cancelled ]`.
- Moving to `RESOLVED` or `CLOSED` opens a mandatory `Resolution Summary` input prompt (min 5 chars).

#### 4.4.2 Advisory Resolution Banner (Staff View)
When a Requester has triggered "Problem Appears Resolved":
- An informational banner appears at the top of Staff Ticket Detail:
  - Background `#FFF8E1`, Border `1px solid #FFE082`, Text `#F57F17`.
  - Icon: Info circle.
  - Text: *"The requester indicated this problem appears resolved on May 12, 10:45 AM. Please verify the work and formally update the ticket status."*

#### 4.4.3 Stale-Update 409 Conflict Banner & Recovery
When an IT Staff user attempts to change status or priority on a ticket that was concurrently updated by another user:
- Backend responds with `409 Conflict` (`code: "STALE_UPDATE"`).
- UI displays a prominent conflict banner at the top of the detail panel:
  - Background `#FFF8E1`, Border `2px solid #FFA000`, Text `#5D4037`.
  - Text: *"⚠️ Update Conflict: Another staff member has updated this ticket while you were viewing it. Your changes were not saved to prevent overwriting their work."*
  - Action Button: **"Reload Latest Ticket Data"** (fetches fresh ticket state, updates status badge and version counter, and preserves any unsaved draft comments/notes).

---

## 5. Screen Modes and User Feedback Specifications

| Mode / Feedback State | Visual Representation | Component Behavior |
| :--- | :--- | :--- |
| **Loading / Busy** | Centered Zen Green spinner (`border-top-color: #006B3C`) or button spinner | Submission buttons disabled, prevents double clicks (`FR-17`). |
| **Field Validation Error** | Red border (`#D32F2F`) on input, red error text directly below control | Triggered on blur or submit; clears dynamically on input keystroke. |
| **Form Error Banner** | Pale red banner (`#FDECEA`, border `#D32F2F`, text `#D32F2F`) at top of form | Displays server error message; retains user-entered inputs (`FR-18`). |
| **409 Conflict Alert** | Amber banner (`#FFF8E1`, border `#FFA000`, text `#5D4037`) with reload button | Informs user of concurrent modification; offers safe reload trigger. |
| **Success Toast / Banner** | Pale green banner (`#EAF6EF`, border `#2E7D32`, text `#1B5E20`) | Auto-dismisses after 4 seconds or on user close. |
| **Empty State** | Quiet card with empty illustration and text (e.g. *"No Actions Taken yet"*) | Displays clear helper text and "+ Log Action Taken" call to action. |
| **Forbidden (403)** | Zen Green error card with shield/lock icon | *"You do not have permission to perform this action or view this resource."* |
| **Server Down / Offline** | Full-width amber/red alert banner | *"Unable to connect to TokTickIT server. Please check your network connection."* |

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

## 7. Completed Visual & Responsive Checklist (Handout §14 Part 9)

| Checklist Category | Inspection Criterion | Specification & Implementation Evidence | Verification Status |
| :--- | :--- | :--- | :---: |
| **Design Consistency** | Uniform Zen Green token palette across all views | Primary `#006B3C`, Secondary `#0B7A46`, Pale `#EAF6EF`, Quiet `#F5F7F6`. No ad-hoc generic colors. | **Verified** |
| **Role Navigation** | Navigation strictly matches authenticated role | Requester sees Dashboard, My Tickets, Create; Staff sees Dashboard, Queue, Create; Admin sees Dashboard, Queue, User Mgmt. | **Verified** |
| **Role Header Badges** | User profile shows current authenticated identity | Top right shows User Name, Role Badge (Requester / IT Staff / Admin), and Logout button. | **Verified** |
| **Status Badges** | Consistent color-coded badges for all 8 statuses | New (Blue), Open (Green), In Progress (Amber), Waiting (Orange), Resolved (Emerald), Closed (Slate), Reopened (Purple), Cancelled (Red). | **Verified** |
| **Priority Badges** | Distinct visual badges for Requested & IT Priority | Low (Green), Medium (Amber), High (Orange), Urgent (Bold Red). | **Verified** |
| **Editable vs Read-Only** | Clear visual distinction between field states | Editable fields have white background with neutral border; Read-only fields shaded with `#F0F4F1`. | **Verified** |
| **Actions Taken Component** | Integrated under Ticket Detail with role security | Staff/Admin see interactive table & modal; Requesters see read-only feed without edit controls. | **Verified** |
| **Follow-Up Conditional UI** | Follow-up note required only when toggle checked | Dynamic DOM expansion; red asterisk and mandatory validation applied only if `followUpRequired = true`. | **Verified** |
| **Resolution Summary** | Visible to requester on resolved/closed tickets | Input field for IT Staff in detail view; rendered as styled summary card for Requester. | **Verified** |
| **Conflict 409 Feedback** | Clear feedback when concurrent write is rejected | Amber conflict alert banner with "Reload Latest Ticket Data" action button preventing data loss. | **Verified** |
| **Validation Placement** | Field errors rendered directly beneath controls | Red text (`#D32F2F`) below invalid inputs; red asterisk (`*`) on required labels. | **Verified** |
| **Focus Rings** | High-contrast WCAG AA accessible focus rings | `2px solid #0B7A46` with `outline-offset: 2px` across all interactive elements. | **Verified** |
| **Touch Targets** | Mobile buttons and interactive elements >= 44px | Mobile buttons and form inputs maintain `min-height: 44px` for touch accessibility. | **Verified** |
| **Clipping & Overlap** | Zero text clipping, truncation, or element overlap | Long descriptions wrap cleanly; cards expand without clipping metadata. | **Verified** |
| **Horizontal Overflow** | Zero horizontal scrollbar on any viewport | Verified across Mobile (375px), Tablet (768px), and Desktop (1280px); `overflow-x: hidden`. | **Verified** |
| **Screenshot Evidence** | Captured across Desktop, Tablet, and Mobile | Organized in `artifacts/lab-04/screenshots/` under `staff-dashboard/`, `requester-dashboard/`, and `actions-taken/`. | **Verified** |
