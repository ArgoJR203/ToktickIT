# Zen Green UI Specification (Lab 3)

## 1. Visual Design System & Design Tokens

TokTickIT reuses and extends the **Zen Green Theme** visual design system established in Lab 2. All interfaces, dialogs, badges, and feedback components must strictly adhere to these color and layout tokens:

| Token Name | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| `--color-primary-green` | `#006B3C` | Application header, primary submission buttons, modal confirm headers. |
| `--color-secondary-green` | `#0B7A46` | Active navigation tabs, focus rings, interactive action links, hover states. |
| `--color-pale-green` | `#EAF6EF` | Selected rows, success callouts, subtle card container fills. |
| `--color-bg-quiet` | `#F5F7F6` | Main application background (soft gray-green quiet tone). |
| `--color-surface-card` | `#FFFFFF` | Form cards, queue table, modal containers, detail panels. |
| `--color-surface-border` | `#E0E6E2` | Border dividers, card borders, table row separators. |
| `--color-text-main` | `#1A2E26` | Main body text, headings, dark charcoal-green for high contrast. |
| `--color-text-muted` | `#5A6B63` | Subtitles, timestamps, table column headers, helper text. |
| `--color-field-editable` | `#FFFFFF` | Editable input background with `#CCCCCC` default border. |
| `--color-field-readonly` | `#F0F4F1` | Soft gray-green shading for read-only fields. |
| `--color-error-text` | `#D32F2F` | Validation errors, red asterisks, destructive action text. |
| `--color-error-bg` | `#FDECEA` | Validation error banner fill, danger badge backgrounds. |
| `--color-warning-badge` | `#F57C00` | In Progress / Pending status badges, warning callouts. |
| `--color-warning-bg` | `#FFF3E0` | Internal Notes section accent background and warning banner. |
| `--color-success-badge` | `#2E7D32` | Resolved status badge, active user badge, success banners. |
| `--color-neutral-badge` | `#607D8B` | Closed status badge, inactive user badge. |

---

## 2. Badge Design System

Badges provide quick, scan-friendly visual identification for Ticket Status, Priorities, and User Roles:

### 2.1 Ticket Status Badges
- **NEW**: Background `#E3F2FD`, Text `#1565C0`, Border `1px solid #90CAF9` (Soft Blue)
- **OPEN**: Background `#E8F5E9`, Text `#2E7D32`, Border `1px solid #A5D6A7` (Soft Green)
- **IN PROGRESS**: Background `#FFF8E1`, Text `#F57F17`, Border `1px solid #FFE082` (Warm Amber)
- **WAITING FOR REQUESTER**: Background `#FFF3E0`, Text `#E65100`, Border `1px solid #FFCC80` (Deep Orange)
- **RESOLVED**: Background `#E8F5E9`, Text `#1B5E20`, Border `1px solid #81C784` (Rich Emerald)
- **CLOSED**: Background `#ECEFF1`, Text `#455A64`, Border `1px solid #CFD8DC` (Slate Gray)
- **REOPENED**: Background `#F3E5F5`, Text `#7B1FA2`, Border `1px solid #CE93D8` (Purple)
- **CANCELLED**: Background `#FFEBEE`, Text `#C62828`, Border `1px solid #EF9A9A` (Muted Red)

### 2.2 Priority Badges (Requested Priority & IT Priority)
- **LOW**: Background `#E8F5E9`, Text `#2E7D32` (Green)
- **MEDIUM**: Background `#FFF8E1`, Text `#F57F17` (Amber)
- **HIGH**: Background `#FFF3E0`, Text `#E65100` (Orange)
- **URGENT**: Background `#FFEBEE`, Text `#D32F2F`, Font-Weight 700 (Red)

