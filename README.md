# TokTickIT

IT Service Desk Application — CPE 334 Software Engineering Lab 4 (Sprint 4).

TokTickIT is a production-grade full-stack IT service desk application built for Requesters, IT Staff, and Administrators to create, process, manage, and audit IT support tickets, internal notes, attachments, action histories, operational dashboards, and system users. Lab 4 delivers advanced operational dashboards, Actions Taken workspace, formal Resolution Gate workflow controls, optimistic concurrency protection, backend idempotency, responsive visual design (Zen Green), and comprehensive automated regression suites.

---

## 1. Project Overview

TokTickIT provides an end-to-end IT service desk experience across three distinct system roles:

- **Authentication & Security (Lab 3 Foundation)**: JWT authentication (cookie/header `Bearer`), server-side token revocation blocklist (`/api/auth/logout`), real-time DB identity verification (`isActive = true`), and mandatory initial password change enforcement (`requiresPasswordChange`).
- **Role-Based Navigation & Landing (Lab 4)**: IT Staff and Administrators automatically land on the Operational Dashboard (`staff-dashboard`), while Requesters land on My Tickets / Requester Dashboard. Role badges and context are strictly verified.
- **IT Staff Dashboard (`/api/dashboards/staff`)**: Aggregate metrics (Unassigned Active, My Active Workload, Actions Recorded Today, Urgent Unresolved), quick action shortcuts, recent tickets, and drill-down links to filtered queue views.
- **Requester Dashboard (`/api/dashboards/requester`)**: Owned metric cards (My Open Tickets, Waiting for Response, In Progress, Recently Resolved in last 30 days), attention required queues, and drill-down navigation to My Tickets.
- **Actions Taken Workspace (`/api/tickets/:id/actions`)**: Structured operational activity recording. Staff record technical diagnosis, assignees, duration, status progression (`PENDING` → `IN_PROGRESS` → `COMPLETED` / `CANCELLED`), attachments, and conditional follow-up notes. Requesters have strict read-only inspection (`AC-04`).
- **Ticket Workflow & Resolution Gate (`/api/tickets/:id/status`)**: State machine transitions (`NEW` → `OPEN` → `IN_PROGRESS` ⇄ `WAITING_FOR_REQUESTER` → `RESOLVED` → `CLOSED` / `REOPENED`). Enforces Resolution Gate requiring >= 1 completed ActionTaken or a mandatory staff `resolutionNote`. Terminal status transition and action creation protection on `CANCELLED` tickets.
- **Concurrency & Race-Condition Protection**: Optimistic concurrency control via `expectedUpdatedAt` / atomic conditional updates (`WHERE id=:id AND updatedAt=:expectedUpdatedAt`) rejecting stale concurrent mutations with `409 Conflict`.
- **Backend Idempotency Protection**: Header-based `Idempotency-Key` deduplication on action mutations, caching identical `201 Created` responses and preventing double-submission on network retries.
- **Responsive Viewports & Accessibility**: Verified adaptation across Desktop (`1920×1080`), Tablet (`768×1024`), and Mobile (`375×812`) viewports without page-level horizontal overflow, visible focus rings (`2px solid #198754`), touch targets >= 44×44px, and non-color status/priority cues.

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

`prisma/seed.ts` is idempotent and seeds:
- 4 active Requesters, 1 inactive Requester
- 3 active IT Staff, 1 inactive IT Staff
- 2 active Administrators
- 4 Categories, 7 Related Systems
- 8 sample tickets across all statuses with attachments, public comments, internal notes
- Sample Actions Taken (0, 1, and multiple action scenarios across various statuses)
- Synchronizes `ticket_number_seq` dynamically to max ticket number suffix (`TEST-DB-SEQ-01`)

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

## 7. Automated Testing & Verification

Run the full regression test suites using the following commands:

### 1. Server Unit & API Integration Tests (Vitest + Supertest)
```bash
cd server
npm run prisma:seed
npm test
```

### 2. Client UI & Component Tests (Vitest + React Testing Library)
```bash
cd client
npm test
```

### 3. Playwright End-to-End (E2E) Regression Suites
```bash
npx playwright test
```

### 4. Production Build Verification
```bash
npm --prefix server run build
npm --prefix client run build
```

---

## 8. Final Test Evidence Summary (Lab 4 Increment)

| Suite / Level | Tooling | Test Files | Automated Tests Passed | Status |
|---|---|---|---|---|
| **Server API & Integration Suite** | Vitest + Supertest | `29 / 29` files | **282 / 282 PASS** | **100% PASS** |
| **Client UI Component Suite** | Vitest + RTL + jsdom | `17 / 17` files | **129 / 129 PASS** | **100% PASS** |
| **Playwright Full E2E Hardening Suite** | Playwright Chromium | `13 / 13` specs | **72 / 72 PASS** | **100% PASS** |
| **Production Build Suite** | TypeScript + Vite | `server + client` | **0 errors / built OK** | **100% PASS** |
| **Integrated Total** | — | **59 test files** | **483 / 483 PASS (100% GREEN)** | **100% PASS** |

### Lab 4 Evidence Deliverables Traceability

- **`EVD-REG-01..07`**: Sprint 4 Regression and Product Hardening suite (`artifacts/lab-04/screenshots/regression/`, `docs/lab-04/regression-evidence.md`, `docs/lab-04/EVD-REG-06.md`).
- **`EVD-QA-01..08`**: Sprint 4 Visual, Responsive, and Accessibility QA evidence suite (`artifacts/lab-04/screenshots/visual-qa/`, `EVD-QA-04.json`, `docs/lab-04/visual-qa.md`).
- **`EVD-E2E-01..07`**: Sprint 4 Final E2E Business Flows & Product Hardening evidence suite (Issue #82 / LAB4-11):
  - **`EVD-E2E-01`**: Full integrated terminal test run output of passing Playwright test suite (72 / 72 PASS) (`artifacts/lab-04/screenshots/e2e-hardening/EVD-E2E-01.txt`).
  - **`EVD-E2E-02`**: Full Action Taken lifecycle (`PENDING` $\to$ `IN_PROGRESS` $\to$ `COMPLETED`), assignee assignment, edit modal, and ticket state reflection (`artifacts/lab-04/screenshots/e2e-hardening/EVD-E2E-02.png`).
  - **`EVD-E2E-03`**: Ticket Resolution Gate valid resolution path #2 without resolution note precondition satisfied by completed action taken (`artifacts/lab-04/screenshots/e2e-hardening/EVD-E2E-03.png`, `.json`).
  - **`EVD-E2E-04`**: Operational Dashboards (IT Staff & Requester) calculated metrics, strict ownership isolation, queue/ticket drill-downs, and Admin access (`artifacts/lab-04/screenshots/e2e-hardening/EVD-E2E-04.png`, `.json`).
  - **`EVD-E2E-05`**: Concurrency conflict (`409 STALE_UPDATE`) safe error banner, form data preservation, and refresh recovery (`artifacts/lab-04/screenshots/e2e-hardening/EVD-E2E-05.png`, `.json`).
  - **`EVD-E2E-06`**: Reproducible hardening checklist and verification runbook (`docs/lab-04/EVD-E2E-06.md`).
  - **`EVD-E2E-07`**: Multi-viewport responsive business flows and accessibility audit (`artifacts/lab-04/screenshots/e2e-hardening/EVD-E2E-07.png`, `.json`).
