# Operation Quicksilver Workshop

Self-hosted AI fluency exercise app with a Mission Impossible theme. Teams move through four mission phases, submit artifacts, receive handler feedback, and generate a personalized 5-act scenario outcome based on their work quality.

## What Is In This Repository

- `backend/`: Express + TypeScript API, mission loading, evaluation flow, scenario generation, Postgres data access, MinIO integration.
- `frontend/`: Vite + React single-page app for join, briefing, hub, phases, feedback, and scenario reveal.
- `missions/`: YAML mission spec and materials (including Gate 3 CSV).
- top-level mockup HTML files: design references for operations-console UI.
- `docker-compose.yml`: local stack orchestration (Postgres, MinIO, backend, frontend).

## Current Architecture

- Backend: Node 20, Express, Postgres, MinIO, LLM Mesh (internal AI endpoint).
- Frontend: React 18, React Router, CSS Modules.
- Data flow:
	- Team joins a cohort with join code + callsign.
	- Team submits each gate artifact.
	- Backend advances progression immediately and evaluates asynchronously.
	- After all four gate evaluations complete, scenario generation runs asynchronously.

## Quick Start (Docker Compose)

### 1. Configure environment

```bash
cp .env.example .env
```

Set at least these values in `.env`:

- `LLM_MESH_API_KEY`: required for AI evaluation and scenario generation.
- `ADMIN_TOKEN`: required for admin endpoints.

### 2. Build and start services

```bash
docker compose up --build -d
```

### 3. (Optional) Seed a known cohort join code

The backend now applies the DB schema automatically on startup.

Optional: seed a known cohort join code (`QUICKSILVER`):

```bash
docker compose exec app npm run seed
```

### 4. Open apps

- Frontend: http://localhost:5173
- Backend health: http://localhost:3001/health
- MinIO console: http://localhost:9001

## Local Development (Without Full Compose)

Use this when you want faster backend/frontend iteration but still run Postgres and MinIO in containers.

### 1. Start infra only

```bash
docker compose up -d postgres minio
```

### 2. Configure root `.env`

```bash
cp .env.example .env
```

Add these values if not already present:

```env
DATABASE_URL=postgresql://quicksilver:quicksilver_dev@localhost:5432/quicksilver
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin_dev
MINIO_BUCKET=quicksilver
MISSIONS_PATH=./missions
PORT=3001
```

### 3. Run backend

```bash
cd backend
npm ci
npm run migrate
npm run seed
npm run dev
```

### 4. Run frontend

In a second shell:

```bash
cd frontend
npm ci
npm run dev
```

Frontend runs on http://localhost:5173 and proxies `/api` to `http://localhost:3001`.

## Environment Variables

Defined in `.env.example` (top level):

- `LLM_MESH_BASE_URL`: LLM Mesh endpoint base URL (default: `https://analytics-qa.iriworldwide.com/llmadmin/api`).
- `LLM_MESH_API_KEY`: Bearer token for the LLM Mesh API.
- `LLM_MESH_MODEL`: model name passed to the Mesh API (default: `gpt-4o`).
- `ADMIN_TOKEN`: bearer token used by admin endpoints.
- `POSTGRES_PASSWORD`: used by Postgres service in compose.
- `MINIO_ROOT_USER`: MinIO root user.
- `MINIO_ROOT_PASSWORD`: MinIO root password.
- `PORT`: backend port (default `3001`).
- `NODE_ENV`: runtime mode (`development` by default).

Backend also reads:

- `DATABASE_URL`
- `MISSIONS_PATH`
- `MINIO_ENDPOINT`
- `MINIO_PORT`
- `MINIO_USE_SSL`
- `MINIO_ACCESS_KEY`
- `MINIO_SECRET_KEY`
- `MINIO_BUCKET`
- `CORS_ORIGIN` (optional)

## API Overview

Base URL: `/api`

### Public

- `POST /cohorts/:joinCode/join`: create a team session in a cohort.

### Team-authenticated (Bearer session token)

- `GET /teams/me/state`: current team progression and submission summaries.
- `GET /gates/:gateNumber`: gate briefing, instructions, artifact schema.
- `POST /gates/:gateNumber/submit`: submit artifact and start async evaluation.
- `GET /gates/:gateNumber/evaluation`: poll evaluation status + feedback.
- `GET /assets/gate3-intercept`: pre-signed download URL for Gate 3 CSV.
- `POST /scenario/generate`: trigger async scenario generation.
- `GET /scenario`: poll scenario status and acts.

### Admin-authenticated (Bearer `ADMIN_TOKEN`)

- `POST /admin/cohorts`: create a cohort with generated join code.
- `GET /admin/cohorts`: list cohorts.
- `GET /admin/cohorts/:cohortId`: cohort details, teams, and submissions.

## Typical Flow

1. Facilitator creates cohort (`/api/admin/cohorts`) or use seeded `QUICKSILVER` code.
2. Team joins via join code and callsign.
3. Team works through gate 1-4 and submits artifacts.
4. Frontend polls evaluation endpoints until each gate is complete.
5. Team triggers scenario generation and polls scenario endpoint.

## Useful Commands

From `backend/`:

```bash
npm run dev      # start API in watch mode
npm run build    # compile TypeScript
npm run start    # run compiled server
npm run migrate  # apply schema.sql
npm run seed     # apply schema and seed QUICKSILVER cohort
```

From `frontend/`:

```bash
npm run dev      # start Vite dev server
npm run build    # build frontend bundle
npm run preview  # preview production build
```

## Project Status

- Core flow is implemented end-to-end for join, gate submissions, async evaluation, and scenario generation.
- Mission spec is loaded from `missions/monaco-syndicate.yaml` at backend startup.
- Gate 3 CSV is uploaded to MinIO at startup when available.
- UI follows mockup-driven operations-console styling from top-level HTML reference files.

## Troubleshooting

- `Mission spec not found`: verify `MISSIONS_PATH` points to a directory containing `monaco-syndicate.yaml`.
- DB connection errors: confirm Postgres is running and `DATABASE_URL` is correct.
- MinIO material download issues: check MinIO credentials and bucket/object permissions.
- Evaluation/scenario stuck in error: verify `LLM_MESH_API_KEY` is set and valid (Bearer token from LLM-Admin API Secrets).
- `401 Unauthorized` from AI calls: the Bearer key is missing, expired, or incorrect — check `LLM_MESH_API_KEY`.
- `401 Unauthorized` on protected routes: ensure `Authorization: Bearer <session_token>` header is sent.
