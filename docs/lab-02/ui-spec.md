# Zen Green UI Specification (Lab 2)

## 1. Visual Design Tokens & Color Palette

The TokTickIT interface implements the **Zen Green Theme** visual design system. All screens and components must strictly use the following CSS color tokens:

| Token Name | Hex Code | Purpose & Usage |
| :--- | :--- | :--- |
| `--color-primary-green` | `#006B3C` | Application header, primary submission buttons, hero titles, strong emphasis. |
| `--color-secondary-green` | `#0B7A46` | Active tab indicators, focus accents, interactive links, hover states. |
| `--color-pale-green` | `#EAF6EF` | Selected item highlights, success badges, subtle section container fills. |
| `--color-bg-quiet` | `#F5F7F6` | Main page background (quiet near-white). |
| `--color-surface-card` | `#FFFFFF` | Card containers, modal backgrounds, data tables. |
| `--color-surface-border` | `#E0E6E2` | Subtle neutral border for cards and containers. |
| `--color-text-main` | `#1A2E26` | Main body text (dark charcoal-green for high contrast reading). |
| `--color-text-muted` | `#5A6B63` | Subtitles, helper text, table column headers. |
| `--color-field-editable` | `#FFFFFF` | Editable input background with `#CCCCCC` default border. |
| `--color-field-readonly` | `#F0F4F1` | Soft gray-green shading for read-only fields. |
| `--color-error-text` | `#D32F2F` | Validation error text, red asterisks, error banners. |
| `--color-error-bg` | `#FDECEA` | Validation error callout background. |
| `--color-warning-badge` | `#F57C00` | Amber badge for pending states or amber callouts. |
| `--color-success-badge` | `#2E7D32` | Green confirmation callouts and resolved status badges. |

---

## 2. Typography & Spacing System

- **Font Family**: `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif`
- **Heading Scale**:
  - `H1 (Page Header)`: 24px (1.5rem), Semi-Bold (600), line-height 1.3
  - `H2 (Section Header)`: 18px (1.125rem), Semi-Bold (600), line-height 1.4
  - `H3 (Card / Modal Header)`: 16px (1rem), Medium (500), line-height 1.4
- **Body & Controls**:
  - `Body Text`: 14px (0.875rem), Regular (400), line-height 1.5
  - `Form Labels`: 14px (0.875rem), Medium (500), text-color `#1A2E26`
  - `Small / Helper Text`: 12px (0.75rem), Regular (400), text-color `#5A6B63`
- **Spacing Scale**: 4px, 8px, 12px, 16px, 24px, 32px, 48px.

---

## 3. Component Rules & Interaction Specifications

### 3.1 Form Input Fields
- **Label Placement**: Always above controls with 6px bottom margin.
- **Required Fields**: Marked with a red asterisk (`*`, color `#D32F2F`) adjacent to label text.
- **Input Height**: Standard 40px height with 12px horizontal padding.
- **Multiline Textarea**: Default height 120px, vertically resizable only when it doesn't break container layout.
- **Validation Messages**: Rendered immediately below the invalid input control in 12px red text with an error icon (`#D32F2F`).
- **Read-Only Controls**: Shaded with `--color-field-readonly` (`#F0F4F1`), border `#D0D8D3`, cursor `not-allowed`.

### 3.2 Button Hierarchy & States
1. **Primary Button**:
   - Styling: Background `--color-primary-green` (`#006B3C`), text white, border none, border-radius 6px.
   - Hover: Background `--color-secondary-green` (`#0B7A46`).
2. **Secondary Button**:
   - Styling: Background transparent, border 1px solid `--color-secondary-green` (`#0B7A46`), text `--color-secondary-green`.
   - Hover: Background `--color-pale-green` (`#EAF6EF`).
3. **Destructive / Soft-Remove Button**:
   - Styling: Background transparent, text `#D32F2F`, border 1px solid `#D32F2F`.
   - Hover: Background `#FDECEA`.
4. **Busy / Loading State**:
   - Disabled click interactions (`pointer-events: none`).
   - Button text displays loading indicator/spinner alongside label (e.g. "Submitting...").
5. **Disabled State**:
   - Background `#E0E0E0`, text `#9E9E9E`, cursor `not-allowed`.

