# TokTickIT — IT Service Desk Platform

KMUTT CPE334 Full-Stack Enterprise IT Service Desk Web Application with Multi-Role Authentication, Role-Based Access Control (RBAC), Actions Taken Subsystem, Authoritative 8-Status Ticket Lifecycle State Machine, Resolution Gates, Atomic Optimistic Concurrency Control (OCC), Role-Appropriate Operational Dashboards, Public/Internal Communications, and User Administration.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [System Architecture & Roles](#system-architecture--roles)
- [Prerequisites](#prerequisites)
- [Step-by-Step Installation Guide](#step-by-step-installation-guide)
  - [Step 1: Clone the Repository](#step-1-clone-the-repository)
  - [Step 2: Install Dependencies](#step-2-install-dependencies)
  - [Step 3: Set Up PostgreSQL Database](#step-3-set-up-postgresql-database)
  - [Step 4: Configure Environment Variables](#step-4-configure-environment-variables)
  - [Step 5: Run Database Migrations & Seed Data](#step-5-run-database-migrations--seed-data)
  - [Step 6: Start the Application](#step-6-start-the-application)
- [Step-by-Step User Guide (How to Use)](#step-by-step-user-guide-how-to-use)
  - [Seeded Test Accounts & Credentials](#seeded-test-accounts--credentials)
  - [1. Authentication & First-Login Password Change Flow](#1-authentication--first-login-password-change-flow)
  - [2. Requester (End User) Workflow](#2-requester-end-user-workflow)
  - [3. IT Staff Workflow](#3-it-staff-workflow)
  - [4. Administrator Workflow](#4-administrator-workflow)
- [Core Business Rules & Architectural Mechanisms](#core-business-rules--architectural-mechanisms)
  - [Actions Taken Subsystem](#actions-taken-subsystem)
  - [8-Status Lifecycle State Machine & Resolution Gates](#8-status-lifecycle-state-machine--resolution-gates)
  - [Atomic Optimistic Concurrency Control (OCC)](#atomic-optimistic-concurrency-control-occ)
  - [Role-Appropriate Operational Dashboards](#role-appropriate-operational-dashboards)
- [Testing & Quality Assurance](#testing--quality-assurance)
  - [Summary Test Pyramid](#summary-test-pyramid)
  - [Running Unit & API Tests](#running-unit--api-tests)
  - [Running Playwright End-to-End Tests](#running-playwright-end-to-end-tests)
  - [Non-Functional & Quality Audits](#non-functional--quality-audits)
- [Project Directory Structure](#project-directory-structure)
- [Available Scripts Reference](#available-scripts-reference)
- [Troubleshooting & FAQ](#troubleshooting--faq)

---

## Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React 18 · TypeScript · Vite 6 · Bootstrap 5 | Single Page Application (SPA), Zen Green Design System, Responsive Desktop/Tablet/Mobile Layouts, WCAG AA Accessibility, Double-Click Submit Protection |
| **Backend** | Node.js · Express 4 · TypeScript | RESTful API, Middleware Pipelines, Role Guards, Multer File Handling, Bcrypt Password Hashing, JWT Authentication & Revocation Store |
| **Database** | PostgreSQL 16 · Prisma ORM 5.22 | Relational schema, automated migrations, version-tracked OCC, declarative foreign keys with cascade deletion, and transactional integrity |
| **Testing** | Vitest 2.1 · React Testing Library 16 · Supertest 7 · Playwright 1.49 | Multi-tier test pyramid: 253 Server Tests (34 Files), 133 Client Component Tests (21 Files), 5 Playwright E2E Suites, Migration/Rollback Verification, and 200ms Performance Benchmark |

---

## System Architecture & Roles

TokTickIT implements a strictly gated **Role-Based Access Control (RBAC)** architecture supporting three personas:

```
                  ┌──────────────────────────────────────────────┐
                  │                 TokTickIT                    │
                  └──────────────────────┬───────────────────────┘
                                         │
        ┌────────────────────────────────┼────────────────────────────────┐
        ▼                                ▼                                ▼
  ┌───────────┐                    ┌───────────┐                    ┌───────────┐
  │ REQUESTER │                    │ IT_STAFF  │                    │   ADMIN   │
  └─────┬─────┘                    └─────┬─────┘                    └─────┬─────┘
        │                                │                                │
        ├─ Requester Dashboard           ├─ IT Staff Dashboard            ├─ All IT Staff Capabilities
        │  (4 Cards + Recent Tickets)    │  (5 Cards + Priority/Status)   ├─ Dynamic Admin Statistics
        ├─ Create Support Ticket         ├─ Shared Ticket Queue           │  (Total/Active/By-Role Counts)
        ├─ View Own Tickets ("My Tkt")   ├─ Claim ("Assign to Me")        ├─ User Management Console
        ├─ Upload / Download Files       ├─ Adjust IT Priority            ├─ Create New User Accounts
        ├─ Public Comments Timeline      ├─ 8-Status Lifecycle Engine     ├─ Self-Deactivation Guard (Lab 3 BR-21)
        ├─ View Actions Taken            ├─ Action Completion Gate (BR-20)├─ Last Active Admin Guard (Lab 3 BR-22)
        │  (🔒 Strict Read-Only Mode)    ├─ Mandatory Resolution Summary  └─ Reset Initial Passwords
        └─ "Problem Appears Resolved"    ├─ Log/Edit Actions Taken           (Gated First-Login Setup)
           (Advisory Signal, BR-12)      ├─ Multi-Staff Collaboration
                                         ├─ Public Comments
                                         ├─ 🔒 Amber Internal Notes
                                         └─ Atomic OCC (409 Conflict)
```

---

## Prerequisites

Before starting, ensure you have the following installed on your machine:

1. **[Node.js](https://nodejs.org/)** v18.0.0 or higher (LTS recommended)
2. **npm** v9+ (bundled automatically with Node.js)
3. **[PostgreSQL](https://www.postgresql.org/)** 14+ running locally **OR** **[Docker Desktop](https://www.docker.com/)**
4. **Git** for version control

---

## Step-by-Step Installation Guide

### Step 1: Clone the Repository

Open your terminal or command prompt:

```bash
git clone https://github.com/ArgoJR203/TokTickIT.git
cd TokTickIT
```

---

### Step 2: Install Dependencies

The project is organized into root (E2E testing), `client` (frontend), and `server` (backend). Install all dependencies:

```bash
# 1. Install root dependencies (Playwright)
npm install

# 2. Install client dependencies
cd client
npm install

# 3. Install server dependencies
cd ../server
npm install

# 4. Return to project root
cd ..
```

*(Optional: If you want to run Playwright E2E browser tests, install the Playwright browser binaries once from root)*:
```bash
npx playwright install chromium
```

---

### Step 3: Set Up PostgreSQL Database

You can run PostgreSQL either through Docker (recommended for quick start) or using a local PostgreSQL service.

#### Option A: Using Docker (Recommended)

Run a PostgreSQL container named `toktickit-db`:

```bash
docker run --name toktickit-db -e POSTGRES_USER=postgres -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=toktickit -p 5432:5432 -d postgres:16-alpine
```

*To verify it is running:*
```bash
docker ps
```

#### Option B: Using Local PostgreSQL

If you already have PostgreSQL installed on your machine, create a database named `toktickit`:

```sql
CREATE DATABASE toktickit;
```

---

### Step 4: Configure Environment Variables

#### 1. Server Environment Configuration

Copy `server/.env.example` to `server/.env`:

**macOS / Linux:**
```bash
cp server/.env.example server/.env
```

**Windows (PowerShell):**
```powershell
Copy-Item server\.env.example server\.env
```

Edit `server/.env` to configure your database connection and secrets:

```env
# Database connection string
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/toktickit?schema=public"

# Backend server port
PORT=3000

# Secret for signing JWT authentication tokens
JWT_SECRET="your_secure_super_secret_jwt_key_toktickit_2026"
```

> **Security Note:** In production, `JWT_SECRET` must be set in the environment. In local development or tests, if left unconfigured, the system automatically provisions an ephemeral, cryptographically random in-memory secret to prevent credential leakage.

#### 2. Client Environment Configuration

Copy `client/.env.example` to `client/.env`:

**macOS / Linux:**
```bash
cp client/.env.example client/.env
```

**Windows (PowerShell):**
```powershell
Copy-Item client\.env.example client\.env
```

The default contents point to the local backend:
```env
VITE_API_URL="http://localhost:3000"
```

---

### Step 5: Run Database Migrations & Seed Data

Navigate to the `server/` folder to run Prisma migrations and seed the initial reference data:

```bash
cd server

# 1. Apply database migrations to create tables, indexes, and relations
npx prisma migrate dev

# 2. Seed default categories, related systems, test tickets, and user accounts
npm run prisma:seed

cd ..
```

You should see confirmation output:
```
Seeded 4 categories.
Seeded 7 related systems.
Seeded 11 users (6 Requesters, 4 IT Staff, 1 Admin).
Seeded 8 operational sample tickets with comments, notes, and actions taken.
```

---

### Step 6: Start the Application

Open **two separate terminal windows**:

#### Terminal 1 — Backend Server
```bash
cd server
npm run dev
```
The server will start at: **`http://localhost:3000`**

#### Terminal 2 — Frontend Client
```bash
cd client
npm run dev
```
The frontend Vite server will start at: **`http://localhost:5173`**

Open your web browser and navigate to: **`http://localhost:5173`**

---

## Step-by-Step User Guide (How to Use)

### Seeded Test Accounts & Credentials

All default seeded accounts share the initial password: **`Password123!`**

| Persona / Name | Email | Role | Account Status | Purpose / Special Behavior |
| :--- | :--- | :--- | :--- | :--- |
| **Jennifer Anderson** | `jennifer.anderson@example.com` | `REQUESTER` | Active | Default Requester persona. Submits tickets, views "My Tickets", posts comments, views Actions Taken in read-only mode. |
| **Sarah Johnson** | `sarah.johnson@example.com` | `REQUESTER` | Active | Requester persona with sample tickets across statuses (`NEW`, `REOPENED`). |
| **Michael Brown** | `michael.brown@example.com` | `REQUESTER` | Active | Requester persona with sample ticket demonstrating advisory resolution indication. |
| **Amanda Clark** | `amanda.clark@example.com` | `REQUESTER` | Active | Requester persona with resolved and cancelled sample tickets. |
| **David Lee** | `david.lee@example.com` | `REQUESTER` | Active | **Mandatory First-Time Password Change tester** (`mustChangePassword: true`). |
| **Robert Taylor** | `robert.taylor@example.com` | `REQUESTER` | **Inactive** | **Deactivated account login rejection tester** (`isActive: false`). |
| **Alex Thompson** | `alex.thompson@toktickit.com` | `IT_STAFF` | Active | Primary IT Staff persona. Manages queue, claims tickets, logs actions taken, writes amber internal notes. |
| **Lisa Martinez** | `lisa.martinez@toktickit.com` | `IT_STAFF` | Active | IT Staff collaborator persona. Logs actions across shared tickets. |
| **Kevin Patel** | `kevin.patel@toktickit.com` | `IT_STAFF` | Active | IT Staff assignee persona with hardware resolution records. |
| **Robert Wilson** | `robert.wilson@toktickit.com` | `IT_STAFF` | **Inactive** | **Inactive staff rejection tester** (`isActive: false`). Cannot be assigned actions taken. |
| **John Smith** | `john.smith@toktickit.com` | `ADMINISTRATOR` | Active | System Administrator. User Management, admin safety enforcement, user statistics on dashboard. |

---

### 1. Authentication & First-Login Password Change Flow

#### Signing In
1. Navigate to `http://localhost:5173`.
2. Enter a user email and password (e.g., `jennifer.anderson@example.com` / `Password123!`).
3. Click **Sign In**. The system checks credentials, issues a JWT session token, and directs the user to their role-tailored dashboard.

#### Mandatory First-Time Password Change Gating (Handout §10, BR-07)
1. Sign in as **`david.lee@example.com`** with initial password **`Password123!`**.
2. Because `mustChangePassword = true`, David is **immediately gated** to the **Change Your Password** screen. Normal navigation is completely blocked.
3. The interactive password checklist dynamically validates 4 rules in real-time:
   - [x] At least 8 characters
   - [x] Includes uppercase and lowercase letters
   - [x] Includes a number or special character
   - [x] Passwords match
4. Fill in:
   - Current password: `Password123!`
   - New password: `NewPassword456!`
   - Confirm password: `NewPassword456!`
5. Click **Continue**. The password is updated, `mustChangePassword` is cleared to `false`, and normal application access is granted.

#### Inactive Account Protection
- Try signing in as **`robert.taylor@example.com`** (`Password123!`).
- The login is rejected with `"Your account has been deactivated. Please contact your IT administrator."` without disclosing password validity.

#### Secure Logout
- Click **Logout** at the top-right of the header.
- The JWT session is added to the in-memory token revocation store, local storage is cleared, and subsequent requests with that token return `401 Unauthorized`.

---

### 2. Requester (End User) Workflow

*Sign in as: `jennifer.anderson@example.com` / `Password123!`*

#### A. Requester Operational Dashboard
- Requesters landing in the application see the **Requester Dashboard** (`GET /api/requester/dashboard`).
- **4 Real-Time Metric Cards**:
  - **Open Tickets**: Total tickets in `NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, or `REOPENED`.
  - **Waiting on Me**: Tickets in `WAITING_FOR_REQUESTER` requiring user feedback.
  - **Resolved Tickets**: Tickets in `RESOLVED` status awaiting final closure.
  - **Closed Tickets**: Tickets archived under `CLOSED` status.
- **Recent Tickets**: Shows the top 5 recently updated tickets owned strictly by the requester.
- **Interactive Drill-Down**: Clicking any metric card routes to **My Tickets** with the appropriate filter applied (`statusGroup=open`, `statusGroup=resolved`, or `currentStatus=WAITING_FOR_REQUESTER`).
- **Quick Action**: Click **+ Create Ticket** directly from the dashboard header.

#### B. Viewing Your Tickets ("My Tickets")
- Click **My Tickets** in the navigation header.
- On desktop ($\ge$768px): Shows a structured table with Ticket No., Date, Summary, Category, Priority, and Status badges.
- On mobile (<768px): Responsive card view with touch targets $\ge$ 44px.
- Use the search bar to locate tickets by number or keywords.

#### C. Creating a New Support Ticket
1. Click **+ Create Ticket** in the navigation header or dashboard.
2. Select a **Category** (e.g., *Hardware*, *Software*, *Network*, *Account and Access*).
3. Select a **Related System** (e.g., *VPN*, *LEB2 App*, *Campus Wi-Fi*, *Corporate Laptop*).
4. Select **Requested Priority** (*LOW*, *MEDIUM*, *HIGH*, *URGENT*).
5. Enter a **Summary** (min. 5 characters) and **Description** (min. 10 characters).
6. *(Optional)* Attach files: Upload PDF, PNG, or JPG files (max 5MB each).
7. Click **Submit Ticket**.
   - Built-in **double-click protection** prevents accidental duplicate submissions.
8. A new ticket number formatted as `TKT-YYYY-XXXXXX` is generated atomically.

#### D. Interacting with a Ticket
1. Click on any ticket row from **My Tickets** to open the ticket detail view.
2. **Attachments**: Download uploaded files or upload additional attachments.
3. **Public Comments**: Write messages to communicate directly with IT Staff in the timeline.
4. **Actions Taken (🔒 Strict Read-Only Mode)**:
   - Requesters can see work completed by IT Staff (action date, performer, assignee, description, and results).
   - Create and Edit buttons are hidden for requesters. Direct API write attempts receive `403 Forbidden` (`FORBIDDEN_ROLE`).
5. **"Problem Appears Resolved" Advisory Signal (BR-12, AC-03)**:
   - If the ticket is in `IN_PROGRESS` or `WAITING_FOR_REQUESTER`, an action button *"Problem Appears Resolved"* appears.
   - Clicking this notifies IT Staff, records an automated public audit comment, and sets `resolutionIndicated = true` without prematurely changing the ticket status.

---

### 3. IT Staff Workflow

*Sign in as: `alex.thompson@toktickit.com` / `Password123!`*

#### A. IT Staff Operational Dashboard
- IT Staff landing in the application see the **Staff Dashboard** (`GET /api/staff/dashboard`).
- **5 Real-Time Metric Cards**:
  - **Unassigned Tickets**: Tickets awaiting an owner (`ownerId === null`).
  - **Assigned to Me**: Tickets claimed by or assigned to the current user.
  - **In Progress**: Active operational workload across the team.
  - **Waiting on Requester**: Tickets pending client response or confirmation.
  - **Resolved / Ready to Close**: Tickets awaiting final verification.
- **Breakdown Tables & Cards**:
  - Active tickets grouped by **Current Status** (all 8 statuses).
  - Open tickets grouped by **IT Priority** (*LOW*, *MEDIUM*, *HIGH*, *URGENT*).
- **Recent Queue**: Quick access to recently updated tickets across the entire service desk.
- **Interactive Drill-Down**: Clicking any metric card routes to the Ticket Queue with pre-filtered query parameters (`ownerId=unassigned`, `ownerId=me`, `currentStatus={STATUS}`).

#### B. The IT Staff Ticket Queue
- Click **Ticket Queue** in the navigation header.
- **Search & Filter Controls**:
  - Search ticket # or summary text
  - Filter by Category and Related System
  - Filter by Status (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`)
  - Filter by IT Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
  - Filter by Assignment (*All*, *Unassigned*, *Assigned to Me*, or specific staff member)
- Click any column header to sort.

#### C. Managing a Ticket (Staff Ticket Detail)
Click on any ticket in the queue to open the operational detail view:

1. **Claim Ownership**: Click **Assign to Me** to immediately take ownership of the ticket, or choose another active staff member from the dropdown.
2. **Update IT Priority**: Change the operational **IT Priority** independently from the requester's originally requested priority.
3. **Actions Taken Subsystem (Granular Work Planning & Execution)**:
   - Click **+ Log Action Taken** to open the modal.
   - **Action Date/Time**: Pre-filled with current timestamp, but accepts past or future dates for scheduling planned maintenance (`BR-04`).
   - **Performer**: Auto-populated from your authenticated session. Client cannot forge `performedById` (`BR-03`).
   - **Assignee**: Assign any active staff member or leave empty. Inactive accounts are rejected with `400 Bad Request` (`INACTIVE_ASSIGNEE`).
   - **Status**: Mark action as `PENDING`, `IN_PROGRESS`, `COMPLETED`, or `CANCELLED`.
   - **Description & Result**: Enter detailed logs of work performed (1–2000 characters).
   - **Follow-Up Required**: Toggle if follow-up work is required. If checked, **Follow-Up Note** is strictly mandatory (`BR-05`).
   - **Follow-Up Done**: Mark completed when the follow-up task is fulfilled.
   - **Attachment Notes**: Reference file names or error logs (optional).
   - **Multi-Staff Collaboration**: Any staff member can log actions on any ticket, regardless of who is the primary ticket owner (`BR-02`).
   - **Editing Actions**: Existing actions can be updated with full optimistic concurrency protection (`FR-08`).
4. **Advance Status (8-Status State Machine Validation)**:
   - The status dropdown only presents valid next states according to the business rules:
     - `NEW` $\rightarrow$ `OPEN`, `IN_PROGRESS`, `CANCELLED`
     - `OPEN` $\rightarrow$ `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED`
     - `IN_PROGRESS` $\rightarrow$ `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
     - `WAITING_FOR_REQUESTER` $\rightarrow$ `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
     - `RESOLVED` $\rightarrow$ `CLOSED`, `REOPENED`
     - `CLOSED` $\rightarrow$ `REOPENED`
     - `REOPENED` $\rightarrow$ `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
     - `CANCELLED` is strictly terminal.
5. **Action Completion Resolution Gate (BR-20, AC-16)**:
   - If you attempt to transition the ticket to `RESOLVED` or `CLOSED` while any Action Taken under that ticket is in `PENDING` or `IN_PROGRESS`, OR has `followUpRequired = true AND followUpDone = false`, the transition is **strictly blocked** with `400 Bad Request` (`code: "INCOMPLETE_ACTIONS_TAKEN"`).
   - All actions must be completed and follow-ups checked off before the ticket can be resolved.
6. **Mandatory Resolution Summary (BR-13, AC-09)**:
   - When transitioning to `RESOLVED` or `CLOSED`, fill in the **Resolution Summary** field (minimum 5 characters). This explanation is made visible to the requester upon resolution.
7. **Advisory Resolution Indication Notice (BR-12)**:
   - If the requester clicked *"Problem Appears Resolved"*, a prominent notice banner informs staff that the user has verified the solution, ready for staff review and formal resolution.
8. **Atomic Optimistic Concurrency Control (OCC) (BR-14, AC-08)**:
   - If another staff member updates the ticket while you have it open, your update returns `409 Conflict` (`STALE_UPDATE`).
   - The UI displays an alert banner with a **"Reload Latest Ticket Data"** button that refreshes server data while preserving your unsaved form drafts.
9. **Public Comments vs. Amber Internal Notes**:
   - **Public Comments Tab**: Messages sent here are visible to the ticket requester.
   - **🔒 Internal Notes Tab (Warm Amber Styling)**: Private staff notes (`#FFF3E0` background with caution badge) strictly restricted to staff and admins (`403 Forbidden` returned to requesters).

---

### 4. Administrator Workflow

*Sign in as: `john.smith@toktickit.com` / `Password123!`*

Administrators possess all IT Staff capabilities plus full access to the **User Management** console and extended dashboard metrics.

#### A. Administrator Operational Dashboard
- Landing on the Dashboard, Administrators see all IT Staff operational metrics plus an **Admin Statistics** section (`AC-11`, `BR-17`):
  - **Total Users**: Authoritative database user count.
  - **Active Users**: Users currently permitted to authenticate.
  - **Users by Role**: Dynamic distribution of Requesters, IT Staff, and Administrators.
- Quick navigation button to **Manage Users**.

#### B. Accessing User Management
- Click **User Management** in the top navigation bar.
- View all registered users across the organization.
- Review the authoritative **Active Admins Count** badge.
- Filter by role (`ALL`, `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`) or search by name/email.

#### C. Creating a New User
1. Click **+ Create User**.
2. Fill in:
   - Full Name
   - Email Address (validated against duplicates; returns `409 Conflict` if existing)
   - Role (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`)
   - Initial Temporary Password (min 8 characters, mixed case, number & special char)
   - Account Active toggle
3. Click **Create User**. The new user is created with `mustChangePassword = true`.

#### D. Administrator Safety Protections
1. **Self-Deactivation Prevention (Lab 3 BR-21, AC-14)**:
   - Click **Edit** on John Smith's own account.
   - An alert banner informs: *"Safety Rule (BR-21): You cannot deactivate your own Administrator account."*
   - The active switch is disabled. If bypassed via API, the backend returns `400 Bad Request`.
2. **Last Active Admin Preservation (Lab 3 BR-22, AC-15)**:
   - If only one Administrator is active in the system, deactivating or demoting that admin account is rejected by both UI and backend validation.

#### E. Resetting User Credentials
1. Click **Edit** on any user row.
2. Scroll to **Set New Initial Password**.
3. Enter a new temporary password and click **Update Password**.
4. The user's credential is updated and flagged with `mustChangePassword = true`, forcing them to set a new password upon their next login.

---

## Core Business Rules & Architectural Mechanisms

### Actions Taken Subsystem

The Actions Taken subsystem provides granular execution tracking beneath each ticket:

| Field | Type | Constraints & Behavior |
| :--- | :--- | :--- |
| `ticketId` | Integer (FK) | Cascade deletes when parent ticket is purged (`BR-01`). |
| `performedById` | Integer (FK) | Authoritatively assigned from JWT session (`BR-03`). Client overrides rejected. |
| `assigneeId` | Integer? (FK) | Optional. Must reference an active user with role `IT_STAFF` or `ADMINISTRATOR` (`BR-07`). Inactive assignees rejected (`400 Bad Request`). |
| `status` | Enum | `PENDING`, `IN_PROGRESS`, `COMPLETED`, `CANCELLED`. |
| `actionDateTime` | DateTime | Accepts past, present, or future dates for planned maintenance (`BR-04`). |
| `description` | Text | 1–2000 characters. Mandatory (`BR-04`). |
| `result` | Text | 1–2000 characters. Mandatory (`BR-04`). |
| `followUpRequired` | Boolean | If `true`, `followUpNote` is strictly required (`BR-05`). |
| `followUpNote` | Text? | 1–1000 characters. Mandatory if `followUpRequired === true`. |
| `followUpDone` | Boolean | Indicates whether follow-up action has been fulfilled. |
| `attachmentNotes` | Text? | Optional notes referencing files or error artifacts. |
| `version` | Integer | Optimistic concurrency version counter (`BR-14`). |

---

### 8-Status Lifecycle State Machine & Resolution Gates

```
                    ┌─────────┐
                    │   NEW   │
                    └──┬───┬──┘
         ┌─────────────┘   └─────────────┐
         ▼                               ▼
   ┌───────────┐                   ┌───────────┐
   │   OPEN    │                   │ CANCELLED │ ◄── [Terminal]
   └──┬─────┬──┘                   └───────────┘
      │     └──────────────┐             ▲
      ▼                    ▼             │
┌─────────────┐     ┌──────────────┐     │
│ IN_PROGRESS │◄───►│ WAITING_FOR_ │     │
└──┬──────────┘     │  REQUESTER   │     │
   │                └──────┬───────┘     │
   │ (Gate Checks:         │             │
   │  - Actions Complete   │             │
   │  - Res. Summary)      │             │
   ├───────────────────────┘             │
   ▼                                     │
┌─────────────┐                          │
│  RESOLVED   │                          │
└──┬──────────┘                          │
   ├─────────────────────────────────────┤
   ▼                                     │
┌─────────────┐                          │
│   CLOSED    │                          │
└──┬──────────┘                          │
   │ (Reopen)                            │
   ▼                                     │
┌─────────────┐                          │
│  REOPENED   │──────────────────────────┘
└─────────────┘
```

#### Transition Matrix (`BR-10`, `BR-11`):
- `NEW` $\rightarrow$ `OPEN`, `IN_PROGRESS`, `CANCELLED`
- `OPEN` $\rightarrow$ `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `CANCELLED`
- `IN_PROGRESS` $\rightarrow$ `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
- `WAITING_FOR_REQUESTER` $\rightarrow$ `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
- `RESOLVED` $\rightarrow$ `CLOSED`, `REOPENED`
- `CLOSED` $\rightarrow$ `REOPENED`
- `REOPENED` $\rightarrow$ `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
- `CANCELLED` $\rightarrow$ None (strictly terminal)

#### Resolution Gate Enforcement:
1. **Action Completion Gate (`BR-20`, `AC-16`)**: Cannot transition to `RESOLVED` or `CLOSED` if any Action Taken under the ticket has `status IN ('PENDING', 'IN_PROGRESS')` OR (`followUpRequired = true AND followUpDone = false`).
2. **Resolution Summary Gate (`BR-13`, `AC-09`)**: Mandatory `resolutionSummary` (minimum 5 characters) when transitioning to `RESOLVED` or `CLOSED`.
3. **Advisory Resolution Indication (`BR-12`, `AC-03`)**: Requester clicking *"Problem Appears Resolved"* (`POST /api/tickets/:id/resolve-indication`) sets `resolutionIndicated = true` and posts a public audit comment, but **does not alter the ticket status**.

---

### Atomic Optimistic Concurrency Control (OCC)

To prevent lost updates when multiple staff members or requesters collaborate on tickets concurrently:

1. Both `Ticket` and `ActionTaken` tables feature an integer `version` column (default `1`).
2. Mutation updates execute an atomic Compare-And-Swap (CAS):
   ```sql
   UPDATE "Ticket"
   SET "currentStatus" = $1, "version" = "version" + 1, "updatedAt" = NOW()
   WHERE "id" = $2 AND "version" = $3;
   ```
3. If zero rows are updated (`count === 0`), another user modified the record first.
4. The server responds with **`409 Conflict`** (`code: "STALE_UPDATE"`) and returns the latest record state.
5. The frontend alerts the user with a warning banner and a **"Reload Latest Ticket Data"** button, reloading the current server state while keeping uncommitted form inputs intact (`FR-20`).

---

### Role-Appropriate Operational Dashboards

The dashboard layer provides high-performance, indexed operational summaries tailored by role:

| Endpoint | Role Access | Key Metrics Returned |
| :--- | :--- | :--- |
| `GET /api/requester/dashboard` | `REQUESTER` only (`403` for staff) | `totalOpen`, `waitingForRequester`, `resolvedCount`, `closedCount`, top 5 `recentTickets` strictly owned by caller (`BR-15`). |
| `GET /api/staff/dashboard` | `IT_STAFF`, `ADMINISTRATOR` (`403` for requesters) | `unassignedCount`, `assignedToMeCount`, `countsByStatus` (all 8 statuses), `countsByPriority` (open tickets), top 5 `recentTickets` (`BR-16`). |
| `GET /api/staff/dashboard` (Admin extension) | `ADMINISTRATOR` only | All staff operational metrics plus dynamic `adminStats`: `totalUsers`, `activeUsers`, `usersByRole` (`BR-17`). |

Interactive drill-down navigation passes query filters directly to ticket lists (`statusGroup=open`, `statusGroup=resolved`, `ownerId=unassigned`, `ownerId=me`, `currentStatus={STATUS}`).

---

## Testing & Quality Assurance

TokTickIT is engineered with a strict **Specification-Driven Development (Spec DD)** and **Test-Driven Development (TDD)** approach.

### Summary Test Pyramid

```
                       ┌──────────────────────┐
                       │   Playwright E2E     │  5 Suites + 15 Screenshots
                       │   Browser Tests      │  (100% Passing)
                       ├──────────────────────┤
                       │  Client Components   │  133 Tests / 21 Files
                       │ (Vitest + RTL + DOM) │  (100% Passing)
                       ├──────────────────────┤
                       │  Server API & Domain │  253 Tests / 34 Files
                       │ (Vitest + Supertest) │  (100% Passing)
                       └──────────────────────┘
```

- **Server Test Suite**: **253 tests** across 34 test files (including 12 files dedicated to Lab 4).
- **Client Test Suite**: **133 tests** across 21 test files (including 9 files dedicated to Lab 4).
- **E2E Test Suite**: **5 Playwright suites** in `e2e/lab-04/` + **15 visual evidence screenshots** in `artifacts/lab-04/screenshots/`.
- **Master Plan Traceability**: **40/40 planned tests** passed (detailed in [`docs/lab-04/tests.md`](file:///d:/AllStudyProject/CPE334/TokTickIT/docs/lab-04/tests.md)).

---

### Running Unit & API Tests

#### Server Tests (Vitest + Supertest)
Runs all 34 test files covering domain models, optimistic concurrency, state machines, dashboard aggregations, rollback regressions, and REST APIs:

```bash
cd server
npm test
```

#### Client Tests (Vitest + React Testing Library)
Runs all 21 test files covering Login, Password Change, Dashboards, Actions Taken modal, Concurrency banners, Debounce protection, Style tokens, and Accessibility:

```bash
cd client
npm test
```

---

### Running Playwright End-to-End Tests

Ensure the backend server (`http://localhost:3000`) and frontend (`http://localhost:5173`) are running, or let Playwright launch them automatically via `playwright.config.ts`.

Run the Lab 4 E2E test suites from the root directory:

```bash
# Run all Lab 4 End-to-End tests
npm run test:e2e:lab4
# or
npm run test:e2e
```

#### What the E2E Suites Test:
1. **`e2e/lab-04/actions-taken-flow.spec.ts` (`E2E-01`)**:
   - IT Staff logs in, opens ticket, logs Action Taken with performer auto-assigned, approved assignee, and follow-up note.
   - Staff member edits action and marks follow-up done.
   - Requester logs in to confirm strict read-only view (no create or edit buttons).
2. **`e2e/lab-04/ticket-resolution.spec.ts` (`E2E-02`)**:
   - Requester clicks *"Problem Appears Resolved"*; verifies status remains unchanged.
   - IT Staff attempts to advance to `RESOLVED` while an action is pending $\rightarrow$ **blocked by Action Completion Gate**.
   - IT Staff completes all actions, enters mandatory resolution summary, and successfully resolves the ticket.
3. **`e2e/lab-04/dashboards.spec.ts` (`E2E-03`)**:
   - Verifies Requester Dashboard metric counts and drill-downs.
   - Verifies Staff Dashboard operational cards, priority/status breakdowns, and queue drill-downs.
   - Verifies Admin Dashboard displays live `adminStats` user account metrics.
4. **`e2e/lab-04/regression-smoke.spec.ts` (`E2E-04`)**:
   - Comprehensive full-system regression verifying authentication, mandatory password change gating, ticket creation, file attachments, public comments, amber internal notes, and administrator user management.
5. **`e2e/lab-04/concurrency-conflict.spec.ts` (`E2E-05`)**:
   - Two browser contexts open the same ticket simultaneously.
   - Context A submits a status change; Context B submits an update with stale version.
   - Context B receives `409 Conflict` notice and clicks "Reload Latest Ticket Data" to recover gracefully without losing unsaved drafts.

---

### Non-Functional & Quality Audits

- **Database Migration & Rollback Regression (`MIGR-01`)**:
  - `server/tests/lab-04/migration-regression.test.ts` validates zero data loss for legacy tickets, attachments, comments, and notes across Prisma migrations, and asserts clean schema integrity.
- **Dashboard Response Time Benchmark (`PERF-01`)**:
  - `server/tests/lab-04/dashboard-perf.test.ts` asserts that warmed `/api/staff/dashboard` and `/api/requester/dashboard` endpoints execute under **200ms** using indexed SQL queries.
- **Zen Green Design System Token Audit (`STYLE-01`)**:
  - `client/tests/lab-04/StyleSystem.test.tsx` verifies that all cards, badges, buttons, and headers use canonical Zen Green CSS variables (`--color-primary-green`, etc.) without hardcoded ad-hoc styles.
- **Responsive Layout Across Viewports (`RESP-01`)**:
  - `client/tests/lab-04/ResponsiveLayout.test.tsx` and Playwright tests verify rendering at Mobile (375px), Tablet (768px), and Desktop (1280px), ensuring zero horizontal scrolling and touch targets $\ge 44$px.
- **WCAG AA Accessibility Audit (`A11Y-01`)**:
  - `client/tests/lab-04/Accessibility.test.tsx` audits high-contrast focus rings (`2px solid #0B7A46`), `aria-current="page"` navigation attributes, screen-reader labels on metric cards, and dual cues for status indicators.
- **Visual Evidence Screenshots**:
  - 15 responsive screenshots captured across Desktop, Tablet, and Mobile viewports stored in `artifacts/lab-04/screenshots/`:
    - `requester-dashboard/` (Desktop, Tablet, Mobile)
    - `staff-dashboard/` (Desktop, Tablet, Mobile)
    - `admin-dashboard/` (Desktop, Tablet, Mobile)
    - `actions-taken/` (Desktop, Tablet, Mobile)
    - `ticket-resolution/` (Desktop, Tablet, Mobile)

---

## Project Directory Structure

```
TokTickIT/
├── client/                             # React 18 + Vite 6 frontend
│   ├── src/
│   │   ├── components/                 # UI Components
│   │   │   ├── ActionsTaken.tsx        # Actions Taken table, modal & read-only view
│   │   │   ├── AttachmentSection.tsx   # File upload/download/remove section
│   │   │   ├── ChangePassword.tsx      # Mandatory password change screen (BR-07)
│   │   │   ├── CreateTicket.tsx        # Ticket creation form with debounce protection
│   │   │   ├── Header.tsx              # Role-tailored header, navigation tabs & logout
│   │   │   ├── Login.tsx               # Sign-in form with error & spinner
│   │   │   ├── MyTickets.tsx           # Requester ticket dashboard & filters
│   │   │   ├── RequesterDashboard.tsx  # Requester operational dashboard (4 cards)
│   │   │   ├── RequesterSelector.tsx   # Requester user picker helper
│   │   │   ├── RequesterTicketDetail.tsx # Requester ticket details, comments, read-only actions
│   │   │   ├── StaffDashboard.tsx      # Staff & Admin operational dashboard (5 cards + Admin Stats)
│   │   │   ├── StaffTicketDetail.tsx   # Staff ticket management, actions taken, OCC, amber notes
│   │   │   ├── StaffTicketQueue.tsx    # Staff ticket queue table & mobile cards
│   │   │   └── UserManagement.tsx      # Admin user management & safety alerts
│   │   ├── context/
│   │   │   ├── AuthContext.tsx         # JWT session management & token storage
│   │   │   └── RequesterContext.tsx    # Requester state context
│   │   ├── App.tsx                     # Main router and role view gating
│   │   ├── api.ts                      # REST API client with OCC & debounce support
│   │   ├── index.css                   # Zen Green design system & tokens
│   │   └── main.tsx                    # React entrypoint
│   ├── tests/                          # Client component tests (133 tests)
│   │   ├── lab-01/
│   │   ├── lab-02/
│   │   ├── lab-03/
│   │   └── lab-04/                     # ActionsTaken, Dashboards, FormProtection, Style, A11y
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                             # Express + Prisma backend
│   ├── src/
│   │   ├── middleware/
│   │   │   └── upload.ts               # Multer file upload handling
│   │   ├── utils/
│   │   │   ├── actions-taken-validator.ts # Actions Taken validation (BR-04, BR-05)
│   │   │   ├── admin-safety-validator.ts # Self-deactivation & last admin checks
│   │   │   ├── assignee-validator.ts   # Active staff assignee validation (BR-07)
│   │   │   ├── attachment-validator.ts # Attachment size & MIME type validation
│   │   │   ├── concurrency-validator.ts # Optimistic concurrency version check (BR-14)
│   │   │   ├── dashboard-calculator.ts # Operational metric aggregation algorithms
│   │   │   ├── jwt.ts                  # Secure JWT signer & verifier
│   │   │   ├── password-validator.ts   # Complexity validator (BR-07)
│   │   │   ├── status-transition-validator.ts # State machine matrix & resolution gates
│   │   │   ├── ticket-generator.ts     # TKT-YYYY-XXXXXX ticket ID generator
│   │   │   └── token-revocation.ts     # In-memory revocation store (BR-09)
│   │   ├── app.ts                      # Express application, routes & middlewares
│   │   ├── index.ts                    # Server listener entrypoint
│   │   └── prisma.ts                   # Prisma client singleton
│   ├── prisma/
│   │   ├── migrations/                 # Database migrations (User, Ticket, Note, ActionTaken)
│   │   ├── schema.prisma               # Prisma data models with version counters
│   │   └── seed.ts                     # Idempotent database seeder (8 statuses, actions taken)
│   ├── tests/                          # Server test suites (252 tests)
│   │   ├── lab-01/
│   │   ├── lab-02/
│   │   ├── lab-03/
│   │   └── lab-04/                     # Actions, Concurrency, State Machine, Dashboards, Perf
│   ├── uploads/                        # Uploaded file attachments (git-ignored)
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── e2e/                                # Playwright End-to-End test suites
│   ├── lab-02/
│   ├── lab-03/
│   └── lab-04/                         # Lab 4 E2E Suites
│       ├── actions-taken-flow.spec.ts  # E2E-01 (Actions Taken flow & read-only view)
│       ├── ticket-resolution.spec.ts   # E2E-02 (Resolution gate & mandatory summary)
│       ├── dashboards.spec.ts          # E2E-03 (Role dashboards & drill-downs)
│       ├── regression-smoke.spec.ts    # E2E-04 (Full regression across Labs 1-3)
│       ├── concurrency-conflict.spec.ts # E2E-05 (Optimistic concurrency conflict recovery)
│       └── capture-screenshots.spec.ts # Automated 15 responsive evidence capture
├── artifacts/                          # Visual evidence artifacts
│   ├── lab-02/
│   ├── lab-03/
│   └── lab-04/screenshots/             # 15 responsive screenshots (Desktop, Tablet, Mobile)
│       ├── actions-taken/
│       ├── admin-dashboard/
│       ├── requester-dashboard/
│       ├── staff-dashboard/
│       └── ticket-resolution/
├── docs/                               # Engineering documentation & specifications
│   ├── lab-01/
│   ├── lab-02/
│   ├── lab-03/
│   └── lab-04/
│       ├── specification.md            # Requirements & Business Rules (BR-01..21)
│       ├── tests.md                    # Master test traceability matrix (40/40 Passed)
│       ├── ui-spec.md                  # UI design tokens & responsive specifications
│       ├── api-spec.md                 # REST API endpoints contract
│       ├── reviewer.md                 # Peer code review log
│       └── ai-use.md                   # AI usage reflection and prompt journal
├── playwright.config.ts                # Playwright root configuration
├── package.json                        # Root package.json (E2E test scripts)
├── .gitignore
└── README.md
```

---

## Available Scripts Reference

### Root Directory (`./`)

| Command | Description |
| :--- | :--- |
| `npm run test:e2e` | Run Playwright E2E tests for Lab 4 (`e2e/lab-04/`) |
| `npm run test:e2e:lab4` | Run Playwright E2E tests for Lab 4 (`e2e/lab-04/`) |
| `npm run test:e2e:lab3` | Run Playwright E2E tests for Lab 3 (`e2e/lab-03/`) |
| `npm run test:e2e:lab2` | Run Playwright E2E tests for Lab 2 (`e2e/lab-02/`) |
| `npm run test:e2e:all` | Run all Playwright E2E test suites across all labs (`e2e/`) |

### Client Directory (`client/`)

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Vite frontend dev server at `http://localhost:5173` |
| `npm run build` | Type-check with TypeScript and build production bundle to `client/dist/` |
| `npm run preview` | Locally preview the compiled production build |
| `npm test` | Run client unit & component tests using Vitest (133 tests) |

### Server Directory (`server/`)

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Express backend dev server with hot-reload (`tsx watch`) on `:3000` |
| `npm run build` | Compile TypeScript backend to JavaScript in `server/dist/` |
| `npm start` | Run compiled production backend (`node dist/index.js`) |
| `npm run prisma:migrate` | Run Prisma schema migrations (`prisma migrate dev`) |
| `npm run prisma:seed` | Seed database with categories, systems, users, tickets, comments, and actions |
| `npm test` | Run server unit and API integration tests using Vitest (253 tests across 34 files) |

---

## Troubleshooting & FAQ

### 1. Database connection failed: `ECONNREFUSED 127.0.0.1:5432`
- Verify that your PostgreSQL server or Docker container is running.
- If using Docker, run: `docker ps` to verify container `toktickit-db` is healthy.
- If stopped, run: `docker start toktickit-db`.
- Check that the credentials in `server/.env` match your PostgreSQL password and port.

### 2. How to completely reset the database
If you want to wipe and re-initialize the database cleanly:
```bash
cd server
npx prisma migrate reset --force
npm run prisma:seed
cd ..
```

### 3. Port 3000 or 5173 already in use
- If port 3000 is occupied, adjust `PORT=3001` in `server/.env` and update `VITE_API_URL="http://localhost:3001"` in `client/.env`.
- If port 5173 is occupied, Vite will automatically select the next available port (e.g. `5174`).

### 4. "Token has been revoked. Please log in again."
- This occurs when using an expired or logged-out token.
- Click **Logout** or clear browser local storage (`localStorage.clear()`) and sign in again with active credentials.

### 5. Stale update warning: `409 Conflict (STALE_UPDATE)`
- Occurs when another staff member modified the ticket or action taken while you had it open on your screen.
- Click the **Reload Latest Ticket Data** button on the conflict banner. This pulls the latest server status and version while keeping your unsaved form drafts intact so you can re-apply your changes.

### 6. "Cannot resolve ticket while Actions Taken are incomplete"
- Business Rule `BR-20` prevents advancing a ticket to `RESOLVED` or `CLOSED` if any Action Taken under that ticket has `status` in `PENDING` or `IN_PROGRESS`, or has `followUpRequired = true` with `followUpDone = false`.
- Ensure all logged actions are marked as `COMPLETED` or `CANCELLED`, and mark all follow-up tasks as done before attempting to resolve the ticket.
