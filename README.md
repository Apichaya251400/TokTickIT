# TokTickIT

IT Service Desk Application — CPE 334 Software Engineering Lab 3 (Sprint 3).

TokTickIT is a full-stack IT service desk application built for Requesters, IT Staff, and Administrators to create, process, manage, and audit IT support tickets, internal notes, attachments, and system users. Lab 3 delivers a role-based multi-user architecture with JWT authentication, operational controls, safety guards, responsive visual design (Zen Green), and automated test suites.

---

## 1. Project Overview

Lab 3 expands TokTickIT into a production-grade multi-role IT service desk:
- **Authentication & Security**: JWT authentication (cookie/header `Bearer`), server-side token revocation blocklist (`/api/auth/logout`), real-time DB identity verification (`isActive = true`), and mandatory initial password change enforcement (`requiresPasswordChange`).
- **Role-Based Navigation & Shell**: Role-specific navigation header and profile badge (`REQUESTER`, `IT_STAFF`, `ADMINISTRATOR`), with complete removal of the legacy Development Requester Selector.
- **IT Staff Ticket Queue (`/staff/queue`)**: Filterable and sortable queue supporting full-text search, status filters (`NEW`, `OPEN`, `IN_PROGRESS`, `WAITING_FOR_REQUESTER`, `RESOLVED`, `CLOSED`, `REOPENED`, `CANCELLED`), priority filters, ownership tabs (`All`, `My Queue`, `Unassigned`), sorting, and pagination.
- **IT Staff Operational Controls & Details (`/staff/tickets/:id`)**: Grouped problem information, ticket claim/reassignment dropdowns, status transition matrix enforcement, and requester signal banners (`requesterResolvedIndicatedAt`, `requesterReopenRequestedAt`).
- **Communication & Isolation**: Public Comments (green border) vs Internal Notes (amber private warning style, hidden from Requesters). Strict resource ownership isolation for Requesters and read-only ticket detail access for Administrators.
- **Administrator User Management (`/admin/users`)**: Full User CRUD table, search/filter bar, modal dialogs for create/edit/reset initial password, self-deactivation blocking guard, and atomic Last Active Administrator protection.
- **Responsive Design & Visual QA**: Verified layout consistency across Desktop (`1920x1080`), Tablet (`768x1024`), and Mobile (`375x812`) viewports without horizontal overflow, supported by 21 screenshot artifacts.

---

## 2. Tech Stack

- **Frontend**: React 18 + TypeScript + Vite + Bootstrap 5
- **Backend**: Node.js + Express + TypeScript
- **Database**: PostgreSQL (v16 / Docker container `tok-postgres`) / SQLite (development/test fallback)
- **ORM**: Prisma ORM v5
- **Testing Tools**:
  - **Unit & Integration / API**: Vitest + Supertest
  - **UI Component**: Vitest + React Testing Library (RTL) + jsdom
  - **End-to-End (E2E) & Visual QA**: Playwright Chrome (Desktop 1920x1080, Tablet 768x1024, Mobile 375x812)

---

## 3. Prerequisites

- **Node.js**: v20+
- **PostgreSQL**: Server running on `localhost:5432` (or port `5433` via Docker container `tok-postgres`)
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
If using Docker to run PostgreSQL locally:

```bash
docker run --name tok-postgres -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5432:5432 -d postgres:16-alpine
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env` in the `server/` directory:

```bash
cd server
cp .env.example .env
```

Verify `DATABASE_URL` inside `server/.env` (default: `postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public`).

### 3. Run Pure SQL Migrations and Idempotent Seed Data
Apply database schema migrations and seed initial system data:

```bash
npm run prisma:migrate
npm run prisma:seed
```

`prisma/seed.ts` is idempotent and seeds 4 active Requesters, 1 inactive Requester, 3 active IT Staff, 1 inactive IT Staff, 2 active Administrators, 4 Categories, 7 Related Systems, 8 sample tickets across all statuses, attachments, public comments, and internal notes.

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

---

## 7. Testing & Verification

Run the automated test suites using the following commands:

### Server Unit & API Integration Tests (Vitest + Supertest)
```bash
cd server
npm run prisma:seed
npx vitest run --fileParallelism=false
```