---

## 4. Screen Layouts & Detailed Mockup Specifications

### 4.1 Development Requester Selection Screen ("Simulated Login")
- **Layout**: Centered card container (max-width 480px) on quiet background (`#F5F7F6`).
- **Header**: TokTickIT logo with user identity icon.
- **Notice Callout**: Amber/Info alert box explaining: *"Select a Development Requester to test requester-specific ticket behavior. This is a testing mechanism for Lab 2, not secure authentication."*
- **Controls**:
  - `Development Requester` dropdown listing active requesters loaded from PostgreSQL database.
  - `Continue` primary button establishing current testing context.
- **States**:
  - `Loading State`: Skeleton spinner while fetching requesters.
  - `Empty State`: Alert message if no active requesters exist.
  - `Error State`: Red warning callout if API connection fails.

### 4.2 Application Header & Navigation Shell
- **Top Navigation Bar**: Background `--color-primary-green` (`#006B3C`), height 60px, white text.
- **Brand**: TokTickIT title with clock icon on left.
- **Nav Links**: "My Tickets" and "Create Ticket" links. Active link indicated by background highlight `#0B7A46` and bottom border accent.
- **User Identity Badge**: Right side displays selected requester name with user avatar icon, and a "Change Requester" action button to return to selection screen.

### 4.3 Create Ticket Screen Layout
- **Container**: Centered card max-width 900px on `#F5F7F6` background.
- **System-Generated Header Section**:
  - Read-only fields shaded `#F0F4F1`: `Ticket No.` (displays *"Generated upon submission"*), `Ticket Date` (Current Date), `Status` (`NEW` green badge).
- **Classification Section**:
  - `Category` dropdown (Required `*`): Account and Access, Hardware, Software, Network.
  - `Related System` dropdown (Required `*`): Dependent on active database list.
  - `Requested Priority` radio/select (Required `*`): LOW, MEDIUM (Default), HIGH, URGENT.
- **Content Section**:
  - `Ticket Summary` input (Required `*`): Min 5, Max 100 characters, placeholder *"Brief description of issue"*.
  - `Description` textarea (Required `*`): Min 10, Max 2000 characters.
- **Attachments Dropzone**:
  - Drag-and-drop zone with dotted border `#0B7A46` on `#EAF6EF` background.
  - Allowed text: *"Drag & drop files here or click to browse (JPG, PNG, WEBP, PDF up to 5MB, max 5 active attachments)"*.
  - Attachment list preview with remove button prior to submission.
- **Actions Bar**:
  - `Cancel` secondary button.
  - `Submit Ticket` primary green button.

### 4.4 My Tickets Dashboard Screen Layout
- **Header**: Page title "My Tickets" with "+ Create Ticket" primary button on top right.
- **Filter & Search Bar**:
  - Search input with magnifying glass icon: matches ticket number or summary.
  - `Category` dropdown filter (All Categories default).
  - `Requested Priority` filter.
  - `Current Status` filter.
  - `Clear Filters` text button.
- **Data Table View (Desktop >=992px)**:
  - Columns: `Ticket No.`, `Created Date`, `Summary`, `Category`, `Requested Priority`, `Current Status`, `Last Updated`.
  - Column headers support click-to-sort (ascending/descending arrow icons).
  - Hover row highlight `--color-pale-green` (`#EAF6EF`). Click row opens Ticket Detail.
- **Mobile Card View (<768px)**:
  - Table hidden; replaced by stacked ticket cards. Each card displays Ticket No. (top left), Status Badge (top right), Summary (bold), Category & Date (footer).
- **Pagination Controls**:
  - Bottom bar displaying *"Showing 1-10 of X tickets"*, with Previous, Page Number buttons, and Next.
- **Empty & No-Results States**:
  - `Empty State`: Illustrated callout *"No tickets submitted yet. Click 'Create Ticket' to start."*
  - `No-Results State`: Alert *"No tickets matched your search criteria. Try clearing filters."*

### 4.5 Requester Ticket Detail & Attachments Layout
- **Breadcrumb Navigation**: `My Tickets > Ticket Details` link to return to list.
- **Ticket Summary Header**: Ticket Number in large font with Status badge (`NEW`, `IN_PROGRESS`, etc.).
- **Read-Only Ticket Info Grid**:
  - 2-column or 4-column read-only metadata grid: `Requester Name`, `Ticket Date`, `Category`, `Related System`, `Requested Priority`, `Current Status`.