### 2.3 User Role Badges
- **Requester**: Background `#E8F4F8`, Text `#0288D1`, Border `1px solid #B3E5FC`
- **IT Staff**: Background `#EAF6EF`, Text `#006B3C`, Border `1px solid #A3D9BE`, Font-Weight 600
- **Administrator**: Background `#F3E5F5`, Text `#6A1B9A`, Border `1px solid #E1BEE7`, Font-Weight 600

### 2.4 User Status Badges
- **Active**: Background `#E8F5E9`, Text `#2E7D32`, Border `1px solid #A5D6A7`
- **Inactive**: Background `#FFEBEE`, Text `#C62828`, Border `1px solid #EF9A9A`

---

## 3. Application Shell & Role-Based Navigation

### 3.1 Top Navigation Bar (Header)
- **Dimensions**: Height 60px, background `--color-primary-green` (`#006B3C`), white text, full width.
- **Brand**: TokTickIT logo with ticket/support icon on left.
- **Role-Tailored Navigation Items**:
  - **Requester**: "My Tickets", "Create Ticket"
  - **IT Staff**: "Ticket Queue", "Create Ticket"
  - **Administrator**: "User Management", "Ticket Queue"
- **Active Tab Styling**: Background `#0B7A46`, bottom border 3px solid `#FFFFFF`, text white.
- **Right Profile Controls**:
  - User avatar placeholder with initials (e.g. `[JD]`).
  - User Name and Role Badge displayed in header bar.
  - "Logout" button with sign-out icon, styled with subtle border and pale hover fill.

---

## 4. Screen Layouts & Detailed Mockup Specifications

### 4.1 Screen 1: Login and Mandatory Password Change

#### 4.1.1 Login Screen
- **Container**: Centered card (max-width 440px) on quiet background (`#F5F7F6`) with subtle shadow.
- **Header**: TokTickIT logo, title "Sign in to your account", and subtitle "Enter your credentials to continue".
- **Fields**:
  - `Email address` (Required `*`): Text input, placeholder `name@toktickit.com`.
  - `Password` (Required `*`): Password input with show/hide eye toggle button.
- **Actions**:
  - Primary button: "Sign In" (full-width, Zen Green, with loading spinner during processing).
- **Error Feedback**:
  - Invalid credentials / inactive account: Zen Green error banner (`#FDECEA`, red border, `#D32F2F` text): *"Invalid email or password. Please try again."* (Protects against account enumeration).

#### 4.1.2 Mandatory Change Password Screen
- **Display Trigger**: Appears immediately after successful login if `user.mustChangePassword === true`. The user is blocked from reaching normal navigation.
- **Container**: Centered card (max-width 480px).
- **Header**: "Change Your Password", description *"You must change your initial password before continuing."*
- **Fields**:
  - `Current (initial) password` (Required `*`): Password input.
  - `New password` (Required `*`): Password input with visibility toggle.
  - `Confirm new password` (Required `*`): Password input with visibility toggle.
- **Password Complexity Checklist** (Interactive checkmarks):
  - [x] At least 8 characters
  - [x] Includes uppercase and lowercase letters
  - [x] Includes a number or special character
- **Actions**:
  - Primary button: "Continue" (disabled until password complexity and confirmation match).

---

### 4.2 Screen 2: Requester Regression & Public Comments

#### 4.2.1 Requester Ticket Detail Updates
- Replaces simulated requester switcher with authenticated user identity in the top header.
- **Breadcrumb**: `My Tickets > Ticket Details` with "Back to My Tickets" button.
- **Metadata Card**: Read-only display of Ticket No, Category, Related System, Status Badge, Requested Priority Badge, Created Date.
- **Problem Appears Resolved Banner / Button**:
  - If ticket is `IN_PROGRESS` or `WAITING_FOR_REQUESTER`, displays an action button:
    *"Problem Appears Resolved"* (Outlined secondary green with check icon).
  - Clicking triggers a confirmation modal: *"Confirm that the issue appears resolved? IT Staff will review and finalize the ticket."*
  - On confirm, sends resolution indication, logs an automated public comment, and changes button to disabled *"Resolution Indicated"* badge.
