# FatApp

A simple personal weight tracker. Log your weight, visualise trends over time, and manage your history.

## Features

- **Dashboard** — area chart of your weight over a selectable period (week / month / 3 months / year / all time) with latest, average, and change stats
- **Quick add** — enter a weight and date directly from the dashboard
- **Manage entries** — paginated table with inline editing and deletion, accessible from the settings menu
- **Light & dark mode** — follows system preference by default, toggle in the settings menu
- **Persistent preferences** — selected period and theme are remembered in `localStorage`

## Stack

| Layer | Technology |
|---|---|
| API | Python · FastAPI · SQLAlchemy · SQLite |
| Frontend | TypeScript · React · Vite · Tailwind CSS · Recharts |
| Serving | nginx (reverse proxy + static files) |
| Runtime | Docker · Docker Compose |

## Running with Docker

```bash
docker compose up --build
```

The app will be available at **http://localhost**.

On subsequent starts (no code changes) you can skip the build:

```bash
docker compose up
```

To stop and remove containers (data is preserved in a named volume):

```bash
docker compose down
```

To also wipe all stored weight data:

```bash
docker compose down -v
```

## Local development

### API

Requires Python 3.11+.

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

API runs on **http://localhost:8000** · Interactive docs at **http://localhost:8000/docs**

The SQLite database is created automatically at `backend/fatapp.db` on first run.

### Frontend

Requires Node 20+.

```bash
cd frontend
npm ci
npm run dev
```

Frontend runs on **http://localhost:5173** and proxies `/api` requests to the backend.

### Tests & linting (backend)

```bash
cd backend
source .venv/bin/activate
pytest                  # tests + coverage
ruff check .            # linting
mypy app                # type checking
```
