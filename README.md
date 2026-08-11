# Agent Management Portal (AMP)

Compliance-first system for a single Australian college to recruit, verify, onboard, and monitor its education agents. See [`AMP-Solution-PRD.md`](./AMP-Solution-PRD.md) for the product spec and [`Agent Management Portal.dc.html`](./Agent%20Management%20Portal.dc.html) for the original clickable prototype.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Backend | Express + TypeScript |
| Database | PostgreSQL (via Prisma ORM) |
| Shared | `@amp/shared` — domain types & enums used by both sides |

Monorepo via **npm workspaces**: `frontend/`, `backend/`, `shared/`.

## Prerequisites

- Node.js ≥ 20
- Docker (for local Postgres) — or any Postgres you point `DATABASE_URL` at.

## First-time setup

```bash
# 1. Install all workspace dependencies (from the repo root)
npm install

# 2. Start Postgres
npm run db:up                      # docker compose up -d

# 3. Configure the backend env
cp backend/.env.example backend/.env

# 4. Create the database schema + generate the Prisma client
npm run db:migrate                 # prisma migrate dev
npm run db:seed                    # loads sample agents

# 5. Run both apps
npm run dev                        # backend :4000, frontend :5173
```

Open **http://localhost:5173**. The Vite dev server proxies `/api/*` to the Express backend on `:4000`.

## Layout

```
shared/    @amp/shared    Domain types + enums (single source of truth). Consumed as source.
backend/   @amp/backend   Express API. Feature modules live in src/modules/<feature>/.
  prisma/schema.prisma    Database schema = PRD §13 data model.
frontend/  @amp/frontend  React app. Feature UIs live in src/features/<feature>/.
```

### Backend module pattern

Each feature is a folder under `src/modules/` with three files: `*.routes.ts` (HTTP wiring) → `*.controller.ts` (validation + request/response) → `*.service.ts` (business logic + DB). The `agents` module is the reference implementation; the stubbed PRD modules (collateral, compliance, reports) follow the same shape and mount in `src/routes.ts`.

### Frontend feature pattern

Each feature is a folder under `src/features/` owning its pages/components. API calls go through `src/lib/api.ts`. `applications/` and `dashboard/` are the reference implementations.

## Notes

- `@amp/shared` is consumed as TypeScript **source** (no build step) — this works for Vite and the `tsx` dev runner. For a production Node build (`npm run build` + `npm start` on the backend), `shared` should be compiled first; that packaging step is a Phase-1 follow-up.
- To swap Prisma for Drizzle later, the change is isolated to `backend/` (`schema.prisma`, `src/db.ts`, and the services).
