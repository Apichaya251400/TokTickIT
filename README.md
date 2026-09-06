# TokTickIT

IT Service Desk Application — CPE 334 Software Engineering Lab 2 Sprint.

TokTickIT is a full-stack IT service desk application designed for Requesters to create, track, and manage IT support tickets and supporting attachments. Lab 2 delivers the full Requester MVP workflow following a Spec-Driven Development (SDD) architecture and Zen Green UI theme.

---

## 1. Project Overview

In Lab 2, TokTickIT provides a complete end-to-end Requester workflow:
- **Development Requester Selection**: Simulates user identity for testing context using the `X-Requester-Id` HTTP header prior to authentication integration in Lab 3.
- **Create Ticket Workflow**: Form capturing Category, Related System, Requested Priority (`LOW`, `MEDIUM`, `HIGH`, `URGENT`), Summary, Description, and attachment uploads (`JPG`, `JPEG`, `PNG`, `WEBP`, `PDF` up to 5 MB). Automatically generates official Ticket Numbers (`TKT-YYYY-XXXXXX`).
- **My Tickets Workflow**: Personal ticket list with real-time Search, Filters (Category, Related System, Priority, Status), Severity/Date Sorting, and Pagination.
- **Ticket Detail View**: Read-only ticket details and attachment lifecycle management (`Download` and `Soft Remove` with mandatory removal reason).
- **Backend Ownership Isolation**: Strict requester-scoped database queries returning `404 Not Found` for non-owned tickets or attachments.

---

## 2. Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Bootstrap 5
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (v16 / Docker container `tok-postgres`)
- **ORM**: Prisma ORM v5
- **Testing Tools**:
  - **Unit & Integration / API**: Vitest + Supertest
  - **UI Component**: Vitest + React Testing Library (RTL) + jsdom
  - **End-to-End (E2E)**: Playwright (Desktop 1280x800 & Mobile 375x667)

---

## 3. Prerequisites

- **Node.js**: v20+
- **PostgreSQL**: Server running on `localhost:5432` (or port `5433` via Docker container)
- **Docker Desktop**: (Optional, for running PostgreSQL container)

---

## 4. Project Setup

Clone the repository and install dependencies for both `server` and `client`:

```bash
git clone https://github.com/Apichaya251400/TokTickIT.git
cd TokTickIT

# Install Backend Server dependencies
cd server
npm install

# Install Frontend Client dependencies
cd ../client
npm install
```

---

## 5. Database Setup

### 1. Database Instance (Local PostgreSQL or Docker)
If using Docker to run PostgreSQL locally on port 5432:

```bash
docker run --name tok-postgres -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5432:5432 -d postgres:16-alpine
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the `server/` directory:

```bash
cd server
cp .env.example .env
```

Verify `DATABASE_URL` inside `server/.env` (default: `postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public` or port `5433` if using Docker container `tok-postgres`).

### 3. Run Database Migrations and Seed Data
Apply Prisma schema migrations and seed reference data:

```bash
npm run prisma:migrate
npm run prisma:seed
```

*(Or run `npx prisma migrate dev` and `npx prisma db seed` directly)*

`prisma/seed.ts` is idempotent and seeds 4 active Development Requesters (Alice Smith, Bob Jones, Charlie Brown, Diana Prince), 1 inactive Development Requester (Eve Adams), 4 Categories, and 7 Related Systems.

---

## 6. Running the Application

Start the backend API and frontend client in two separate terminal windows:

### Terminal 1: Backend Server (Port 3000)
```bash
cd server
npm run dev
```

### Terminal 2: Frontend Client (Port 5173)
```bash
cd client
npm run dev
```

Open `http://localhost:5173` in your web browser.

> **Development Mode — Testing Context Only**:
> Upon opening the application, select an active Development Requester (e.g., Alice Smith). This stores `selectedRequesterId` in LocalStorage and attaches the `X-Requester-Id` HTTP header to all protected API requests. This selector is strictly for development and testing context (`BR-27`) and does not represent production user authentication.

---

## 7. Testing

Run the automated test suites using the following commands:

