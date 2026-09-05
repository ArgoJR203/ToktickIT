# TokTickIT

KMUTT CPE334 Full-Stack IT Service Desk Project

## Tech Stack

| Layer    | Technology                                                |
| -------- | --------------------------------------------------------- |
| Frontend | React 18 · TypeScript · Vite · Bootstrap 5 · Lucide Icons |
| Backend  | Node.js · Express 4 · TypeScript · Multer                 |
| Database | PostgreSQL · Prisma ORM                                   |
| Testing  | Vitest · Supertest · React Testing Library · Playwright   |

---

## Prerequisites

- [Node.js](https://nodejs.org/) v18+ (LTS recommended)
- [PostgreSQL](https://www.postgresql.org/) 14+ running locally (or via Docker)
- npm (comes with Node.js)

---

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ArgoJR203/TokTickIT.git
cd TokTickIT
```

### 2. Install dependencies

```bash
# Install root dependencies (Playwright E2E testing)
npm install

# Install client dependencies
cd client
npm install

# Install server dependencies
cd ../server
npm install

# Back to root directory
cd ..
```

### 3. Configure environment variables

Copy the example env files and fill in your values:

**macOS / Linux:**

```bash
# Server — set your PostgreSQL connection string
cp server/.env.example server/.env

# Client — set the API URL (defaults to http://localhost:3000)
cp client/.env.example client/.env
```

**Windows (PowerShell):**

```powershell
# Server — set your PostgreSQL connection string
Copy-Item server\.env.example server\.env

# Client — set the API URL (defaults to http://localhost:3000)
Copy-Item client\.env.example client\.env
```

> **Note:** Never commit real `.env` files — only `.env.example` is tracked in git.
> Edit `server/.env` with your actual PostgreSQL credentials:

```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<dbname>?schema=public"
PORT=3000
```

### 4. Set up the database

```bash
cd server

# Run Prisma migrations to initialize the schema
npx prisma migrate dev

# Seed reference data (Categories, Related Systems, Requesters)
npm run prisma:seed

cd ..
```

### 5. Start the development servers

```bash
# Terminal 1 — Start the backend server (http://localhost:3000)
cd server
npm run dev

# Terminal 2 — Start the frontend client (http://localhost:5173)
cd client
npm run dev
```

### 6. Run tests

```bash
# Server tests (39 tests: Vitest + Supertest)
cd server
npm test

# Client tests (29 tests: Vitest + React Testing Library)
cd client
npm test

# End-to-End tests (3 tests: Playwright) - from root directory
cd ..
npm run test:e2e
```

---

## Project Structure

```
TokTickIT/
├── client/                             # React + Vite frontend
│   ├── src/
│   │   ├── components/                 # UI components
│   │   │   ├── AttachmentSection.tsx   # Attachment upload, download, and soft-delete
│   │   │   ├── CreateTicket.tsx        # Ticket creation form with validation
│   │   │   ├── Header.tsx              # Responsive navigation & requester switcher
│   │   │   ├── MyTickets.tsx           # Requester ticket dashboard (table/card views)
│   │   │   ├── RequesterSelector.tsx   # Dev persona switcher modal
│   │   │   └── RequesterTicketDetail.tsx # Ticket metadata and detail view
│   │   ├── context/
│   │   │   └── RequesterContext.tsx    # Global active requester context & localStorage
│   │   ├── App.tsx                     # Main view router and shell
│   │   ├── api.ts                      # REST API client
│   │   ├── index.css                   # Zen Green design system & responsive styling
│   │   └── main.tsx                    # React entrypoint
│   ├── tests/                          # Client component test suites
│   │   ├── lab-01/
│   │   └── lab-02/
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                             # Express + Prisma backend
│   ├── src/
│   │   ├── middleware/
│   │   │   └── upload.ts               # Multer attachment handler & file validation
│   │   ├── utils/
│   │   │   ├── attachmentValidator.ts  # File size and MIME type validator
│   │   │   └── ticketGenerator.ts      # TKT-YYYY-XXXXXX identifier generator
│   │   ├── app.ts                      # Express app (API routes, error handlers)
│   │   ├── index.ts                    # Server listener entrypoint
│   │   └── prisma.ts                   # Prisma client singleton
│   ├── prisma/
│   │   ├── migrations/                 # Schema migration history
│   │   ├── schema.prisma               # Prisma data models & enums
│   │   └── seed.ts                     # Database seeder
│   ├── tests/                          # Server integration test suites
│   │   ├── lab-01/
│   │   └── lab-02/
│   ├── uploads/                        # Uploaded attachment storage (git-ignored)
│   ├── .env.example
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── e2e/                                # Playwright End-to-End test suites
│   └── lab-02/
│       ├── requester-ticket-flow.spec.ts # End-to-end user journeys (E2E-01..03)
│       └── capture-screenshots.spec.ts   # Automated responsive screenshot capture
├── artifacts/                          # Visual evidence artifacts
│   └── lab-02/screenshots/
│       ├── create-ticket/              # Desktop, Tablet, Mobile screenshots
│       ├── my-tickets/                 # Desktop, Tablet, Mobile screenshots
│       └── ticket-detail/              # Desktop, Tablet, Mobile screenshots
├── docs/                               # Lab documentation & specifications
│   ├── lab-01/
│   └── lab-02/
│       ├── specification.md            # Functional & non-functional requirements
│       ├── tests.md                    # Master test traceability matrix
│       ├── ui-spec.md                  # UI design tokens & specifications
│       ├── api-spec.md                 # REST API endpoints contract
│       ├── reviewer.md                 # Peer code review log
│       └── ai-use.md                   # AI usage reflections & prompts
├── playwright.config.ts                # Playwright root configuration
├── package.json                        # Root package.json (E2E test scripts)
├── .gitignore
└── README.md
```

---

## Available Scripts

### Root (`./`)

| Script             | Command                       | Description                     |
| ------------------ | ----------------------------- | ------------------------------- |
| `npm run test:e2e` | `playwright test e2e/lab-02/` | Run Playwright End-to-End tests |

### Client (`client/`)

| Script          | Command             | Description                              |
| --------------- | ------------------- | ---------------------------------------- |
| `npm run dev`   | `vite`              | Start Vite dev server on `:5173`         |
| `npm run build` | `tsc && vite build` | Type-check and compile production bundle |
| `npm test`      | `vitest run`        | Run client component tests (Vitest)      |

### Server (`server/`)

| Script                   | Command                  | Description                              |
| ------------------------ | ------------------------ | ---------------------------------------- |
| `npm run dev`            | `tsx watch src/index.ts` | Start Express dev server with hot-reload |
| `npm run build`          | `tsc`                    | Compile TypeScript to JavaScript         |
| `npm start`              | `node dist/index.js`     | Run compiled production server           |
| `npm run prisma:migrate` | `prisma migrate dev`     | Run Prisma migrations                    |
| `npm run prisma:seed`    | `tsx prisma/seed.ts`     | Seed reference data into the database    |
| `npm test`               | `vitest run`             | Run server integration tests (Vitest)    |