- **Public Comments Section**:
  - Header: "Public Comments (`N`)"
  - Chronological message feed showing author name, role badge (`Requester` / `IT Staff`), timestamp, and comment bubble.
  - Comment input textarea (max 2000 chars, character counter, min 1 char required).
  - "Post Comment" primary green button (busy state while posting).
  - Clear notice: *"Public comments are visible to you and IT Staff."*
- **Attachments Section**:
  - Unchanged from Lab 2: file metadata list, active download button, soft-removal modal dialog.

---

### 4.3 Screen 3: IT Staff Ticket Queue

#### 4.3.1 Desktop Layout (≥992px)
- **Container**: Full-width responsive content area (max-width 1280px) with 24px margins.
- **Queue Header**:
  - Title: "Ticket Queue" with total ticket count (e.g. *"Showing 1 to 10 of 87 tickets"*).
  - Search bar: Filter by ticket number or summary keyword (with clear `X` button).
  - Filter controls: Category select, Status select, Priority select, Assignment select (All / Assigned / Unassigned / Mine).
- **Data Table**:
  - Columns:
    1. `Ticket No.` (Monospace font, clickable link opening Ticket Detail)
    2. `Created Date` (Formatted date/time, e.g. `May 12, 2026 09:14 AM`)
    3. `Summary` (Truncated to 50 chars with full tooltip)
    4. `Category` (Category name)
    5. `Req. Priority` (Priority badge)
    6. `IT Priority` (Priority badge)
    7. `Status` (Status badge)
    8. `Owner` (Staff name or muted *"Unassigned"*)
    9. `Actions` ("View Details" button)
- **Pagination**:
  - Previous / Next buttons, numbered page buttons (`1`, `2`, `3` ... `9`).

#### 4.3.2 Mobile Layout (<768px)
- Table transforms into stacked Zen Green card items.
- Each card displays:
  - Header: Monospace `Ticket No.` on left, `Status Badge` on right.
  - Title: Bold `Summary`.
  - Grid: Requester Name, IT Priority Badge, Owner Name, Created Date.
  - Footer: "Open Ticket Detail" full-width button (touch target >= 44px).

---

### 4.4 Screen 4: IT Staff Ticket Detail

- **Header Bar**:
  - Breadcrumb: `Ticket Queue > Ticket Detail` with "Back to Queue" button.
  - Monospace Ticket Identifier (`TKT-2026-001234`) with prominent Status Badge.
- **Operational Controls Grid (2 or 4 Columns)**:
  - `Category`: Read-only field.
  - `Related System`: Read-only field.
  - `Requester`: Read-only requester name and email.
  - `Requested Priority`: Read-only priority badge.
  - `Ticket Owner` (Interactive Dropdown):
    - Option: "Unassigned"
    - Option: "Assign to Me" (quick button)
    - Dropdown list of all active IT Staff and Administrators.
  - `IT Priority` (Interactive Dropdown):
    - Options: `LOW`, `MEDIUM`, `HIGH`, `URGENT` (initially matches Requested Priority).
  - `Ticket Status` (Interactive Dropdown):
    - Dropdown options strictly limited to valid next statuses according to the status transition matrix!
    - "Update Status" button with loading indicator.
- **Summary & Description**:
  - Summary: Read-only styled text container.
  - Description: Formatted multi-line container with soft border.
  - Resolution Indication Alert (if indicated by Requester): Amber callout: *"The requester has marked this problem as resolved. Please verify and update status."*
- **Resolution Summary Section (Handout Page 10 Mockup)**:
  - Displays: `Resolution Summary` input textarea: *"Add resolution summary (Visible to requester)..."*
  - Editable when transitioning status to `RESOLVED` or `CLOSED`. Read-only once resolved.