### Server Unit & API Integration Tests (Vitest + Supertest)
```bash
cd server
npm test
```

### Client UI & Component Tests (Vitest + React Testing Library)
```bash
cd client
npm test
```

### End-to-End (E2E) Browser Tests (Playwright)
```bash
npx playwright test --config=playwright.config.ts
```

---

## 8. Lab 2 Test Evidence Summary

| Suite / Level | Tooling | Test Files | Automated Tests Passed | Status |
|---|---|---|---|---|
| **Server Lab 2 API** | Vitest + Supertest | `5 / 5` files | **58 / 58 PASS** (71/71 total server tests) | **PASS** |
| **Client Lab 2 UI** | Vitest + RTL + jsdom | `3 / 3` files | **55 / 55 PASS** (58/58 total client tests) | **PASS** |
| **E2E Workflows** | Playwright | `1 / 1` spec | **2 / 2 PASS** (Desktop & Mobile viewports) | **PASS** |
| **Lab 2 Automated Total** | — | **9 / 9 files** | **115 / 115 PASS (100%)** | **PASS** |
| **Broader Repo Total** | — | `16 / 16` files | **131 / 131 PASS** *(Includes 16 Lab 1 baseline tests)* | **PASS** |

---

## 9. Lab 2 Documentation Links

- [`docs/lab-02/specification.md`](docs/lab-02/specification.md) — Canonical Sprint Engineering Specification (AC-01..20, BR-01..27)
- [`docs/lab-02/api-spec.md`](docs/lab-02/api-spec.md) — REST API Specification & HTTP Status Contracts
- [`docs/lab-02/ui-spec.md`](docs/lab-02/ui-spec.md) — Zen Green UI Specification & Inspection Checklist
- [`docs/lab-02/tests.md`](docs/lab-02/tests.md) — Test Strategy, Inventory & Acceptance Traceability Matrix
- [`docs/lab-02/ai-use.md`](docs/lab-02/ai-use.md) — AI Tool Usage, Representative Prompts & Reflection
- [`docs/lab-02/reviewer.md`](docs/lab-02/reviewer.md) — Peer Review Record & Approval Evidence

---

## 10. Project Structure

```text
TokTickIT/
├── client/                      # React + TypeScript + Vite + Bootstrap Frontend
│   ├── src/                     # App.tsx, main.tsx, api.ts
│   └── tests/
│       ├── lab-01/              # UI-01.heading, UI-02.loading, UI-03.error
│       └── lab-02/              # RequesterSelection, CreateTicket, MyTicketsAndDetail
├── server/                      # Express + TypeScript + Prisma Backend
│   ├── prisma/                  # schema.prisma, migrations/, seed.ts
│   ├── src/                     # app.ts, index.ts, prisma.ts, routes/, middleware/, utils/
│   ├── uploads/                 # Uploaded attachment storage directory
│   └── tests/
│       ├── unit/                # ticketNumber.test.ts, validation.test.ts
│       ├── lab-01/              # API-01.health, API-02.categories
│       └── lab-02/              # reference-data, create-ticket, my-tickets, ticket-detail, attachments
├── e2e/                         # Playwright End-to-End Tests
│   └── lab-02/                  # requester-ticket-flow.spec.ts
├── docs/
│   ├── lab-01/                  # Lab 1 baseline documentation
│   └── lab-02/                  # specification.md, api-spec.md, ui-spec.md, tests.md, ai-use.md, reviewer.md
├── playwright.config.ts         # Playwright test runner configuration
└── README.md                    # Project documentation
```

---

## 11. Scope & Development Notes

- **Development Requester Context**: User context is set via `selectedRequesterId` in LocalStorage and attached to HTTP requests as `X-Requester-Id`. This selector is strictly a testing context (`BR-27`) and does not represent user authentication.
- **Excluded Functionality**: Real password authentication, JWT tokens, sessions, IT Staff ticket management (claiming/reassigning/resolving), comments/notes, virus scanning, rate limiting, and CSRF protection are explicitly out of scope for Lab 2 and deferred to future labs.