- **Description Box**: Full text box with soft border.
- **Attachment Management Card**:
  - Card title: *"Attachments (X/5 active)"*.
  - `+ Add Attachment` secondary button (opens file picker if active attachments < 5).
  - Attachment List:
    - Active File Row: File icon, original filename, file size, upload timestamp, `[Download]` action link, `[Remove]` soft-delete button.
    - Soft-Removed File Row: Muted opacity (50%), file name strikethrough or grayed out, **"Removed"** red/gray badge, removal reason & timestamp display, download button disabled/hidden with tooltip *"This file was removed and cannot be downloaded."*
- **Soft-Removal Modal Dialog**:
  - Prompt: *"Remove Attachment"*
  - Text: *"Please state the reason for removing this attachment (required for audit logging):"*
  - Input: Mandatory textarea (min 3 chars).
  - Actions: `Cancel` and `Confirm Removal` (destructive red button).
- **Scope Boundary Notice**: Explicitly excludes public comments, internal notes, or staff workflow controls.

### 4.6 Notification Banners (Error, Success, Warning)
- **Placement**: Fixed-position banner at the top of the main content area, below the navigation header. Stacks vertically if multiple banners are active.
- **Auto-Dismiss**: Success banners auto-dismiss after 5 seconds. Error and warning banners persist until manually dismissed via close button.
- **Error Banner (Network / Server Failure)**:
  - Background: `--color-error-bg` (`#FDECEA`), left border 4px solid `--color-error-text` (`#D32F2F`).
  - Icon: Error circle icon in `#D32F2F`. Text in `--color-text-main` (`#1A2E26`).
  - Message example: *"Unable to reach the server. Please check your connection and try again."*
  - Behavior: Form inputs are preserved; no page redirect or form reset occurs on network failure.
- **Success Banner (Confirmation)**:
  - Background: `--color-pale-green` (`#EAF6EF`), left border 4px solid `--color-success-badge` (`#2E7D32`).
  - Icon: Checkmark circle icon in `#2E7D32`. Text in `--color-text-main`.
  - Message example: *"Ticket TKT-2026-001234 created successfully."*
- **Warning Banner (Partial Failure)**:
  - Background: `#FFF3E0`, left border 4px solid `--color-warning-badge` (`#F57C00`).
  - Icon: Warning triangle in `#F57C00`. Text in `--color-text-main`.
  - Message example: *"Ticket created, but 1 attachment failed to upload."*
- **Animation**: Slide-in from top with `200ms ease-out` transition. Fade-out on dismiss with `150ms ease-in`.

---

## 5. Responsive Viewport Rules

| Viewport Category | Width Constraint | Layout Behavior |
| :--- | :--- | :--- |
| **Desktop** | `>= 992px` | Multi-column grid form (2 columns for selects/meta); desktop interactive data table with full headers; centered container max 1140px. |
| **Tablet** | `768px - 991px` | Two-column stacked form; summary and description take 100% width; data table condenses padding. |
| **Mobile** | `< 768px` | Single-column stacked fields; data table transforms into mobile card list view; all buttons expanded to touch width (min 44px height); 0 horizontal page overflow. |

---

## 6. Accessibility & Visual Inspection Checklist

- [x] **Color Contrast**: All text elements satisfy WCAG AA contrast ratio (>= 4.5:1 against background).
- [x] **Keyboard Navigation**: Form controls, custom dropdowns, buttons, and modal dialogs are fully navigable via `Tab` and executable via `Enter` / `Space`.
- [x] **Focus Ring**: Clear visible focus outlines (`2px solid #0B7A46`) on all active input elements.
- [x] **Screen Reader Support**: All icons carry `aria-label` attributes or decorative `aria-hidden="true"`.
- [x] **Screenshot Evidence**: Verified screenshots saved under `artifacts/lab-02/screenshots/`:
  - `artifacts/lab-02/screenshots/create-ticket/`
  - `artifacts/lab-02/screenshots/my-tickets/`
  - `artifacts/lab-02/screenshots/ticket-detail/`
