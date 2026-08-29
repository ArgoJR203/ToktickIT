# TokTickIT

KMUTT CPE334 Full-Stack IT Service Desk Project

## Tech Stack

| Layer    | Technology                                 |
| -------- | ------------------------------------------ |
| Frontend | React 18 · TypeScript · Vite · Bootstrap 5 |
| Backend  | Node.js · Express 4 · TypeScript           |
| Database | PostgreSQL · Prisma ORM                    |
| Testing  | Vitest · Supertest · Testing Library       |

## Prerequisites

- [Node.js](https://nodejs.org/) v18+ (LTS recommended)
- [PostgreSQL](https://www.postgresql.org/) 14+ running locally (or via Docker)
- npm (comes with Node.js)

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/ArgoJR203/TokTickIT.git
cd TokTickIT
```

### 2. Install dependencies

```bash
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

macOS / Linux:

```bash
# Server — set your PostgreSQL connection string
cp server/.env.example server/.env

# Client — set the API URL (defaults to http://localhost:3000)
cp client/.env.example client/.env
```

Windows (PowerShell or cmd):

```bash
# Server — set your PostgreSQL connection string
copy server\.env.example server\.env

# Client — set the API URL (defaults to http://localhost:3000)
copy client\.env.example client\.env
```

Never commit your real .env files — only .env.example is tracked in git.
Edit `server/.env` with your actual PostgreSQL credentials (Select your own username password and database):

```env
DATABASE_URL="postgresql://<user>:<password>@localhost:5432/<dbname>?schema=public"
PORT=3000
```

### 4. Set up the database

```bash
cd server

# Create the database migration (after defining models in schema.prisma)
npx prisma migrate dev --name init

# Seed the database
npm run prisma:seed
```

### 5. Start the development servers

```bash
# Terminal 1 — Start the backend (http://localhost:3000)
cd server
npm run dev

# Terminal 2 — Start the frontend (http://localhost:5173)
cd client
npm run dev
```

### 6. Run tests

```bash
# Server tests (Vitest + Supertest)
cd server
npm test

# Client tests (Vitest + Testing Library)
cd client
npm test
```

## Project Structure

```
TokTickIT/
├── client/                 # React + Vite frontend
│   ├── src/
│   │   ├── App.tsx         # Main application component
│   │   ├── api.ts          # API client layer
│   │   └── main.tsx        # React entrypoint
│   ├── tests/              # Client tests (Vitest + Testing Library)
│   ├── .env.example        # Client env template
│   ├── package.json
│   ├── tsconfig.json
│   └── vite.config.ts
├── server/                 # Express + Prisma backend
│   ├── src/
│   │   ├── app.ts          # Express app (routes, middleware)
│   │   ├── index.ts        # Server entrypoint (listen)
│   │   └── prisma.ts       # Prisma client singleton
│   ├── prisma/
│   │   ├── schema.prisma   # Database schema
│   │   └── seed.ts         # Database seed script
│   ├── tests/              # Server tests (Vitest + Supertest)
│   ├── .env.example        # Server env template
│   ├── package.json
│   ├── tsconfig.json
│   └── vitest.config.ts
├── docs/                   # Lab documentation
│   ├── lab-01/
│   └── lab-02/
├── .gitignore
└── README.md
```

## Available Scripts

### Client (`client/`)

| Script          | Command             | Description                         |
| --------------- | ------------------- | ----------------------------------- |
| `npm run dev`   | `vite`              | Start Vite dev server on :5173      |
| `npm run build` | `tsc && vite build` | Type-check and build for production |
| `npm test`      | `vitest run`        | Run client tests                    |

### Server (`server/`)

| Script                   | Command                  | Description                   |
| ------------------------ | ------------------------ | ----------------------------- |
| `npm run dev`            | `tsx watch src/index.ts` | Start Express with hot-reload |
| `npm run build`          | `tsc`                    | Compile TypeScript            |
| `npm start`              | `node dist/index.js`     | Run compiled production build |
| `npm run prisma:migrate` | `prisma migrate dev`     | Run Prisma migrations         |
| `npm run prisma:seed`    | `tsx prisma/seed.ts`     | Seed the database             |
| `npm test`               | `vitest run`             | Run server tests              |
