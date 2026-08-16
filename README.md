# TokTickIT (ตอกติ๊กกิต) — Full-Stack IT Service Desk

TokTickIT is an IT service desk web application for Account & Access, Hardware, Software, and Network requests built with React, Express, Prisma ORM, and PostgreSQL.

## Project Structure

```
toktickit/
├── client/          # React + TypeScript + Vite + Bootstrap UI
├── server/          # Node.js + Express + Prisma + Vitest backend
├── docs/            # Lab documentation and peer review records
└── README.md
```

## Prerequisites

- Node.js (v18+)
- PostgreSQL server (running on localhost:5433 or as configured in `server/.env`)

## Setup & Running Instructions

### 1. Backend Setup (`server/`)

```bash
cd server
npm install
npm run prisma:migrate
npm run prisma:seed
npm run dev
```

The backend server runs on `http://localhost:3000`.

### 2. Frontend Setup (`client/`)

```bash
cd client
npm install
npm run dev
```

The Vite frontend runs on `http://localhost:5173`.

## Automated Testing

- **Backend tests**: `cd server && npm run test`
- **Frontend tests**: `cd client && npm run test`