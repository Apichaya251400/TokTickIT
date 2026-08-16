# TokTickIT

IT service desk application — CPE 334 individual sprints. Lab 1 is a full-stack vertical slice: React + TypeScript + Vite + Bootstrap → Express + TypeScript REST API → Prisma → PostgreSQL.

## Prerequisites

- Node.js 20+
- PostgreSQL server (running on `localhost:5432` or `localhost:5433` via Docker)
- Running Docker

## Setup

```bash
git clone https://github.com/Apichaya251400/TokTickIT.git
cd TokTickIT
```

### 1. Database

Create the database container:

```bash
docker run --name tok-postgres -e POSTGRES_USER=toktickit -e POSTGRES_PASSWORD=toktickit -e POSTGRES_DB=toktickit -p 5432:5432 -d postgres:16-alpine
```

### 2. Backend

```bash
cd server
npm install
cp .env.example .env
```

Edit `server/.env` and verify `DATABASE_URL` (default: `postgresql://toktickit:toktickit@localhost:5432/toktickit?schema=public`). `.env` is git-ignored — never commit real credentials.

Apply the schema migration and seed the request categories:

```bash
npm run prisma:migrate
npm run prisma:seed
```
*(Or run `npx prisma migrate dev` and `npx prisma db seed` directly)*

The seed is idempotent — running it again does not create duplicate categories.

### 3. Frontend

```bash
cd client
npm install
```

## Running

Two terminals:

```bash
cd server && npm run dev    # http://localhost:3000
```

```bash
cd client && npm run dev    # http://localhost:5173
```

Open `http://localhost:5173` and click **Check System**.

## Tests

```bash
cd server && npm test       # Supertest API tests  (tests/lab-01/)
cd client && npm test       # Vitest UI tests      (tests/lab-01/)
```

## API

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/health` | `{ "status": "ok", "service": "TokTickIT API" }` |
| GET | `/api/categories` | `[{ "id": 1, "name": "Account and Access" }, ...]` |

## Structure

```text
client/          React + TypeScript + Vite + Bootstrap
  src/           App.tsx, main.tsx, api.ts
  tests/lab-01/  UI-01.heading.test.tsx, UI-02.loading.test.tsx, UI-03.error.test.tsx
server/          Node.js + Express + TypeScript
  prisma/        schema.prisma, migrations/, seed.ts
  src/           app.ts (routes), index.ts (listener), prisma.ts
  tests/lab-01/  API-01.health.test.ts, API-02.categories.test.ts
docs/lab-01/     tests.md, reviewer.md, ai_use.md
```

## Documentation

- `docs/lab-01/tests.md` — test inventory
- `docs/lab-01/reviewer.md` — peer reviewer and reviewed PRs
- `docs/lab-01/ai_use.md` — AI agent use and reflection