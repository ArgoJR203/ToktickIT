# TokTickIT — IT Service Desk Platform

KMUTT CPE334 Full-Stack Enterprise IT Service Desk Web Application with Multi-Role Authentication, Role-Based Access Control (RBAC), Ticket Lifecycle State Machine, Public/Internal Communications, and User Administration.

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
- [Testing & Quality Assurance](#testing--quality-assurance)
  - [Running Unit & API Tests](#running-unit--api-tests)
  - [Running Playwright End-to-End Tests](#running-playwright-end-to-end-tests)
- [Project Directory Structure](#project-directory-structure)
- [Available Scripts Reference](#available-scripts-reference)
- [Troubleshooting & FAQ](#troubleshooting--faq)

---

## Tech Stack

| Layer | Technology | Details |
| :--- | :--- | :--- |
| **Frontend** | React 18 · TypeScript · Vite · Bootstrap 5 | Single Page Application (SPA), Zen Green Design System, Responsive Desktop/Tablet/Mobile Layouts |
| **Backend** | Node.js · Express 4 · TypeScript | RESTful API, Middleware Pipelines, Role Guards, Multer File Handling, Bcrypt Hashing, JWT Authentication |
| **Database** | PostgreSQL · Prisma ORM | Relational schema, automated migrations, declarative relations, and transactional integrity |
| **Testing** | Vitest · React Testing Library · Supertest · Playwright | Multi-tier test pyramid: Domain Unit Tests, API Integration Tests, Component UI Tests, and E2E Browser Tests |

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
        ├─ Create Ticket                 ├─ Shared Ticket Queue           ├─ All Staff Features
        ├─ View Own Tickets              ├─ Claim ("Assign to Me")        ├─ User Management
        ├─ Upload / Download Files       ├─ Adjust IT Priority            ├─ Create / Edit Users
        ├─ Public Comments               ├─ Status State Transitions      ├─ Prevent Self-Deactivation
        └─ "Problem Appears Resolved"    ├─ Resolution Summaries          ├─ Preserve Last Active Admin
                                         ├─ Public Comments               └─ Reset Initial Passwords
                                         └─ 🔒 Confidential Internal Notes
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

# 1. Apply database migrations to create tables and indexes
npx prisma migrate dev

# 2. Seed default categories, related systems, test tickets, and 11 user accounts
npm run prisma:seed

cd ..
```

You should see confirmation output:
```
Seeded 4 categories.
Seeded 7 related systems.
Seeded 11 users (6 Requesters, 4 IT Staff, 1 Admin).
Seeded 6 operational sample tickets with comments and notes.
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
| **Jennifer Anderson** | `jennifer.anderson@example.com` | `REQUESTER` | Active | Default Requester persona. Submits tickets, views "My Tickets", posts comments. |
| **Sarah Johnson** | `sarah.johnson@example.com` | `REQUESTER` | Active | Requester persona with sample tickets. |
| **David Lee** | `david.lee@example.com` | `REQUESTER` | Active | **Mandatory First-Time Password Change tester** (`mustChangePassword: true`). |
| **Robert Taylor** | `robert.taylor@example.com` | `REQUESTER` | **Inactive** | **Deactivated account login rejection tester** (`isActive: false`). |
| **Alex Thompson** | `alex.thompson@toktickit.com` | `IT_STAFF` | Active | Primary IT Staff persona. Manages queue, claims tickets, changes IT priority/status, writes notes. |
| **Lisa Martinez** | `lisa.martinez@toktickit.com` | `IT_STAFF` | Active | IT Staff assignee persona. |
| **Robert Wilson** | `robert.wilson@toktickit.com` | `IT_STAFF` | **Inactive** | Deactivated staff member. Cannot be assigned tickets. |
| **John Smith** | `john.smith@toktickit.com` | `ADMINISTRATOR` | Active | System Administrator. User Management, admin safety enforcement, password resets. |

---

### 1. Authentication & First-Login Password Change Flow

#### Signing In
1. Navigate to `http://localhost:5173`.
2. Enter a user email and password (e.g., `jennifer.anderson@example.com` / `Password123!`).
3. Click **Sign In**. The system checks credentials, issues a JWT session token, and directs the user to their role-tailored dashboard.

#### Mandatory First-Time Password Change Gating (Handout §10)
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

#### A. Viewing Your Tickets ("My Tickets")
- The default screen shows the **My Tickets** dashboard.
- On desktop ($\ge$768px): Shows a structured table with Ticket No., Date, Summary, Category, Priority, and Status badges.
- On mobile (<768px): Responsive card view with touch targets $\ge$ 44px.
- Use the search bar to locate tickets by number or keywords.

#### B. Creating a New Support Ticket
1. Click **+ Create Ticket** in the navigation header.
2. Select a **Category** (e.g., *Hardware*, *Software*, *Network*).
3. Select a **Related System** (e.g., *VPN Access*, *Student Portal*, *Campus Wi-Fi*).
4. Select **Requested Priority** (*LOW*, *MEDIUM*, *HIGH*, *URGENT*).
5. Enter a **Summary** (min. 5 characters) and **Description** (min. 10 characters).
6. *(Optional)* Attach files: Upload PDF, PNG, or JPG files (max 5MB each).
7. Click **Submit Ticket**.
8. A new ticket number formatted as `TKT-YYYY-XXXXXX` is generated atomically.

#### C. Interacting with a Ticket
1. Click on any ticket row from **My Tickets** to open the ticket detail view.
2. **Attachments**: Download uploaded files or upload additional attachments.
3. **Public Comments**: Write messages to communicate directly with IT Staff in the timeline.
4. **"Problem Appears Resolved" Signal (BR-05, AC-12)**:
   - If the ticket is in `IN_PROGRESS` or `WAITING_FOR_REQUESTER`, an action button *"Problem Appears Resolved"* appears.
   - Clicking this notifies IT Staff and adds a system audit comment without prematurely terminating the ticket.

---

### 3. IT Staff Workflow

*Sign in as: `alex.thompson@toktickit.com` / `Password123!`*

#### A. The IT Staff Ticket Queue
- IT Staff are automatically directed to the **Ticket Queue** view.
- **Search & Filter Controls**:
  - Search ticket # or summary text
  - Filter by Category
  - Filter by Status (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, etc.)
  - Filter by IT Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`)
  - Filter by Assignment (*All*, *Unassigned*, *Assigned to Me*, or specific staff)
- Click any column header (Ticket No., Date, IT Priority, Status) to sort.

#### B. Managing a Ticket (Staff Ticket Detail)
Click on any ticket in the queue to open the operational detail view:
1. **Claim Ownership**: Click **Assign to Me** to immediately take ownership of the ticket, or choose another active staff member from the dropdown.
2. **Update IT Priority**: Change the operational **IT Priority** independently from the requester's originally requested priority. Changes persist automatically.
3. **Advance Status (State Machine Validation)**:
   - The status dropdown only presents valid next states according to the business rules:
     - `NEW` $\rightarrow$ `IN_PROGRESS`, `CANCELLED`
     - `IN_PROGRESS` $\rightarrow$ `WAITING_FOR_REQUESTER`, `RESOLVED`, `CANCELLED`
     - `WAITING_FOR_REQUESTER` $\rightarrow$ `IN_PROGRESS`, `RESOLVED`, `CANCELLED`
     - `RESOLVED` $\rightarrow$ `CLOSED`, `REOPENED`
     - `CLOSED` $\rightarrow$ `REOPENED`
4. **Resolution Summary (Mandatory for Closure)**:
   - When transitioning to `RESOLVED` or `CLOSED`, fill in the **Resolution Summary** field. This explanation is made visible to the requester upon resolution.
5. **Public Comments Tab**: Send updates and instructions directly visible to the requester.
6. **🔒 Internal Notes Tab (Warm Amber Styling)**:
   - Switch to the **Internal Notes** tab.
   - Distinct warm amber background (`#FFF3E0`) and warning banner ensure staff never confuse private notes with public comments.
   - Internal notes are **strictly restricted** to IT Staff and Administrators (`403 Forbidden` returned to requesters; tab completely hidden in requester UI).

---

### 4. Administrator Workflow

*Sign in as: `john.smith@toktickit.com` / `Password123!`*

Administrators possess all IT Staff capabilities plus full access to the **User Management** console.

#### A. Accessing User Management
- Click **User Management** in the top navigation bar.
- View all registered users across the organization.
- Review the authoritative **Active Admins Count** badge.
- Filter by role (`ALL`, `REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`) or search by name/email.

#### B. Creating a New User
1. Click **+ Create User**.
2. Fill in:
   - Full Name
   - Email Address (validated against duplicates; returns `409 Conflict` if existing)
   - Role (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`)
   - Initial Temporary Password (min 8 characters, mixed case, number & special char)
   - Account Active toggle
3. Click **Create User**. The new user is created with `mustChangePassword = true`.

#### C. Administrator Safety Protections
1. **Self-Deactivation Prevention (BR-21, AC-14)**:
   - Click **Edit** on John Smith's own account.
   - An alert banner informs: *"Safety Rule (BR-21): You cannot deactivate your own Administrator account."*
   - The active switch is disabled. If bypassed via API, the backend returns `400 Bad Request`.
2. **Last Active Admin Preservation (BR-22, AC-15)**:
   - If only one Administrator is active in the system, deactivating or demoting that admin account is rejected by both UI and backend validation.

#### D. Resetting User Credentials (AC-16)
1. Click **Edit** on any user row.
2. Scroll to **Set New Initial Password**.
3. Enter a new temporary password and click **Update Password**.
4. The user's credential is updated and flagged with `mustChangePassword = true`, forcing them to set a new password upon their next login.

---

## Testing & Quality Assurance

TokTickIT features a complete test suite covering all layers of the application.

### Running Unit & API Tests

#### Server Tests (Vitest + Supertest)
Runs 22 test files containing 155 tests covering password validation, status state machine, token revocation, RBAC middleware, and REST endpoints:

```bash
cd server
npm test
```

#### Client Tests (Vitest + React Testing Library)
Runs 12 test files containing 80 tests covering Login, Password Change checklist, Staff Queue, Ticket Detail, Internal Notes, and User Management:

```bash
cd client
npm test
```

---

### Running Playwright End-to-End Tests

Ensure the backend server (`http://localhost:3000`) and frontend (`http://localhost:5173`) are running, or let Playwright launch them automatically via `playwright.config.ts`.

Run all E2E test suites from the root directory:

```bash
# Run all Lab 3 End-to-End tests
npm run test:e2e
# or
npx playwright test e2e/lab-03/
```

#### What the E2E Suites Test:
1. **`e2e/lab-03/authentication.spec.ts`**:
   - `E2E-01`: Multi-role login, navigation tabs, role badges, inactive account rejection, logout.
   - `E2E-02`: David Lee mandatory password change flow, checklist validation, and route gating (*Handout §10 exact*).
2. **`e2e/lab-03/staff-ticket-flow.spec.ts`**:
   - `E2E-03`: Ticket queue search, claim ownership, IT priority update, status progression to RESOLVED with resolution summary, public comment, confidential amber internal notes, and confirmation that notes are hidden from requester.
3. **`e2e/lab-03/user-administration.spec.ts`**:
   - `E2E-04`: Admin user creation with initial password, John Smith self-deactivation protection alert, profile updates, temporary password reset, and target user login gating.
4. **`e2e/lab-03/capture-screenshots.spec.ts`**:
   - Captures 24 visual evidence screenshots across Desktop (`1280x800`), Tablet (`768x1024`), and Mobile (`375x667`) into `artifacts/lab-03/screenshots/`.

---

## Project Directory Structure

```
TokTickIT/
├── client/                             # React 18 + Vite frontend
│   ├── src/
│   │   ├── components/                 # UI Components
│   │   │   ├── AttachmentSection.tsx   # File upload/download/remove section
│   │   │   ├── ChangePassword.tsx      # Mandatory password change screen (BR-07)
│   │   │   ├── CreateTicket.tsx        # Ticket creation form with validation
│   │   │   ├── Header.tsx              # Role-tailored header, badges & logout
│   │   │   ├── Login.tsx               # Sign-in form with error & spinner
│   │   │   ├── MyTickets.tsx           # Requester ticket dashboard
│   │   │   ├── RequesterTicketDetail.tsx # Requester ticket details & comments
│   │   │   ├── StaffTicketDetail.tsx   # Staff ticket detail, actions, amber notes
│   │   │   ├── StaffTicketQueue.tsx    # Staff ticket queue table & mobile cards
│   │   │   └── UserManagement.tsx      # Admin user management & safety alerts
│   │   ├── context/
│   │   │   ├── AuthContext.tsx         # JWT session management & token storage
│   │   │   └── RequesterContext.tsx    # Requester state context
│   │   ├── App.tsx                     # Main router and role view gating
│   │   ├── api.ts                      # REST API client
│   │   ├── index.css                   # Zen Green design system & tokens
│   │   └── main.tsx                    # React entrypoint
│   ├── tests/                          # Client component tests
│   │   ├── lab-01/
│   │   ├── lab-02/
│   │   └── lab-03/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                             # Express + Prisma backend
│   ├── src/
│   │   ├── middleware/
│   │   │   └── upload.ts               # Multer file upload handling
│   │   ├── utils/
│   │   │   ├── admin-safety-validator.ts # Self-deactivation & last admin checks
│   │   │   ├── attachment-validator.ts   # Attachment size & MIME type validation
│   │   │   ├── jwt.ts                  # Secure JWT signer & verifier
│   │   │   ├── password-validator.ts   # Complexity validator (BR-07)
│   │   │   ├── status-transition-validator.ts # State machine matrix (BR-14)
│   │   │   ├── ticket-generator.ts     # TKT-YYYY-XXXXXX ticket ID generator
│   │   │   └── token-revocation.ts     # In-memory revocation store (BR-09)
│   │   ├── app.ts                      # Express application, routes & middlewares
│   │   ├── index.ts                    # Server listener entrypoint
│   │   └── prisma.ts                   # Prisma client singleton
│   ├── prisma/
│   │   ├── migrations/                 # Database migrations
│   │   ├── schema.prisma               # Prisma data models (User, Ticket, Comment, Note)
│   │   └── seed.ts                     # Idempotent database seeder
│   ├── tests/                          # Server integration test suites
│   │   ├── lab-01/
│   │   ├── lab-02/
│   │   └── lab-03/
│   ├── uploads/                        # Uploaded file attachments (git-ignored)
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── e2e/                                # Playwright End-to-End test suites
│   ├── lab-02/
│   └── lab-03/
│       ├── authentication.spec.ts      # E2E-01 & E2E-02
│       ├── staff-ticket-flow.spec.ts   # E2E-03
│       ├── user-administration.spec.ts # E2E-04
│       └── capture-screenshots.spec.ts # Automated responsive evidence capture
├── artifacts/                          # Visual evidence artifacts
│   ├── lab-02/
│   └── lab-03/screenshots/            # 24 responsive screenshots
│       ├── authentication/             # Desktop, Tablet, Mobile login/pw-change
│       ├── staff-queue/                # Desktop, Tablet, Mobile ticket queues
│       ├── staff-ticket-detail/        # Comments & Amber Internal Notes
│       └── user-management/            # Table, Create Modal, Safety Warning
├── docs/                               # Engineering documentation & specifications
│   ├── lab-01/
│   ├── lab-02/
│   └── lab-03/
│       ├── specification.md            # Requirements & Business Rules (BR-01..24)
│       ├── tests.md                    # Master test traceability matrix (39/39 Passed)
│       ├── ui-spec.md                  # UI design tokens & responsive specifications
│       ├── api-spec.md                 # REST API endpoints contract
│       ├── reviewer.md                 # Peer code review log (PRs #39 through #47)
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
| `npm run test:e2e` | Run Playwright E2E tests for Lab 3 (`e2e/lab-03/`) |
| `npm run test:e2e:lab3` | Run Playwright E2E tests for Lab 3 (`e2e/lab-03/`) |
| `npm run test:e2e:lab2` | Run Playwright E2E tests for Lab 2 (`e2e/lab-02/`) |
| `npm run test:e2e:all` | Run all Playwright E2E tests (`e2e/`) |

### Client Directory (`client/`)

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Vite frontend dev server at `http://localhost:5173` |
| `npm run build` | Type-check with TypeScript and build production bundle to `client/dist/` |
| `npm run preview` | Locally preview the compiled production build |
| `npm test` | Run client unit & component tests using Vitest (80 tests) |

### Server Directory (`server/`)

| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Express backend dev server with hot-reload (`tsx watch`) on `:3000` |
| `npm run build` | Compile TypeScript backend to JavaScript in `server/dist/` |
| `npm start` | Run compiled production backend (`node dist/index.js`) |
| `npm run prisma:migrate` | Run Prisma schema migrations (`prisma migrate dev`) |
| `npm run prisma:seed` | Seed database with initial categories, systems, users, and tickets |
| `npm test` | Run server unit and API integration tests using Vitest (155 tests) |

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