### Client UI & Component Tests (Vitest + React Testing Library)
```bash
cd client
npm test
```

### Playwright End-to-End (E2E) Browser Tests
```bash
$env:NODE_PATH="server/node_modules" ; npx playwright test
```

### Playwright Visual QA Screenshot Capture Suite
```bash
$env:NODE_PATH="server/node_modules" ; npx playwright test scratch/capture_screenshots.spec.ts
```

---

## 8. Lab 3 Test Evidence Summary

| Suite / Level | Tooling | Test Files | Automated Tests Passed | Status |
|---|---|---|---|---|
| **Server API & Unit Suite** | Vitest + Supertest | `20 / 20` files | **177 / 177 PASS** | **PASS** |
| **Client UI & Component Suite** | Vitest + RTL + jsdom | `13 / 13` files | **85 / 85 PASS** | **PASS** |
| **Playwright Lab 3 E2E Suite** | Playwright | `4 / 4` specs | **13 / 13 PASS** | **PASS** |
| **Playwright Visual QA Suite** | Playwright | `1 / 1` spec | **15 / 15 PASS** *(21/21 screenshots generated)* | **PASS** |
| **Lab 3 Automated Total** | — | **38 / 38 files** | **290 / 290 PASS (100%)** | **PASS** |

---

## 9. Lab 3 Documentation Links

- [`docs/lab-03/specification.md`](docs/lab-03/specification.md) — Canonical Sprint Engineering Specification (AC-01..25, BR-01..28)
- [`docs/lab-03/api-spec.md`](docs/lab-03/api-spec.md) — REST API Specification, Authorization Matrix & Status Transition Matrix
- [`docs/lab-03/ui-spec.md`](docs/lab-03/ui-spec.md) — Zen Green UI Specification, Screen Modes & Visual Inspection Checklist
- [`docs/lab-03/tests.md`](docs/lab-03/tests.md) — Test Strategy, Traceability Matrix & Test Suite Inventory
- [`docs/lab-03/ai-use.md`](docs/lab-03/ai-use.md) — AI Tool Usage, Representative Prompts & Reflection
- [`docs/lab-03/reviewer.md`](docs/lab-03/reviewer.md) — Peer Review Records, Approval Evidence & Repository Audit

---

## 10. Project Structure

```text
TokTickIT/
├── artifacts/
│   └── lab-03/screenshots/     # 21 PNG visual QA screenshot artifacts (3 viewports)
├── client/                      # React + TypeScript + Vite + Bootstrap Frontend
│   ├── src/                     # App.tsx, main.tsx, api.ts, components/, pages/
│   └── tests/                   # 13 client component & page test files (85 tests)
├── server/                      # Express + TypeScript + Prisma Backend
│   ├── prisma/                  # schema.prisma, migrations/, seed.ts
│   ├── src/                     # app.ts, index.ts, prisma.ts, routes/, middleware/, utils/
│   ├── uploads/                 # Uploaded attachment storage directory
│   └── tests/                   # 20 server unit & API test files (177 tests)
├── e2e/                         # Playwright End-to-End Tests
│   └── lab-03/                  # authentication, staff-ticket-flow, user-administration, lab2-regression
├── scratch/                     # Visual QA Playwright capture script (capture_screenshots.spec.ts)
├── docs/
│   ├── lab-01/                  # Lab 1 baseline documentation
│   ├── lab-02/                  # Lab 2 baseline documentation
│   └── lab-03/                  # specification.md, api-spec.md, ui-spec.md, tests.md, ai-use.md, reviewer.md
├── playwright.config.ts         # Playwright test runner configuration
└── README.md                    # Project documentation
```

---

## 11. Scope & Security Notes

- **JWT Authentication & Authorization**: Session state is managed via JWT tokens stored in HTTP-Only cookies or `Bearer` headers. Token revocation blocklist is enforced server-side.
- **Role Scoping & Safety Guards**: Strict server-side RBAC enforced across `REQUESTER`, `IT_STAFF`, and `ADMINISTRATOR` roles. Self-deactivation and Last Active Administrator protection guards operate atomically within database transactions.