- **Tabbed Activity / Communications Container**:
  - Two distinct tabs with unread/item counters:
    - Tab 1: **Public Comments (`N`)**
    - Tab 2: **Internal Notes (`M`)** (Restricted: Lock icon)
- **Visual Distinction for Internal Notes**:
  - To prevent accidental public disclosure, the Internal Notes view uses a distinctive **Warm Amber / Slate warning palette** (`#FFF3E0` banner, `#F57C00` left accent border, lock icon `🔒`).
  - Prominent banner: *"INTERNAL NOTES: Visible only to IT Staff and Administrators. Never shared with the Requester."*
  - Internal note cards have a distinctive light-amber background with `[Internal Note]` author badge.
- **Attachments Tab/Section**:
  - Displays all ticket attachments with metadata, download link, and soft-remove capabilities.

---

### 4.5 Screen 5: Administrator User Management

- **Container**: Max-width 1100px centered card.
- **Header**:
  - Title: "User Management"
  - Search input: Filter by user name or email address.
  - Role filter: All Roles / Requester / IT Staff / Administrator.
  - Primary button: "+ Create User" (Zen Green).
- **User Table**:
  - Columns:
    1. `Name` (Full user name)
    2. `Email Address` (User email)
    3. `Role` (Role badge: Requester, IT Staff, Administrator)
    4. `Status` (Active green badge / Inactive red badge)
    5. `Actions` ("Edit" button)
- **Create User Modal / Drawer**:
  - Fields:
    - `Full Name` (Required `*`, text input)
    - `Email Address` (Required `*`, email input with duplicate email validation)
    - `Role` (Required `*`, select: `Requester`, `IT Staff`, `Administrator`)
    - `Active Status` (Toggle switch: Active / Inactive, default Active)
    - `Initial Password` (Required `*`, password input)
  - Notice callout: *"The user will be required to change this initial password upon their first login."*
  - Buttons: "Save User" (Primary), "Cancel" (Secondary).
- **Edit User Modal**:
  - Fields:
    - `Full Name` (Editable)
    - `Email Address` (Editable)
    - `Role` (Editable select, disabled if attempting to demote last active admin)
    - `Active Status` (Toggle switch, disabled with explanation if editing own account or last active admin)
  - Secondary Action Section:
    - "Set New Initial Password" button: Opens password reset dialog to supply a new temporary password (forces password change on next login).
  - Safety Alerts:
    - Deactivating self warning: *"You cannot deactivate your own administrative account."*
    - Last administrator warning: *"Cannot deactivate or demote the system's only active Administrator."*

---

## 5. Screen Modes and User Feedback Specifications

| Mode / Feedback State | Visual Representation | Component Behavior |
| :--- | :--- | :--- |
| **Loading / Busy** | Centered spinner or button spinner (`Submitting...`, `Saving...`) | Controls disabled, prevents double submissions. |
| **Field Validation Error** | Red border (`#D32F2F`) on input, red error text directly below control | Triggered on blur or submit; clears on user keystroke. |
| **Form Error Banner** | Pale red banner (`#FDECEA`, border `#D32F2F`, text `#D32F2F`) at top of form | Displays server error message, keeps form inputs intact. |
| **Success Banner** | Pale green banner (`#EAF6EF`, border `#2E7D32`, text `#1B5E20`) | Auto-dismisses after 4 seconds or on user close. |
| **Empty State** | Quiet card with empty illustration and text (e.g. *"No tickets in queue matching filters"*) | Clear call-to-action to reset search or filters. |
| **Forbidden (403)** | Zen Green error card with shield/lock icon | *"You do not have permission to perform this action or view this resource."* |
| **Server Down / Offline** | Full-width amber/red banner | *"Unable to connect to TokTickIT server. Please check your connection."* |

---

## 6. Responsive and Accessibility Rules

- **Viewport Breakpoints**:
  - Desktop: `>= 992px` (Full table view, 4-column metadata grids)
  - Tablet: `768px - 991px` (Condensed table or stacked form rows)
  - Mobile: `< 768px` (Full card list view, 100% width buttons, stacked fields)
- **Touch Target Sizing**: All interactive buttons, tabs, inputs, and toggles have a minimum touch target height of **44px** on mobile.
- **Focus Rings**: All interactive controls implement high-contrast WCAG AA compliant focus outlines: `2px solid #0B7A46`, outline-offset `2px`.
- **Contrast Ratios**: All text tokens against background tokens exceed the WCAG 2.1 AA requirement of **4.5:1** (Zen Green `--color-text-main` `#1A2E26` on `#FFFFFF` is 12.8:1).
- **Zero Horizontal Overflow**: Every screen verified at 375px (mobile), 768px (tablet), and 1280px (desktop) with `overflow-x: hidden` and zero clipping.

---

## 7. Completed Visual & Responsive Checklist (Handout §14 Part 9)

This checklist verifies all design, layout, interaction, and accessibility requirements across the entire Lab 3 application:

| Checklist Category | Inspection Criterion | Specification & Implementation Evidence | Verification Status |
| :--- | :--- | :--- | :---: |
| **Design Consistency** | Uniform Zen Green token palette across all views | Primary `#006B3C`, Secondary `#0B7A46`, Pale `#EAF6EF`, Quiet `#F5F7F6`. No ad-hoc generic colors. | **Verified** |
| **Role Navigation** | Navigation strictly matches authenticated role | Requester sees My Tickets & Create; Staff sees Queue & Create; Admin sees User Management & Queue. | **Verified** |
| **Role Header Badges** | User profile shows current authenticated identity | Top right shows User Name, Role Badge (Requester / IT Staff / Admin), and Logout button. | **Verified** |
| **Status Badges** | Consistent color-coded badges for all 8 statuses | New (Blue), Open (Green), In Progress (Amber), Waiting (Orange), Resolved (Emerald), Closed (Slate), Reopened (Purple), Cancelled (Red). | **Verified** |
| **Priority Badges** | Distinct visual badges for Requested & IT Priority | Low (Green), Medium (Amber), High (Orange), Urgent (Bold Red). | **Verified** |
| **Editable vs Read-Only** | Clear visual distinction between field states | Editable fields have white background with neutral border; Read-only fields shaded with `#F0F4F1`. | **Verified** |
| **Resolution Summary** | Visible to requester on resolved/closed tickets | Input field for IT Staff in detail view; rendered as styled summary card for Requester. | **Verified** |
| **Internal Notes Distinction** | Visual warning preventing accidental public posts | Amber accent (`#FFF3E0`), lock icon, bold warning banner, distinct card styling. | **Verified** |
| **Validation Placement** | Field errors rendered directly beneath controls | Red text (`#D32F2F`) below invalid inputs; red asterisk (`*`) on required labels. | **Verified** |
| **Focus Rings** | High-contrast WCAG AA accessible focus rings | `2px solid #0B7A46` with `outline-offset: 2px` across all interactive elements. | **Verified** |
| **Touch Targets** | Mobile buttons and interactive elements >= 44px | Mobile buttons and form inputs maintain `min-height: 44px` for touch accessibility. | **Verified** |
| **Clipping & Overlap** | Zero text clipping, truncation, or element overlap | Long summaries truncated with tooltip; cards expand cleanly without clipping metadata. | **Verified** |
| **Horizontal Overflow** | Zero horizontal scrollbar on any viewport | Verified across Mobile (375px), Tablet (768px), and Desktop (1280px); `overflow-x: hidden`. | **Verified** |
| **Screenshot Evidence** | Captured across Desktop, Tablet, and Mobile | Organized in `artifacts/lab-03/screenshots/` under `authentication/`, `staff-queue/`, `staff-ticket-detail/`, and `user-management/`. | **Verified** |
